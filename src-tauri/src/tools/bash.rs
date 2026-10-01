use std::io::Read;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

#[cfg(unix)]
use std::os::unix::process::CommandExt;

/// Maximum bytes of output returned to the model (64 KB).
pub const MAX_OUTPUT_BYTES: usize = 65_536;

/// Hard ceiling for command execution timeout (5 minutes).
const MAX_TIMEOUT_SECS: u64 = 300;
const DEFAULT_TIMEOUT_SECS: u64 = 60;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct BashOutput {
    pub exit_code: Option<i32>,
    pub output: String,
    pub timed_out: bool,
}

enum OutputMsg {
    Chunk(Vec<u8>),
    Exit(Option<i32>),
}

/// Helper function to safely truncate a UTF-8 string at a valid character boundary
/// without exceeding `max_bytes`.
pub fn truncate_to_byte_limit(s: &str, max_bytes: usize) -> &str {
    if s.len() <= max_bytes {
        return s;
    }
    let mut boundary = max_bytes;
    while boundary > 0 && !s.is_char_boundary(boundary) {
        boundary -= 1;
    }
    &s[..boundary]
}

/// Executes a shell command within the workspace directory.
///
/// ### Security Note:
/// Shell commands run with the permissions of the host user executing Unfuse.
/// Unlike file tools, shell semantics cannot be reliably jailed by path checks alone.
/// Protection for `bash` is enforced via:
/// 1. The interactive **UI Permission Gate** (`tool_call_pending`), requiring user consent.
/// 2. Optional external **Sandbox MCPs** (Docker / E2B) for isolated environments.
///
/// ### Process Management:
/// - Commands are launched in their own process group on Unix (`setpgid`).
/// - If execution exceeds the clamped timeout (max 300s) OR the output exceeds `MAX_OUTPUT_BYTES` (64 KB),
///   the **entire process group** is actively killed (`SIGKILL` on Unix, `taskkill /T /F` on Windows)
///   to prevent orphaned processes and memory exhaustion from infinite flood loops.
/// - Note: Commands that deliberately detach using `setsid`, `nohup`, or `disown` escape process groups,
///   which is why the interactive Permission Gate and/or external Sandbox MCP remain the primary enforcement boundaries.
pub fn execute_bash(
    workspace_root: &Path,
    command: &str,
    timeout_secs: Option<u64>,
) -> Result<BashOutput, String> {
    execute_bash_with_pid_callback(workspace_root, command, timeout_secs, None::<fn(u32)>)
}

pub fn execute_bash_with_pid_callback<F>(
    workspace_root: &Path,
    command: &str,
    timeout_secs: Option<u64>,
    on_pid: Option<F>,
) -> Result<BashOutput, String>
where
    F: FnOnce(u32),
{
    if command.trim().is_empty() {
        return Err("Command cannot be empty".to_string());
    }

    // Clamp timeout: minimum 1s, maximum 300s (5 minutes)
    let effective_timeout = timeout_secs
        .unwrap_or(DEFAULT_TIMEOUT_SECS)
        .clamp(1, MAX_TIMEOUT_SECS);
    let timeout_duration = Duration::from_secs(effective_timeout);

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("cmd.exe");
        c.args(["/C", command]);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = Command::new("sh");
        c.args(["-c", command]);
        // Put the child in its own process group so that timed-out kills terminate all sub-children
        unsafe {
            c.pre_exec(|| {
                libc::setpgid(0, 0);
                Ok(())
            });
        }
        c
    };

    cmd.current_dir(workspace_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn shell command '{}': {}", command, e))?;

    let pid = child.id() as i32;
    if let Some(cb) = on_pid {
        cb(pid as u32);
    }
    let mut stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let mut stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let (tx, rx) = mpsc::channel();
    let tx_stdout = tx.clone();
    let tx_stderr = tx.clone();

    // Stream stdout incrementally in a background thread
    let h_stdout = thread::spawn(move || {
        let mut buf = [0u8; 4096];
        while let Ok(n) = stdout.read(&mut buf) {
            if n == 0 {
                break;
            }
            if tx_stdout.send(OutputMsg::Chunk(buf[..n].to_vec())).is_err() {
                break;
            }
        }
    });

    // Stream stderr incrementally in a background thread
    let h_stderr = thread::spawn(move || {
        let mut buf = [0u8; 4096];
        while let Ok(n) = stderr.read(&mut buf) {
            if n == 0 {
                break;
            }
            if tx_stderr.send(OutputMsg::Chunk(buf[..n].to_vec())).is_err() {
                break;
            }
        }
    });

    // Monitor child exit status in a background thread and join reader threads
    thread::spawn(move || {
        let status = child.wait();
        let code = status.ok().and_then(|s| s.code());
        // Wait for both readers to finish sending all buffered bytes before signaling exit
        let _ = h_stdout.join();
        let _ = h_stderr.join();
        let _ = tx.send(OutputMsg::Exit(code));
    });

    let deadline = Instant::now() + timeout_duration;
    let mut accumulated = Vec::new();
    let mut exit_code = None;
    let mut timed_out = false;
    let mut output_flooded = false;

    loop {
        let now = Instant::now();
        if now >= deadline {
            timed_out = true;
            break;
        }

        let remaining = deadline - now;
        match rx.recv_timeout(remaining) {
            Ok(OutputMsg::Chunk(chunk)) => {
                accumulated.extend_from_slice(&chunk);
                if accumulated.len() > MAX_OUTPUT_BYTES {
                    output_flooded = true;
                    break;
                }
            }
            Ok(OutputMsg::Exit(code)) => {
                exit_code = code;
                // Drain any remaining buffered pipe chunks
                while let Ok(OutputMsg::Chunk(chunk)) = rx.try_recv() {
                    accumulated.extend_from_slice(&chunk);
                    if accumulated.len() > MAX_OUTPUT_BYTES {
                        output_flooded = true;
                        break;
                    }
                }
                break;
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                timed_out = true;
                break;
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }

    // If timed out or output flooded, kill the entire process group actively
    if timed_out || output_flooded {
        #[cfg(unix)]
        unsafe {
            libc::kill(-pid, libc::SIGKILL);
        }

        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }
    }

    if timed_out {
        return Ok(BashOutput {
            exit_code: None,
            output: format!(
                "Command timed out after {} seconds and was terminated.",
                timeout_duration.as_secs()
            ),
            timed_out: true,
        });
    }

    let raw_str = String::from_utf8_lossy(&accumulated);
    let mut final_text = if raw_str.trim().is_empty() && exit_code == Some(0) {
        "[Command executed successfully with no output]".to_string()
    } else {
        raw_str.to_string()
    };

    if output_flooded || accumulated.len() > MAX_OUTPUT_BYTES {
        let truncated = truncate_to_byte_limit(&final_text, MAX_OUTPUT_BYTES);
        final_text = format!(
            "{}\n\n[Command terminated: output exceeded {} bytes limit]",
            truncated, MAX_OUTPUT_BYTES
        );
    }

    Ok(BashOutput {
        exit_code,
        output: final_text,
        timed_out: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_echo_command() {
        let temp_dir = std::env::temp_dir();
        let res = execute_bash(&temp_dir, "echo 'hello from unfuse'", Some(5));

        assert!(res.is_ok());
        let out = res.unwrap();
        assert_eq!(out.exit_code, Some(0));
        assert!(out.output.contains("hello from unfuse"));
        assert!(!out.timed_out);
    }

    #[test]
    fn test_exit_code_failure() {
        let temp_dir = std::env::temp_dir();
        let res = execute_bash(&temp_dir, "exit 42", Some(5));

        assert!(res.is_ok());
        let out = res.unwrap();
        assert_eq!(out.exit_code, Some(42));
    }

    #[test]
    fn test_timeout_kills_process() {
        let temp_dir = std::env::temp_dir().join("unfuse_test_timeout_kill");
        let _ = std::fs::create_dir_all(&temp_dir);
        let marker = temp_dir.join("marker.txt");
        if marker.exists() {
            let _ = std::fs::remove_file(&marker);
        }

        // Run a command that attempts to touch marker after sleeping 2 seconds, with a 1 second timeout
        #[cfg(not(target_os = "windows"))]
        let cmd = format!("sleep 2 && touch '{}'", marker.display());
        #[cfg(target_os = "windows")]
        let cmd = format!("timeout /t 2 /nobreak && type nul > \"{}\"", marker.display());

        let res = execute_bash(&temp_dir, &cmd, Some(1));

        assert!(res.is_ok());
        let out = res.unwrap();
        assert!(out.timed_out);
        assert!(out.output.contains("timed out"));

        // Wait past the 2-second sleep duration to ensure orphaned process didn't survive and touch marker
        std::thread::sleep(Duration::from_millis(1500));
        assert!(
            !marker.exists(),
            "Process group kill failed: orphaned child continued running in background and created marker"
        );

        let _ = std::fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_output_flood_early_kill() {
        let temp_dir = std::env::temp_dir();
        // Run a flood command that would produce massive output if not killed early
        #[cfg(not(target_os = "windows"))]
        let cmd = "yes 'flooding output'";
        #[cfg(target_os = "windows")]
        let cmd = "for /L %G in (1,0,2) do @echo flooding output";

        let start = Instant::now();
        let res = execute_bash(&temp_dir, cmd, Some(10));

        assert!(res.is_ok());
        let out = res.unwrap();
        // Must complete almost immediately (< 500ms), far before the 10s timeout
        assert!(start.elapsed() < Duration::from_millis(1000));
        assert!(out.output.contains("output exceeded 65536 bytes limit"));
    }

    #[test]
    fn test_truncate_to_byte_limit() {
        let text = "Hello, world! Multi-byte: 🦀🔥";
        let truncated = truncate_to_byte_limit(text, 10);
        assert!(truncated.len() <= 10);
        assert_eq!(truncated, "Hello, wor");
    }
}
