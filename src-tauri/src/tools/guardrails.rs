use std::path::{Component, Path, PathBuf};

/// Denylist of sensitive file or directory names that should never be accessed or modified.
/// Matched against individual path segments to prevent credential leakage.
const SENSITIVE_SEGMENTS: &[&str] = &[
    // SSH / GPG / Cloud credentials
    ".ssh",
    ".gnupg",
    ".gpg",
    ".aws",
    ".azure",
    ".gcloud",
    ".kube",
    ".docker",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "id_dsa",
    // Environment & Secret files
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".envrc",
    "secrets.yml",
    "secrets.yaml",
    "credentials.json",
    // Package registries & Netrc
    ".npmrc",
    ".pypirc",
    ".netrc",
    ".git-credentials",
    // Shell history
    ".bash_history",
    ".zsh_history",
    ".psql_history",
    ".mysql_history",
];

const SENSITIVE_EXTENSIONS: &[&str] = &[
    ".pem",
    ".key",
    ".p12",
    ".pfx",
];

const SENSITIVE_PREFIXES: &[&str] = &[
    "/etc/shadow",
    "/etc/passwd",
    "/etc/sudoers",
    "/var/run/secrets",
    "c:/windows/system32",
];

/// Access intent for path validation: Read operations vs Write/Edit operations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Access {
    Read,
    Write,
}

/// Strips Windows verbatim prefix (`\\?\` or `\\?\UNC\`) for consistent path prefix comparison.
fn strip_verbatim_prefix(path: &Path) -> PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\UNC\") {
        PathBuf::from(format!(r"\\{}", stripped))
    } else if let Some(stripped) = s.strip_prefix(r"\\?\") {
        PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

/// Helper that checks whether a path string contains protected sensitive segments or extensions.
fn check_sensitive_segments(path_str: &str) -> Result<(), String> {
    let normalized = path_str.replace('\\', "/").to_lowercase();

    for segment in normalized.split('/') {
        let trimmed = segment.trim();
        if trimmed.is_empty() {
            continue;
        }

        // Public keys are non-secret public identifiers intended to be shared
        if trimmed.ends_with(".pub") {
            continue;
        }

        for ext in SENSITIVE_EXTENSIONS {
            if trimmed.ends_with(ext) {
                return Err(format!("Access denied: path contains protected private key extension '{}'", ext));
            }
        }

        // Catch .env, .env.*, .env_*, .env-*, .envrc, etc.
        if trimmed == ".env"
            || trimmed.starts_with(".env.")
            || trimmed.starts_with(".env_")
            || trimmed.starts_with(".env-")
            || trimmed == ".envrc"
            || trimmed.starts_with(".envrc.")
            || trimmed.starts_with(".envrc_")
            || trimmed.starts_with(".envrc-")
        {
            return Err(format!("Access denied: path contains protected credential component '{}'", trimmed));
        }

        for sensitive in SENSITIVE_SEGMENTS {
            if trimmed == *sensitive || trimmed.starts_with(&format!("{}.", sensitive)) {
                return Err(format!("Access denied: path contains protected credential component '{}'", sensitive));
            }
        }
    }

    Ok(())
}

/// Validates that a user-supplied path:
/// 1. Does not escape the `workspace_root` (canonicalizes both target and parents; handles symlinks, dangling links, and breakouts).
/// 2. Does not touch sensitive credential paths or system files (checked both on input and on resolved target relative to workspace).
/// 3. Prevents write access to `.git` metadata and hooks when `access == Access::Write`.
///
/// Returns the canonical or validated absolute PathBuf.
pub fn validate_path(workspace_root: &Path, input_path: &str, access: Access) -> Result<PathBuf, String> {
    if input_path.trim().is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let normalized_input = input_path.replace('\\', "/").to_lowercase();

    // 1. Check sensitive absolute path prefixes
    for prefix in SENSITIVE_PREFIXES {
        if normalized_input.starts_with(prefix) {
            return Err(format!("Access denied: path accesses protected system resource '{}'", prefix));
        }
    }

    // 2. Check sensitive segments on the user input string
    check_sensitive_segments(input_path)?;

    let input = Path::new(input_path);

    // 3. Resolve target path relative to workspace if not absolute
    let target = if input.is_absolute() {
        input.to_path_buf()
    } else {
        workspace_root.join(input)
    };

    // 4. Lexically normalize path components to eliminate `.` and `..`
    let mut normalized = PathBuf::new();
    for comp in target.components() {
        match comp {
            Component::Prefix(p) => normalized.push(Component::Prefix(p)),
            Component::RootDir => normalized.push(Component::RootDir),
            Component::CurDir => {}
            Component::ParentDir => {
                if !normalized.pop() {
                    return Err("Access denied: path attempts to escape root directory".to_string());
                }
            }
            Component::Normal(c) => normalized.push(c),
        }
    }

    // 5. Canonicalize workspace root (fails closed: returns Err if workspace root cannot be canonicalized)
    let canonical_workspace = workspace_root
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize workspace root '{}': {}", workspace_root.display(), e))?;
    let clean_workspace = strip_verbatim_prefix(&canonical_workspace);

    // 6. Inspect symlink metadata via lstat to catch dangling symlinks and directory symlinks
    let final_path = if std::fs::symlink_metadata(&normalized).is_ok() {
        // The path itself exists (as regular file, directory, or symlink).
        // canonicalize() follows symlinks to their ultimate target.
        // If it is a dangling symlink pointing to a non-existent target, canonicalize() fails!
        normalized.canonicalize().map_err(|e| {
            format!("Access denied: failed to canonicalize path or dangling symlink '{}': {}", input_path, e)
        })?
    } else {
        // Path does not exist yet (e.g. for write_file).
        // Walk up to find the closest existing parent directory using lstat (symlink_metadata).
        let mut curr = normalized.as_path();
        let mut non_existent_parts = Vec::new();
        let mut resolved = None;

        while let Some(parent) = curr.parent() {
            if let Some(name) = curr.file_name() {
                non_existent_parts.push(name);
            }

            // Check if parent directory exists on disk (including if parent is a symlink)
            if std::fs::symlink_metadata(parent).is_ok() {
                // Canonicalize parent following any symlinks
                let canonical_parent = parent.canonicalize().map_err(|e| {
                    format!("Access denied: failed to canonicalize parent directory '{}': {}", parent.display(), e)
                })?;

                let clean_parent = strip_verbatim_prefix(&canonical_parent);
                if !clean_parent.starts_with(&clean_workspace) {
                    return Err(format!(
                        "Access denied: path '{}' escapes workspace boundary '{}'",
                        input_path,
                        workspace_root.display()
                    ));
                }

                // Reconstruct full canonical target path: canonical_parent + remaining components
                non_existent_parts.reverse();
                let mut reconstructed = canonical_parent;
                for part in non_existent_parts {
                    reconstructed.push(part);
                }
                resolved = Some(reconstructed);
                break;
            }
            curr = parent;
        }

        resolved.unwrap_or(normalized)
    };

    // 7. Single airtight boundary check: resolved path must start with canonical workspace
    let clean_final = strip_verbatim_prefix(&final_path);
    if !clean_final.starts_with(&clean_workspace) {
        return Err(format!(
            "Access denied: target path '{}' is outside workspace boundary '{}'",
            final_path.display(),
            canonical_workspace.display()
        ));
    }

    // 8. Run sensitive segment check a second time on the resolved path relative to workspace
    // (Blocks symlink aliases like 'notes.txt -> .env' without false-positives on paths above workspace)
    if let Ok(rel) = final_path.strip_prefix(&canonical_workspace) {
        check_sensitive_segments(&rel.to_string_lossy())?;

        // 9. Write protection: Prevent writes to .git metadata, config, or hooks
        if access == Access::Write {
            let rel_normalized = rel.to_string_lossy().replace('\\', "/").to_lowercase();
            for segment in rel_normalized.split('/') {
                if segment == ".git" {
                    return Err("Access denied: write operations inside .git are forbidden".to_string());
                }
            }
        }
    }

    Ok(final_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_valid_child_path() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_guardrails_valid");
        let _ = fs::create_dir_all(&temp_dir);

        let validated = validate_path(&temp_dir, "src/main.rs", Access::Read);
        assert!(validated.is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_blocks_traversal_attack() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_guardrails_traversal");
        let _ = fs::create_dir_all(&temp_dir);

        let result = validate_path(&temp_dir, "../../etc/passwd", Access::Read);
        assert!(result.is_err());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_blocks_sensitive_patterns() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_guardrails_sensitive");
        let _ = fs::create_dir_all(&temp_dir);

        // Blocks exact sensitive file
        assert!(validate_path(&temp_dir, ".ssh/id_rsa", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "config/.aws/credentials", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "C:\\Windows\\System32\\drivers", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "certs/server.key", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "private.pem", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "backup.p12", Access::Read).is_err());

        // Allows legitimate file that contains substring or public key extension
        assert!(validate_path(&temp_dir, "valid_rsa_notes.md", Access::Read).is_ok());
        assert!(validate_path(&temp_dir, "id_rsa.pub", Access::Read).is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[cfg(unix)]
    #[test]
    fn test_blocks_symlink_escape() {
        use std::os::unix::fs::symlink;

        let base_dir = std::env::temp_dir().join("unfuse_test_symlink_base");
        let outside_dir = std::env::temp_dir().join("unfuse_test_symlink_outside");
        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&outside_dir);

        let secret_file = outside_dir.join("secret.txt");
        let _ = fs::write(&secret_file, "classified");

        // Create a symlink INSIDE workspace pointing to OUTSIDE workspace
        let link_inside = base_dir.join("escape_link");
        let _ = symlink(&secret_file, &link_inside);

        // Validation must detect that canonical path points outside workspace
        let result = validate_path(&base_dir, "escape_link", Access::Read);
        assert!(result.is_err(), "Symlink pointing outside workspace must be rejected");

        let _ = fs::remove_dir_all(&base_dir);
        let _ = fs::remove_dir_all(&outside_dir);
    }

    #[test]
    fn test_blocks_env_variants() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_guardrails_env_variants");
        let _ = fs::create_dir_all(&temp_dir);

        // All .env variants must be blocked
        assert!(validate_path(&temp_dir, ".env", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env.local", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env.production", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env_local", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env_prod", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env-production", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env-secret", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".env_test.local", Access::Read).is_err());
        assert!(validate_path(&temp_dir, "nested/.env_secret", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".envrc", Access::Read).is_err());
        assert!(validate_path(&temp_dir, ".envrc.local", Access::Read).is_err());

        // Legitimate files containing 'env' must remain accessible
        assert!(validate_path(&temp_dir, "environment.rs", Access::Read).is_ok());
        assert!(validate_path(&temp_dir, "valid_env_notes.md", Access::Read).is_ok());
        assert!(validate_path(&temp_dir, "src/env_setup.ts", Access::Read).is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_windows_unc_path_matching() {
        // Test verbatim prefix stripping helper
        let unc_path = Path::new(r"\\?\C:\projects\my_app");
        assert_eq!(strip_verbatim_prefix(unc_path), PathBuf::from(r"C:\projects\my_app"));

        let unc_network = Path::new(r"\\?\UNC\server\share\file.txt");
        assert_eq!(strip_verbatim_prefix(unc_network), PathBuf::from(r"\\server\share\file.txt"));

        let normal_path = Path::new(r"/home/user/project");
        assert_eq!(strip_verbatim_prefix(normal_path), PathBuf::from(r"/home/user/project"));

        // Test that valid new-file creation inside workspace succeeds
        let temp_dir = std::env::temp_dir().join("unfuse_test_guardrails_new_file");
        let _ = fs::create_dir_all(&temp_dir);

        let new_file_res = validate_path(&temp_dir, "subfolder/non_existent_file.rs", Access::Write);
        assert!(new_file_res.is_ok(), "Non-existent new file path within workspace must succeed validation");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    // -----------------------------------------------------------------------
    // The 5 New Security Regression Tests
    // -----------------------------------------------------------------------

    #[cfg(unix)]
    #[test]
    fn test_blocks_dangling_symlink_write_escape() {
        use std::os::unix::fs::symlink;

        let base_dir = std::env::temp_dir().join("unfuse_test_dangling_base");
        let outside_dir = std::env::temp_dir().join("unfuse_test_dangling_outside");
        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&outside_dir);

        let non_existent_outside = outside_dir.join("authorized_keys");
        let dangling_link = base_dir.join("dangling_escape");
        let _ = symlink(&non_existent_outside, &dangling_link);

        // Dangling symlink write MUST be rejected
        let res = validate_path(&base_dir, "dangling_escape", Access::Write);
        assert!(res.is_err(), "Write through dangling symlink to outside path must be rejected");

        let _ = fs::remove_dir_all(&base_dir);
        let _ = fs::remove_dir_all(&outside_dir);
    }

    #[cfg(unix)]
    #[test]
    fn test_blocks_symlink_alias_to_sensitive_file() {
        use std::os::unix::fs::symlink;

        let base_dir = std::env::temp_dir().join("unfuse_test_symlink_alias");
        let _ = fs::create_dir_all(&base_dir);

        let env_file = base_dir.join(".env");
        let _ = fs::write(&env_file, "SECRET_KEY=12345");

        // Alias symlink: 'innocent_notes.txt' -> '.env' inside workspace
        let alias_link = base_dir.join("innocent_notes.txt");
        let _ = symlink(&env_file, &alias_link);

        // Access via alias MUST be rejected by post-canonicalization sensitive check
        let res = validate_path(&base_dir, "innocent_notes.txt", Access::Read);
        assert!(res.is_err(), "Symlink alias to .env must be rejected");

        let _ = fs::remove_dir_all(&base_dir);
    }

    #[cfg(unix)]
    #[test]
    fn test_blocks_new_file_under_symlinked_dir_pointing_outside() {
        use std::os::unix::fs::symlink;

        let base_dir = std::env::temp_dir().join("unfuse_test_dir_symlink_base");
        let outside_dir = std::env::temp_dir().join("unfuse_test_dir_symlink_outside");
        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&outside_dir);

        // Symlinked directory inside workspace pointing to outside directory
        let link_dir = base_dir.join("outside_link");
        let _ = symlink(&outside_dir, &link_dir);

        // Writing new file under symlinked directory MUST be rejected
        let res = validate_path(&base_dir, "outside_link/new_file.txt", Access::Write);
        assert!(res.is_err(), "New file creation under symlinked dir pointing outside must be rejected");

        let _ = fs::remove_dir_all(&base_dir);
        let _ = fs::remove_dir_all(&outside_dir);
    }

    #[cfg(unix)]
    #[test]
    fn test_workspace_root_itself_a_symlink() {
        use std::os::unix::fs::symlink;

        let real_base = std::env::temp_dir().join("unfuse_test_real_workspace");
        let link_base = std::env::temp_dir().join("unfuse_test_symlink_workspace");
        let _ = fs::create_dir_all(&real_base);

        let _ = symlink(&real_base, &link_base);

        // Valid file inside workspace must succeed even if workspace root path is a symlink
        let res = validate_path(&link_base, "src/main.rs", Access::Write);
        assert!(res.is_ok(), "Valid file within symlinked workspace root must succeed");

        let _ = fs::remove_dir_all(&real_base);
        let _ = fs::remove_file(&link_base);
    }

    #[cfg(unix)]
    #[test]
    fn test_blocks_symlink_traversal_parent() {
        use std::os::unix::fs::symlink;

        let base_dir = std::env::temp_dir().join("unfuse_test_traversal_base");
        let outside_parent = std::env::temp_dir().join("unfuse_test_traversal_outside");
        let outside_sub = outside_parent.join("sub");
        let _ = fs::create_dir_all(&base_dir);
        let _ = fs::create_dir_all(&outside_sub);

        let link = base_dir.join("sub_link");
        let _ = symlink(&outside_sub, &link);

        // Traversal escaping through symlink: sub_link/../../secret.txt
        let res = validate_path(&base_dir, "sub_link/../../secret.txt", Access::Read);
        assert!(res.is_err(), "Traversal through symlink escaping workspace must be rejected");

        let _ = fs::remove_dir_all(&base_dir);
        let _ = fs::remove_dir_all(&outside_parent);
    }

    #[test]
    fn test_git_write_protection() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_git_write");
        let _ = fs::create_dir_all(&temp_dir);

        // Writes to .git must be blocked
        assert!(validate_path(&temp_dir, ".git/hooks/pre-commit", Access::Write).is_err());
        assert!(validate_path(&temp_dir, ".git/config", Access::Write).is_err());
        assert!(validate_path(&temp_dir, "sub/.git/config", Access::Write).is_err());

        // Reads to non-secret .git files are permitted
        assert!(validate_path(&temp_dir, ".git/config", Access::Read).is_ok());

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
