use super::guardrails::{validate_path, Access};
use std::fs::{self, OpenOptions};
use std::io::{Read, Write};
use std::path::Path;
use std::process::Stdio;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const MAX_OUTPUT_BYTES: usize = 65_536;
const MAX_LOG_BYTES: usize = 4 * 1024 * 1024;
const MAX_TIMEOUT_SECS: u64 = 1800;
static NEXT_LOG: AtomicU64 = AtomicU64::new(0);

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct BashOutput {
    pub exit_code: Option<i32>,
    pub output: String,
    pub timed_out: bool,
}

fn kill_tree(pid: u32) {
    #[cfg(unix)]
    unsafe {
        libc::kill(-(pid as i32), libc::SIGKILL);
    }
    #[cfg(windows)]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .output();
    }
}

fn pump(mut source: impl Read + Send + 'static, sender: mpsc::SyncSender<Vec<u8>>) {
    thread::spawn(move || {
        let mut buffer = [0; 8192];
        loop {
            match source.read(&mut buffer) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    if sender.send(buffer[..n].to_vec()).is_err() {
                        break;
                    }
                }
            }
        }
    });
}

pub fn execute_bash_with_options<F>(
    root: &Path,
    workdir: Option<&str>,
    command: &str,
    timeout: Option<u64>,
    allowed_domains: &[String],
    on_pid: Option<F>,
    mut on_output: Option<&mut dyn FnMut(&str)>,
) -> Result<BashOutput, String>
where
    F: FnOnce(u32),
{
    if command.trim().is_empty() {
        return Err("Command cannot be empty".into());
    }
    let seconds = timeout.unwrap_or(120);
    if seconds == 0 || seconds > MAX_TIMEOUT_SECS {
        return Err("timeout_secs must be between 1 and 1800".into());
    }
    let cwd = validate_path(root, workdir.unwrap_or("."), Access::Read)?;
    if !cwd.is_dir() {
        return Err("Working directory is not a directory".into());
    }
    let log_name = format!(
        ".unfuse/tool-output/{}-{}-{}.log",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos(),
        NEXT_LOG.fetch_add(1, Ordering::Relaxed)
    );
    let log_path = validate_path(root, &log_name, Access::Write)?;
    let parent = log_path.parent().ok_or("Missing output directory")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    if validate_path(root, &log_name, Access::Write)? != log_path {
        return Err("Output directory changed".into());
    }
    // A bounded session log remains readable through read_file. Refuse to grow the log directory without limit.
    let mut retained = 0u64;
    for entry in fs::read_dir(parent).map_err(|e| e.to_string())? {
        retained = retained.saturating_add(
            entry
                .map_err(|e| e.to_string())?
                .metadata()
                .map_err(|e| e.to_string())?
                .len(),
        );
    }
    if retained > 32 * 1024 * 1024 {
        return Err("Tool-output storage is full; remove old .unfuse/tool-output logs before running more commands".into());
    }
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut log = options.open(&log_path).map_err(|e| e.to_string())?;
    let (mut sandbox, mut cmd) = crate::sandbox::Invocation::new(
        root, &cwd, vec!["/bin/sh".into(), "-c".into(), command.into()], allowed_domains, None,
    )?;
    let mut child = match cmd
        .current_dir(&cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(child) => child,
        Err(e) => {
            drop(log);
            let _ = fs::remove_file(log_path);
            return Err(format!("Cannot start shell: {e}"));
        }
    };
    let pid = child.id();
    sandbox.pid = Some(pid);
    let (tx, rx) = mpsc::sync_channel(8);
    pump(child.stdout.take().ok_or("Missing stdout")?, tx.clone());
    pump(child.stderr.take().ok_or("Missing stderr")?, tx.clone());
    drop(tx);
    if let Some(callback) = on_pid {
        callback(pid);
    }
    let start = Instant::now();
    let mut preview = Vec::new();
    let mut total = 0usize;
    let mut streamed = 0usize;
    let mut logged = 0usize;
    let mut timed_out = false;
    let mut status = None;
    let mut ended = None;
    let mut log_error = None;
    loop {
        if status.is_none() {
            match child.try_wait() {
                Ok(Some(exit)) => {
                    status = Some(exit);
                    ended = Some(Instant::now());
                }
                Ok(None) => {}
                Err(e) => {
                    kill_tree(pid);
                    let _ = child.wait();
                    return Err(format!("Cannot wait for shell: {e}"));
                }
            }
        }
        if status.is_none() && start.elapsed() >= Duration::from_secs(seconds) {
            timed_out = true;
            kill_tree(pid);
            status = Some(child.wait().map_err(|e| e.to_string())?);
            ended = Some(Instant::now());
        }
        if ended.is_some_and(|end| end.elapsed() > Duration::from_millis(300)) {
            kill_tree(pid);
            break;
        }
        match rx.recv_timeout(Duration::from_millis(20)) {
            Ok(chunk) => {
                total = total.saturating_add(chunk.len());
                if streamed < MAX_OUTPUT_BYTES {
                    let count = chunk.len().min(MAX_OUTPUT_BYTES - streamed);
                    if let Some(callback) = on_output.as_mut() {
                        callback(&String::from_utf8_lossy(&chunk[..count]));
                    }
                    streamed += count;
                    if streamed == MAX_OUTPUT_BYTES {
                        if let Some(callback) = on_output.as_mut() {
                            callback("\n[Live preview limit reached; command continues, final result includes output details]\n");
                        }
                    }
                }
                let keep = chunk.len().min(MAX_LOG_BYTES.saturating_sub(logged));
                if keep > 0 && log_error.is_none() {
                    if let Err(e) = log.write_all(&chunk[..keep]) {
                        log_error = Some(e.to_string());
                    }
                    logged += keep;
                }
                preview.extend_from_slice(&chunk);
                if preview.len() > MAX_OUTPUT_BYTES {
                    preview.drain(..preview.len() - MAX_OUTPUT_BYTES);
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) if status.is_some() => break,
            Err(mpsc::RecvTimeoutError::Disconnected) => thread::sleep(Duration::from_millis(10)),
            Err(mpsc::RecvTimeoutError::Timeout) => {}
        }
    }
    kill_tree(pid);
    let exit = status.ok_or("Missing shell exit status")?;
    let mut output = String::from_utf8_lossy(&preview).into_owned();
    if total > MAX_OUTPUT_BYTES {
        output.push_str(&format!(
            "\n[Showing the last {MAX_OUTPUT_BYTES} bytes; output: {log_name}]"
        ));
    }
    if total > MAX_LOG_BYTES {
        output.push_str(&format!("\n[Stored output capped at {MAX_LOG_BYTES} bytes; additional output was drained and discarded]"));
    }
    if let Some(error) = log_error {
        output.push_str(&format!("\n[Output storage failed: {error}]"));
    }
    if timed_out {
        output.push_str(&format!("\n[Command timed out after {seconds} seconds]"));
    }
    output.push_str(&format!(
        "\n[Shell: {}; exit code: {}; duration: {:.2}s]",
        if cfg!(windows) {
            "powershell.exe"
        } else {
            "sh"
        },
        exit.code()
            .map_or("none (signal)".into(), |code| code.to_string()),
        start.elapsed().as_secs_f64()
    ));
    if total <= MAX_OUTPUT_BYTES {
        drop(log);
        let _ = fs::remove_file(log_path);
    }
    Ok(BashOutput {
        exit_code: exit.code(),
        output,
        timed_out,
    })
}
