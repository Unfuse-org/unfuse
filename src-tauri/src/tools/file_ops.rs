use std::fs::{self, File};
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use super::guardrails::{validate_path, Access};

/// Maximum bytes to return in a single `read_file` call to protect context window (120 KB).
pub const MAX_READ_BYTES: usize = 120_000;

/// Maximum file size `edit_file` will operate on (10 MB). Editing needs the whole
/// file in memory to count/replace occurrences, so unlike read_file this can't be
/// streamed — reject oversized files instead of risking OOM.
pub const MAX_EDIT_FILE_BYTES: u64 = 10 * 1024 * 1024;

/// Safely truncates a UTF-8 string at a valid character boundary without exceeding `max_bytes`.
fn truncate_to_byte_limit(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes {
        return s;
    }
    let mut boundary = max_bytes;
    while boundary > 0 && !s.is_char_boundary(boundary) {
        boundary -= 1;
    }
    &s[..boundary]
}

/// Reads content from a file within the workspace boundary.
/// Supports optional line pagination (1-indexed start line and max lines).
/// Streams from disk with bounded memory usage to prevent OOM on large files.
pub fn read_file(
    workspace_root: &Path,
    rel_path: &str,
    offset_line: Option<usize>,
    limit_lines: Option<usize>,
) -> Result<String, String> {
    let target = validate_path(workspace_root, rel_path, Access::Read)?;

    if !target.exists() {
        return Err(format!("File not found: '{}'", rel_path));
    }
    if target.is_dir() {
        return Err(format!("'{}' is a directory, not a file", rel_path));
    }

    let file = File::open(&target)
        .map_err(|e| format!("Failed to open file '{}': {}", rel_path, e))?;

    // If neither offset nor limit is specified, read at most MAX_READ_BYTES + 1
    if offset_line.is_none() && limit_lines.is_none() {
        let mut handle = file.take((MAX_READ_BYTES + 1) as u64);
        let mut buffer = Vec::new();
        handle
            .read_to_end(&mut buffer)
            .map_err(|e| format!("Failed to read file '{}': {}", rel_path, e))?;

        let is_truncated = buffer.len() > MAX_READ_BYTES;
        let effective_bytes = if is_truncated {
            truncate_to_byte_limit(&String::from_utf8_lossy(&buffer), MAX_READ_BYTES).to_string()
        } else {
            String::from_utf8_lossy(&buffer).to_string()
        };

        if is_truncated {
            return Ok(format!(
                "{}\n\n[Output truncated: file exceeds {} bytes. Use offset and limit to view specific lines]",
                effective_bytes, MAX_READ_BYTES
            ));
        }
        return Ok(effective_bytes);
    }

    // Paginated reading: stream line-by-line via BufReader, capping each line's
    // own length so a single pathologically long line cannot defeat the byte budget.
    let mut reader = BufReader::new(file);
    let start = offset_line.unwrap_or(1).saturating_sub(1);
    let count = limit_lines.unwrap_or(usize::MAX);

    let mut output = String::new();
    let mut current_line = 0;
    let mut lines_collected = 0;

    loop {
        let mut raw_line = Vec::new();
        let bytes_read = reader
            .by_ref()
            .take((MAX_READ_BYTES + 1) as u64)
            .read_until(b'\n', &mut raw_line)
            .map_err(|e| format!("Error reading line in '{}': {}", rel_path, e))?;

        if bytes_read == 0 {
            break; // EOF
        }

        if raw_line.last() == Some(&b'\n') {
            raw_line.pop();
        }
        let line = String::from_utf8_lossy(&raw_line);

        if current_line >= start {
            let entry = format!("{:>5}: {}\n", current_line + 1, line);
            if output.len() + entry.len() > MAX_READ_BYTES {
                output.push_str(&format!(
                    "\n[Output truncated: exceeded {} bytes budget]",
                    MAX_READ_BYTES
                ));
                return Ok(output);
            }
            output.push_str(&entry);
            lines_collected += 1;
            if lines_collected >= count {
                break;
            }
        }
        current_line += 1;
    }

    if current_line < start {
        return Err(format!(
            "Offset line {} is beyond total lines in file ({})",
            offset_line.unwrap_or(1),
            current_line
        ));
    }

    Ok(output)
}

/// Creates or completely overwrites a file within the workspace boundary.
/// Automatically creates any missing parent directories.
pub fn write_file(workspace_root: &Path, rel_path: &str, content: &str) -> Result<String, String> {
    let target = validate_path(workspace_root, rel_path, Access::Write)?;

    if let Some(parent) = target.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories for '{}': {}", rel_path, e))?;
        }
    }

    fs::write(&target, content)
        .map_err(|e| format!("Failed to write to file '{}': {}", rel_path, e))?;

    Ok(format!(
        "Successfully wrote {} bytes to '{}'",
        content.len(),
        rel_path
    ))
}

/// Surgically replaces exact text in a file following Pi's strict single-occurrence rule.
pub fn edit_file(
    workspace_root: &Path,
    rel_path: &str,
    old_text: &str,
    new_text: &str,
) -> Result<String, String> {
    let target = validate_path(workspace_root, rel_path, Access::Write)?;

    if !target.exists() {
        return Err(format!("File not found: '{}'", rel_path));
    }

    let metadata = fs::metadata(&target)
        .map_err(|e| format!("Failed to stat file '{}': {}", rel_path, e))?;
    if metadata.len() > MAX_EDIT_FILE_BYTES {
        return Err(format!(
            "Edit failed: '{}' is {} bytes, exceeding the {} byte limit for edit_file. \
             Use bash (e.g. sed) for bulk changes on large files.",
            rel_path, metadata.len(), MAX_EDIT_FILE_BYTES
        ));
    }

    let raw = fs::read_to_string(&target)
        .map_err(|e| format!("Failed to read file '{}': {}", rel_path, e))?;

    // Detect if original file uses CRLF line endings
    let is_crlf = raw.contains("\r\n");

    // Normalize CRLF to LF for matching consistency across operating systems
    let normalized_content = raw.replace("\r\n", "\n");
    let normalized_old = old_text.replace("\r\n", "\n");
    let normalized_new = new_text.replace("\r\n", "\n");

    if normalized_old.is_empty() {
        return Err("old_text cannot be empty".to_string());
    }

    // Count occurrences of old_text
    let occurrences = normalized_content.matches(&normalized_old).count();

    if occurrences == 0 {
        return Err(format!(
            "Edit failed: old_text was not found in '{}'. Make sure the snippet matches existing code, indentation, and whitespace exactly.",
            rel_path
        ));
    }

    if occurrences > 1 {
        return Err(format!(
            "Edit failed: old_text appears {} times in '{}'. Please provide more surrounding lines of code to uniquely identify which occurrence to replace.",
            occurrences, rel_path
        ));
    }

    // Exact single match found -> perform surgical replacement
    let updated = normalized_content.replacen(&normalized_old, &normalized_new, 1);

    // Restore original CRLF line endings if original file used CRLF
    let final_content = if is_crlf {
        updated.replace('\n', "\r\n")
    } else {
        updated
    };

    fs::write(&target, final_content)
        .map_err(|e| format!("Failed to save edited file '{}': {}", rel_path, e))?;

    Ok(format!("Successfully edited '{}'", rel_path))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_write_and_read() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_file_ops_rw");
        let _ = fs::create_dir_all(&temp_dir);

        let write_res = write_file(&temp_dir, "nested/file.txt", "line 1\nline 2\nline 3\n");
        assert!(write_res.is_ok());

        let read_res = read_file(&temp_dir, "nested/file.txt", None, None);
        assert!(read_res.is_ok());
        assert_eq!(read_res.unwrap(), "line 1\nline 2\nline 3\n");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_read_paginated_cap() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_file_ops_paginated_cap");
        let _ = fs::create_dir_all(&temp_dir);

        // Create a large file exceeding MAX_READ_BYTES
        let large_line = "a".repeat(10_000) + "\n";
        let content = large_line.repeat(15); // 150 KB
        let _ = write_file(&temp_dir, "huge.txt", &content);

        let res = read_file(&temp_dir, "huge.txt", Some(1), Some(20));
        assert!(res.is_ok());
        let output = res.unwrap();
        assert!(output.contains("[Output truncated: exceeded 120000 bytes budget]"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_edit_unique_match() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_edit_unique");
        let _ = fs::create_dir_all(&temp_dir);

        let initial = "fn add(a: i32, b: i32) -> i32 {\n    a + b\n}\n";
        let _ = write_file(&temp_dir, "calc.rs", initial);

        let edit_res = edit_file(
            &temp_dir,
            "calc.rs",
            "    a + b",
            "    // Safe sum\n    a.saturating_add(b)",
        );
        assert!(edit_res.is_ok());

        let content = read_file(&temp_dir, "calc.rs", None, None).unwrap();
        assert!(content.contains("a.saturating_add(b)"));
        assert!(!content.contains("    a + b\n"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_edit_not_found_error() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_edit_not_found");
        let _ = fs::create_dir_all(&temp_dir);

        let _ = write_file(&temp_dir, "test.txt", "hello world");
        let edit_res = edit_file(&temp_dir, "test.txt", "goodbye world", "replacement");

        assert!(edit_res.is_err());
        assert!(edit_res.unwrap_err().contains("was not found"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_edit_multiple_occurrences_error() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_edit_multiple");
        let _ = fs::create_dir_all(&temp_dir);

        let _ = write_file(&temp_dir, "test.txt", "let x = 1;\nlet x = 1;\n");
        let edit_res = edit_file(&temp_dir, "test.txt", "let x = 1;", "let x = 2;");

        assert!(edit_res.is_err());
        assert!(edit_res.unwrap_err().contains("appears 2 times"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_edit_rejects_oversized_file() {
        use std::io::Write;

        let temp_dir = std::env::temp_dir().join("unfuse_test_edit_oversized");
        let _ = fs::create_dir_all(&temp_dir);

        // Write an 11 MB file (over the 10 MB cap)
        let chunk = "a".repeat(1024 * 1024);
        let target = temp_dir.join("huge.txt");
        {
            let mut f = fs::File::create(&target).unwrap();
            for _ in 0..11 {
                f.write_all(chunk.as_bytes()).unwrap();
            }
        }

        let res = edit_file(&temp_dir, "huge.txt", "a", "b");
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("exceeding"));

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_edit_preserves_crlf() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_edit_crlf");
        let _ = fs::create_dir_all(&temp_dir);

        let initial_crlf = "fn foo() {\r\n    let a = 1;\r\n    let b = 2;\r\n}\r\n";
        let target_path = temp_dir.join("crlf_code.rs");
        fs::write(&target_path, initial_crlf).unwrap();

        let edit_res = edit_file(
            &temp_dir,
            "crlf_code.rs",
            "    let a = 1;\r\n    let b = 2;",
            "    let a = 10;\r\n    let b = 20;",
        );
        assert!(edit_res.is_ok());

        let bytes = fs::read(&target_path).unwrap();
        let content = String::from_utf8(bytes).unwrap();
        assert!(content.contains("\r\n"), "File must retain CRLF line endings");
        // Verify no lone \n without \r
        let without_crlf = content.replace("\r\n", "");
        assert!(!without_crlf.contains('\n'), "File must not contain un-converted LF line endings");
        assert!(content.contains("let a = 10;\r\n    let b = 20;"));

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
