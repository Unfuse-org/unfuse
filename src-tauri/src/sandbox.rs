use serde_json::json;
use std::{
    collections::HashMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::Command,
    sync::{
        atomic::{AtomicU64, Ordering},
        OnceLock,
    },
};

static ASSETS: OnceLock<PathBuf> = OnceLock::new();
static NEXT: AtomicU64 = AtomicU64::new(0);

pub fn set_resources(path: PathBuf) {
    let _ = ASSETS.set(path);
}

pub fn validate_domains(domains: &[String]) -> Result<(), String> {
    if domains.len() > 32 {
        return Err("At most 32 network domains are allowed".into());
    }
    for domain in domains {
        let host = domain.strip_prefix("*.").unwrap_or(domain);
        if host.is_empty()
            || host.len() > 253
            || !host.split('.').all(|label| {
                !label.is_empty()
                    && label.len() <= 63
                    && !label.starts_with('-')
                    && !label.ends_with('-')
                    && label
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b == b'-')
            })
        {
            return Err(
                "Network entries must be hostnames such as api.example.com or *.example.com".into(),
            );
        }
    }
    Ok(())
}

pub struct Invocation {
    directory: PathBuf,
    pub pid: Option<u32>,
}
impl Invocation {
    pub fn new(
        root: &Path,
        cwd: &Path,
        argv: Vec<String>,
        domains: &[String],
        environment: Option<&HashMap<String, String>>,
    ) -> Result<(Self, Command), String> {
        validate_domains(domains)?;
        if !cfg!(any(target_os = "macos", target_os = "linux")) {
            return Err("SRT is unavailable on this platform; host execution is disabled".into());
        }
        let root = fs::canonicalize(root).map_err(|_| "Sandbox workspace does not exist")?;
        let cwd = fs::canonicalize(cwd).map_err(|_| "Sandbox working directory does not exist")?;
        if !root.is_dir() || !cwd.starts_with(&root) {
            return Err("Sandbox working directory must be within its workspace".into());
        }
        let binary_name = if cfg!(windows) {
            "unfuse-srt.exe"
        } else {
            "unfuse-srt"
        };
        let (binary, assets) = if cfg!(debug_assertions) {
            let base = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("runtime");
            (
                base.join(format!(
                    "unfuse-srt-{}{}",
                    env!("UNFUSE_SRT_TARGET"),
                    if cfg!(windows) { ".exe" } else { "" }
                )),
                base,
            )
        } else {
            let exe = std::env::current_exe().map_err(|e| e.to_string())?;
            (
                exe.parent()
                    .ok_or("Missing application directory")?
                    .join(binary_name),
                ASSETS
                    .get()
                    .ok_or("Sandbox resources have not been initialized")?
                    .join("runtime"),
            )
        };
        if !binary.is_file() {
            return Err("Bundled SRT helper is missing; host execution is disabled".into());
        }
        let directory = std::env::temp_dir().join(format!(
            "unfuse-srt-{}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        let mut builder = fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        builder.create(&directory).map_err(|e| e.to_string())?;
        let invocation = Self {
            directory,
            pid: None,
        };
        let home = invocation.directory.join("home");
        let tmp = invocation.directory.join("tmp");
        fs::create_dir(&home)
            .and_then(|()| fs::create_dir(&tmp))
            .map_err(|e| e.to_string())?;
        let literal = |path: &Path| json!({"path":path,"literal":true});
        let mut deny_read = vec![json!("/")];
        let mut protected = Vec::new();
        let insensitive = |name: &str| {
            name.chars()
                .map(|c| {
                    if c.is_ascii_alphabetic() {
                        format!("[{}{}]", c.to_ascii_lowercase(), c.to_ascii_uppercase())
                    } else {
                        c.to_string()
                    }
                })
                .collect::<String>()
        };
        for name in crate::tools::guardrails::SENSITIVE_SEGMENTS {
            let name = insensitive(name);
            protected.push(json!(format!("/**/{name}")));
            protected.push(json!(format!("/**/{name}/**")));
        }
        for extension in crate::tools::guardrails::SENSITIVE_EXTENSIONS {
            let extension = insensitive(extension);
            protected.push(json!(format!("/**/*{extension}")));
        }
        protected.push(json!("/**/.[eE][nN][vV]*"));
        for prefix in crate::tools::guardrails::SENSITIVE_PREFIXES {
            if prefix.starts_with('/') {
                protected.push(json!(prefix));
            }
        }
        protected.push(json!("/Library/Keychains"));
        deny_read.extend(protected.clone());
        deny_read.push(literal(&invocation.directory.join("plan.json")));
        let mut allow_read = vec![
            literal(&root),
            literal(&home),
            literal(&tmp),
            literal(&assets),
            literal(&binary),
        ];
        // Public system CA bundles are needed for TLS; private PEM/key files remain denied.
        for path in [
            "/etc/ssl/cert.pem",
            "/etc/ssl/certs/ca-certificates.crt",
            "/etc/pki/tls/certs/ca-bundle.crt",
        ] {
            if let Ok(path) = fs::canonicalize(path) {
                allow_read.push(literal(&path));
            }
        }
        for path in [
            "/bin",
            "/sbin",
            "/usr",
            "/System",
            "/Library",
            "/opt",
            "/etc",
            "/private/etc",
            "/private/var/select/sh",
            "/dev",
        ] {
            allow_read.push(literal(Path::new(path)));
        }
        let mut deny_write = protected;
        deny_write.extend([
            json!("/**/.[gG][iI][tT]"),
            json!("/**/.[gG][iI][tT]/**"),
            json!("/**/.[uU][nN][fF][uU][sS][eE]"),
            json!("/**/.[uU][nN][fF][uU][sS][eE]/**"),
            literal(&binary),
            literal(&assets),
            literal(&invocation.directory.join("plan.json")),
            json!("/tmp/claude"),
            json!("/private/tmp/claude"),
        ]);
        let plan = json!({"argv":argv,"cwd":cwd,"home":home,"tmp":tmp,"config":{
            "network":{"allowedDomains":domains.iter().map(|s| s.to_ascii_lowercase()).collect::<Vec<_>>(),"deniedDomains":[],"strictAllowlist":true},
            "filesystem":{"denyRead":deny_read,"allowRead":allow_read,"allowWrite":[literal(&root),literal(&home),literal(&tmp)],"denyWrite":deny_write}
        }});
        let plan_path = invocation.directory.join("plan.json");
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        options
            .open(&plan_path)
            .and_then(|mut f| f.write_all(plan.to_string().as_bytes()))
            .map_err(|e| e.to_string())?;
        let mut command = Command::new(binary);
        command
            .args([plan_path.as_os_str(), assets.join("vendor").as_os_str()])
            .current_dir(cwd)
            .env_clear();
        // Bootstrap utilities must not resolve from the writable project or a relative PATH entry.
        let path = std::env::var_os("PATH").unwrap_or_else(|| "/usr/bin:/bin".into());
        let paths: Vec<_> = std::env::split_paths(&path)
            .filter(|p| p.is_absolute() && !p.starts_with(&root))
            .collect();
        command.env(
            "PATH",
            std::env::join_paths(paths).map_err(|_| "Invalid executable search path")?,
        );
        command.env("LANG", "en_US.UTF-8");
        for (name, value) in environment.into_iter().flatten() {
            let upper = name.to_ascii_uppercase();
            if ["NODE_", "BUN_", "SRT_", "DYLD_", "LD_", "CLAUDE_"]
                .iter()
                .any(|p| upper.starts_with(p))
                || [
                    "BASH_ENV",
                    "ENV",
                    "SHELLOPTS",
                    "PATH",
                    "HOME",
                    "TMPDIR",
                    "TMP",
                    "TEMP",
                    "HTTP_PROXY",
                    "HTTPS_PROXY",
                    "ALL_PROXY",
                    "NO_PROXY",
                ]
                .contains(&upper.as_str())
                || !name.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
                || name.is_empty()
                || name.as_bytes()[0].is_ascii_digit()
            {
                return Err(format!(
                    "Reserved or invalid sandbox environment name: {name}"
                ));
            }
            command.env(name, value);
        }
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            command.process_group(0);
        }
        Ok((invocation, command))
    }
}
impl Drop for Invocation {
    fn drop(&mut self) {
        #[cfg(unix)]
        if let Some(pid) = self.pid {
            unsafe {
                libc::kill(-(pid as i32), libc::SIGKILL);
            }
        }
        let _ = fs::remove_dir_all(&self.directory);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn run(root: &Path, script: &str, domains: &[String]) -> std::process::Output {
        let (_invocation, mut command) = Invocation::new(
            root,
            root,
            vec!["/bin/sh".into(), "-c".into(), script.into()],
            domains,
            None,
        )
        .unwrap();
        command.output().unwrap()
    }
    #[test]
    fn filesystem_environment_and_network_are_restricted() {
        let root = std::env::temp_dir().join(format!("unfuse-policy-test-{}", std::process::id()));
        fs::create_dir_all(root.join("project/.git")).unwrap();
        fs::write(root.join("outside"), "fake outside data").unwrap();
        let workspace = root.join("project");
        fs::write(workspace.join(".env"), "fake secret").unwrap();
        fs::write(workspace.join("inside"), "readable").unwrap();
        let script = format!("cat inside; printf ok > output; ! cat .env; ! cat '{}'; ! touch '{}'; ! touch .git/marker; if curl --max-time 3 -fsS https://example.com; then exit 55; fi; test -z \"$OPENAI_API_KEY\"", root.join("outside").display(), root.join("forbidden").display());
        let output = run(&workspace, &script, &[]);
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(String::from_utf8_lossy(&output.stdout).contains("readable"));
        assert!(!String::from_utf8_lossy(&output.stdout).contains("fake"));
        assert!(workspace.join("output").exists());
        assert!(!root.join("forbidden").exists());
        assert!(!workspace.join(".git/marker").exists());
        fs::create_dir(workspace.join("nested")).unwrap();
        fs::write(workspace.join(".env.Mixed"), "fake mixed-case secret").unwrap();
        fs::write(workspace.join("PRIVATE.KEY"), "fake private key").unwrap();
        #[cfg(unix)]
        std::os::unix::fs::symlink(root.join("outside"), workspace.join("alias")).unwrap();
        let (_invocation, mut command) = Invocation::new(
            &workspace,
            &workspace.join("nested"),
            vec![
                "/bin/sh".into(),
                "-c".into(),
                "if cat ../.env.Mixed ../PRIVATE.KEY ../alias; then exit 55; fi".into(),
            ],
            &[],
            None,
        )
        .unwrap();
        let output = command.output().unwrap();
        assert!(output.status.success());
        assert!(!String::from_utf8_lossy(&output.stdout).contains("fake"));
        let output = run(&workspace, "head -c 100000 /dev/zero | tr '\\0' x", &[]);
        assert!(output.status.success());
        assert_eq!(output.stdout.len(), 100000);
        assert!(
            output.stderr.is_empty(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn invalid_domains_and_runtime_environment_are_rejected() {
        for domain in ["*", "https://example.com", "a/b", "", "x:80"] {
            assert!(validate_domains(&[domain.into()]).is_err());
        }
        assert!(validate_domains(&["*.example.com".into()]).is_ok());
        assert!(Invocation::new(
            Path::new("/tmp"),
            Path::new("/tmp"),
            vec!["true".into()],
            &[],
            Some(&HashMap::from([("BASH_ENV".into(), "evil".into())]))
        )
        .is_err());
    }

    #[test]
    fn approved_network_and_arguments_reach_the_sandbox() {
        use std::{
            io::{Read, Write},
            net::TcpListener,
        };
        let root = std::env::temp_dir().join(format!("unfuse-network-test-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let port = listener.local_addr().unwrap().port();
        let server = std::thread::spawn(move || {
            let start = std::time::Instant::now();
            while start.elapsed().as_secs() < 8 {
                if let Ok((mut socket, _)) = listener.accept() {
                    socket
                        .set_read_timeout(Some(std::time::Duration::from_secs(2)))
                        .unwrap();
                    let mut bytes = [0; 8192];
                    let _ = socket.read(&mut bytes);
                    socket
                        .write_all(
                            b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok",
                        )
                        .unwrap();
                    return true;
                }
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
            false
        });
        let output = run(
            &root,
            &format!("curl --noproxy '' --max-time 4 -fsS http://127.0.0.1:{port}"),
            &["127.0.0.1".into()],
        );
        assert!(
            server.join().unwrap(),
            "Approved request did not reach fixture: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(output.stdout, b"ok");
        let argument = "literal 'quote' $(touch escaped) ; text";
        let (_invocation, mut command) = Invocation::new(
            &root,
            &root,
            vec!["/usr/bin/printf".into(), "%s".into(), argument.into()],
            &[],
            None,
        )
        .unwrap();
        let output = command.output().unwrap();
        assert!(output.status.success());
        assert_eq!(output.stdout, argument.as_bytes());
        assert!(!root.join("escaped").exists());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    #[ignore = "Requires public HTTPS access; run explicitly to verify sandbox TLS compatibility"]
    fn approved_public_https() {
        let root = std::env::temp_dir().join(format!("unfuse-srt-https-{}", std::process::id()));
        fs::create_dir_all(&root).unwrap();
        let output = run(
            &root,
            "curl --max-time 15 -fsS https://example.com",
            &["example.com".into()],
        );
        fs::remove_dir_all(root).unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(String::from_utf8_lossy(&output.stdout).contains("Example Domain"));
    }
}
