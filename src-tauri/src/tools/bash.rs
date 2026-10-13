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
pub(crate) mod tests {
    use super::*;

    pub(crate) static PROCESS_TEST_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

    #[test]
    fn test_echo_command() {
        let _process_guard = PROCESS_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
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
        let _process_guard = PROCESS_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let temp_dir = std::env::temp_dir();
        let res = execute_bash(&temp_dir, "exit 42", Some(5));

        assert!(res.is_ok());
        let out = res.unwrap();
        assert_eq!(out.exit_code, Some(42));
    }

    #[test]
    fn test_timeout_kills_process() {
        let _process_guard = PROCESS_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
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
        let cmd = {
            // Windows timeout.exe requires a console. Encode the PowerShell
            // script as UTF-16LE to avoid cmd.exe's nested-quote interpretation.
            let script = format!(
                "Start-Sleep -Seconds 2; [System.IO.File]::WriteAllText('{}', 'completed')",
                marker.to_string_lossy().replace('\'', "''")
            );
            let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
            format!("powershell.exe -NoProfile -NonInteractive -EncodedCommand {}",
                crate::provider::base64_encode(&bytes))
        };

        // Prove the command really runs long enough and can create the marker.
        // Otherwise an early shell error could hide a broken process-tree kill.
        let control_start = Instant::now();
        let control = execute_bash(&temp_dir, &cmd, Some(10)).unwrap();
        assert_eq!(control.exit_code, Some(0), "Control failed: {:?}", control);
        assert!(!control.timed_out);
        assert!(control_start.elapsed() >= Duration::from_secs(2));
        assert!(marker.exists(), "Control command did not create the marker");
        std::fs::remove_file(&marker).unwrap();

        let res = execute_bash(&temp_dir, &cmd, Some(1));

        assert!(res.is_ok());
        let out = res.unwrap();
        assert!(out.timed_out, "Expected timeout, got: {:?}", out);
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
        let _process_guard = PROCESS_TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let temp_dir = std::env::temp_dir();
        // Without the output-cap kill, this workload keeps running for about 30 s.
        #[cfg(not(target_os = "windows"))]
        let cmd = "end=$(($(date +%s) + 30)); while [ $(date +%s) -lt $end ]; do i=0; while [ $i -lt 8192 ]; do printf 'flooding output\\n'; i=$((i + 1)); done; done".to_string();
        #[cfg(target_os = "windows")]
        let cmd = {
            let script = "$watch = [System.Diagnostics.Stopwatch]::StartNew(); while ($watch.Elapsed.TotalSeconds -lt 30) { [Console]::Out.WriteLine(('flooding output ' * 512)) }";
            let bytes: Vec<u8> = script.encode_utf16().flat_map(u16::to_le_bytes).collect();
            format!("powershell.exe -NoProfile -NonInteractive -EncodedCommand {}",
                crate::provider::base64_encode(&bytes))
        };

        let start = Instant::now();
        let mut launched_pid = None;
        let res = execute_bash_with_pid_callback(&temp_dir, &cmd, Some(40),
            Some(|pid| launched_pid = Some(pid)));

        assert!(res.is_ok());
        let out = res.unwrap();
        let elapsed = start.elapsed();
        eprintln!("output flood elapsed: {:?}", elapsed);
        assert!(elapsed < Duration::from_secs(10), "output flood elapsed: {:?}", elapsed);
        assert!(!out.timed_out, "Output cap must stop the workload before timeout: {:?}", out);
        assert!(out.output.contains("output exceeded 65536 bytes limit"));
        let (body, notice) = out.output.split_once("\n\n[Command terminated:").expect("Missing output-cap notice");
        assert!(body.contains("flooding output"));
        assert!(body.len() <= MAX_OUTPUT_BYTES);
        assert!(out.output.len() <= MAX_OUTPUT_BYTES + notice.len() + "\n\n[Command terminated:".len());

        // Returning capped output is insufficient: a missing kill would leave
        // the launched shell alive for the rest of the 30-second workload.
        let pid = sysinfo::Pid::from_u32(launched_pid.expect("Shell PID was not reported"));
        let exit_deadline = Instant::now() + Duration::from_secs(2);
        loop {
            let mut system = sysinfo::System::new();
            system.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[pid]));
            if system.process(pid).is_none() { break; }
            assert!(Instant::now() < exit_deadline, "Output cap returned but shell {pid} is still running");
            thread::sleep(Duration::from_millis(10));
        }
    }

    #[test]
    fn test_truncate_to_byte_limit() {
        let text = "Hello, world! Multi-byte: 🦀🔥";
        let truncated = truncate_to_byte_limit(text, 10);
        assert!(truncated.len() <= 10);
        assert_eq!(truncated, "Hello, wor");
    }
}
