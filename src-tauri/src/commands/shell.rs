use std::process::Command;
use std::time::Instant;
use serde::Serialize;
use crate::commands::error::CommandError;

#[derive(Debug, Serialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
}

#[tauri::command]
pub async fn run_command(
    command: String,
    cwd: Option<String>,
) -> Result<CommandResult, CommandError> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err(CommandError::InvalidInput("Command cannot be empty".into()));
    }

    // Safety guardrails against catastrophic commands
    let lower = trimmed.to_lowercase();
    if lower.contains("rm -rf /") || lower.contains("mkfs.") || lower.contains(":(){ :|:& };:") {
        return Err(CommandError::InvalidInput("Dangerous command blocked by Unfuse safety guard".into()));
    }

    let start = Instant::now();

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("powershell.exe");
        c.args(["-NoProfile", "-NonInteractive", "-Command", trimmed]);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = Command::new("/bin/sh");
        c.args(["-c", trimmed]);
        c
    };

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output().map_err(|e| CommandError::Io(format!("Failed to execute command: {}", e)))?;
    let duration_ms = start.elapsed().as_millis() as u64;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let exit_code = output.status.code().unwrap_or(-1);

    Ok(CommandResult {
        stdout,
        stderr,
        exit_code,
        duration_ms,
    })
}
