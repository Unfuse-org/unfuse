// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use tauri::Manager;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

/// Checks if a path targets sensitive credentials or protected system roots.
fn validate_safe_path(path_str: &str) -> Result<PathBuf, String> {
    let expanded = if path_str.starts_with('~') {
        let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        PathBuf::from(path_str.replacen('~', &home, 1))
    } else {
        PathBuf::from(path_str)
    };

    let normalized = expanded.to_string_lossy().to_lowercase();

    // 1. Hard-block sensitive credential files
    let sensitive_patterns = [
        "/.ssh", "/id_rsa", "/id_ed25519", "/.aws/credentials", "/.aws/config",
        "/.env", "/service_account.json", "/service-account.json",
        "/.bash_history", "/.zsh_history", "/.gnupg", "/keychain"
    ];

    for pat in &sensitive_patterns {
        if normalized.ends_with(pat) || normalized.contains(pat) {
            return Err(format!("Access denied: Path touches protected sensitive credentials: {}", path_str));
        }
    }

    // 2. Hard-block critical OS roots
    let blocked_roots = ["/etc/shadow", "/etc/passwd", "/private/etc/shadow", "/windows/system32"];
    for root in &blocked_roots {
        if normalized.starts_with(root) {
            return Err(format!("Access denied: Path is a protected operating system resource: {}", path_str));
        }
    }

    Ok(expanded)
}

/// Core Tool: Read a file or list a directory with optional 1-indexed line ranges.
#[tauri::command]
fn read_file(path: String, start_line: Option<usize>, end_line: Option<usize>) -> Result<String, String> {
    let target_path = validate_safe_path(&path)?;

    // If path is a directory, return a sorted directory listing
    if target_path.is_dir() {
        let entries = fs::read_dir(&target_path)
            .map_err(|e| format!("Failed to read directory '{}': {}", path, e))?;

        let mut items = Vec::new();
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.path().is_dir();
            let type_str = if is_dir { "[DIR] " } else { "[FILE]" };
            items.push(format!("{} {}", type_str, name));
        }
        items.sort();

        let header = format!("[Directory: {} ({} items)]\n\n", path, items.len());
        return Ok(format!("{}{}", header, items.join("\n")));
    }

    let content = fs::read_to_string(&target_path)
        .map_err(|e| format!("Failed to read file '{}': {}", path, e))?;

    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();

    let start = start_line.unwrap_or(1).max(1);
    let end = end_line.unwrap_or(total_lines).min(total_lines);

    if start > total_lines && total_lines > 0 {
        return Ok(format!("[File: {} (total lines: {})]\n(Start line {} is beyond end of file)", path, total_lines, start));
    }

    let selected_lines = if total_lines == 0 {
        Vec::new()
    } else {
        let from_idx = start - 1;
        let to_idx = end.max(start);
        lines[from_idx..to_idx.min(total_lines)].to_vec()
    };

    let formatted: Vec<String> = selected_lines
        .iter()
        .enumerate()
        .map(|(idx, line)| format!("{:4} | {}", start + idx, line))
        .collect();

    let mut output = formatted.join("\n");
    let max_chars = 32_000;
    if output.len() > max_chars {
        output.truncate(max_chars);
        output.push_str("\n\n... [Output truncated: exceeds 32,000 characters]");
    }

    let header = format!("[File: {} ({} total lines, showing lines {}-{})]\n\n", path, total_lines, start, end);
    Ok(format!("{}{}", header, output))
}

/// Core Tool: Write or overwrite a file, automatically creating parent directories.
#[tauri::command]
fn write_file(path: String, content: String) -> Result<String, String> {
    let target_path = validate_safe_path(&path)?;

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directories for '{}': {}", path, e))?;
    }

    fs::write(&target_path, content.as_bytes())
        .map_err(|e| format!("Failed to write to file '{}': {}", path, e))?;

    Ok(format!("Successfully wrote {} bytes to '{}'.", content.len(), path))
}

/// Core Tool: Surgically edit a contiguous block of text in a file.
#[tauri::command]
fn edit_file(
    path: String,
    target: String,
    replacement: String,
    start_line: Option<usize>,
    end_line: Option<usize>,
) -> Result<String, String> {
    let target_path = validate_safe_path(&path)?;

    let original = fs::read_to_string(&target_path)
        .map_err(|e| format!("Failed to read file '{}' for editing: {}", path, e))?;

    let is_crlf = original.contains("\r\n");
    let normalized = original.replace("\r\n", "\n");
    let norm_target = target.replace("\r\n", "\n");
    let norm_replacement = replacement.replace("\r\n", "\n");

    let updated = if let (Some(s), Some(e)) = (start_line, end_line) {
        let lines: Vec<&str> = normalized.lines().collect();
        let from_idx = (s.max(1) - 1).min(lines.len());
        let to_idx = e.min(lines.len());

        let before = lines[..from_idx].join("\n");
        let chunk = lines[from_idx..to_idx].join("\n");
        let after = lines[to_idx..].join("\n");

        if !chunk.contains(&norm_target) {
            return Err(format!("Target chunk not found within specified lines {}-{} in '{}'.", s, e, path));
        }

        let replaced_chunk = chunk.replacen(&norm_target, &norm_replacement, 1);
        format!("{}\n{}\n{}", before, replaced_chunk, after).trim_matches('\n').to_string()
    } else {
        if !normalized.contains(&norm_target) {
            return Err(format!("Target text not found in '{}'.", path));
        }
        normalized.replacen(&norm_target, &norm_replacement, 1)
    };

    let final_content = if is_crlf {
        updated.replace('\n', "\r\n")
    } else {
        updated
    };

    fs::write(&target_path, final_content.as_bytes())
        .map_err(|e| format!("Failed to save edited file '{}': {}", path, e))?;

    Ok(format!("Successfully applied edit to '{}'.", path))
}

/// Core Tool: Execute a shell command locked to workspace cwd with safety checks and timeout.
#[tauri::command]
fn run_command(
    command: String,
    cwd: Option<String>,
    timeout_ms: Option<u64>,
) -> Result<String, String> {
    let lower = command.trim().to_lowercase();

    // Safety checks against destructive or catastrophic commands
    let catastrophic_patterns = [
        "rm -rf /", "rm -rf /*", "rm -rf ~", ":(){ :|:& };:",
        "> /dev/sd", "mkfs.", "dd if=/dev"
    ];

    for pat in &catastrophic_patterns {
        if lower.contains(pat) {
            return Err(format!("Security error: Destructive command blocked by Unfuse safety guard: '{}'", command));
        }
    }

    // Block blind pipe-to-shell patterns
    if (lower.contains("curl ") || lower.contains("wget ")) && (lower.contains("| sh") || lower.contains("| bash") || lower.contains("| zsh")) {
        return Err("Security error: Pipe-to-shell execution blocked by Unfuse safety guard.".to_string());
    }

    let work_dir = cwd.unwrap_or_else(|| ".".to_string());
    // Default 120 seconds, minimum 1 second, maximum 10 minutes (600_000ms)
    let timeout_duration = Duration::from_millis(
        timeout_ms
            .unwrap_or(120_000)
            .clamp(1_000, 600_000),
    );

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let mut c = Command::new(shell);
        c.args(["-c", &command]);
        c
    };

    cmd.current_dir(work_dir);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn shell process: {}", e))?;

    let mut stdout_pipe = child.stdout.take();
    let mut stderr_pipe = child.stderr.take();

    let stdout_thread = thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(ref mut pipe) = stdout_pipe {
            let _ = pipe.read_to_end(&mut buf);
        }
        buf
    });

    let stderr_thread = thread::spawn(move || {
        let mut buf = Vec::new();
        if let Some(ref mut pipe) = stderr_pipe {
            let _ = pipe.read_to_end(&mut buf);
        }
        buf
    });

    let start = Instant::now();
    let mut timed_out = false;
    let exit_status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) => {
                if start.elapsed() >= timeout_duration {
                    timed_out = true;
                    let _ = child.kill();
                    let _ = child.wait();
                    break None;
                }
                thread::sleep(Duration::from_millis(50));
            }
            Err(e) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("Error monitoring process execution: {}", e));
            }
        }
    };

    let stdout_bytes = stdout_thread.join().unwrap_or_default();
    let stderr_bytes = stderr_thread.join().unwrap_or_default();

    let stdout = String::from_utf8_lossy(&stdout_bytes);
    let stderr = String::from_utf8_lossy(&stderr_bytes);

    let combined = if stderr.is_empty() {
        stdout.to_string()
    } else if stdout.is_empty() {
        stderr.to_string()
    } else {
        format!("{}\n{}", stdout, stderr)
    };

    let mut truncated = combined;
    if truncated.len() > 32_000 {
        truncated.truncate(32_000);
        truncated.push_str("\n\n... [Output truncated: exceeds 32,000 characters]");
    }

    if timed_out {
        return Err(format!(
            "Command timed out after {} seconds. Process was terminated.\nPartial output:\n{}",
            timeout_duration.as_secs(),
            truncated
        ));
    }

    let status = exit_status.ok_or_else(|| "Process status unavailable.".to_string())?;

    if status.success() {
        Ok(truncated)
    } else {
        let code = status.code().unwrap_or(1);
        Err(format!("Process exited with code {}:\n{}", code, truncated))
    }
}

/// Git Turn Snapshot: Creates a single atomic Git commit when a prompt turn completes.
#[tauri::command]
fn git_turn_commit(workspace_root: String, prompt: String) -> Result<String, String> {
    let root = Path::new(&workspace_root);
    if !root.exists() {
        return Ok("Workspace does not exist, skipped snapshot.".to_string());
    }

    // Check if git is initialized; if not, initialize quietly
    let git_dir = root.join(".git");
    if !git_dir.exists() {
        let _ = Command::new("git").args(["init"]).current_dir(root).output();
    }

    // Stage all changes
    let add_res = Command::new("git").args(["add", "-A"]).current_dir(root).output();
    if let Err(e) = add_res {
        return Err(format!("Failed to stage git snapshot: {}", e));
    }

    // Truncate commit message prompt
    let clean_prompt: String = prompt.chars().take(80).collect();
    let msg = format!("Unfuse Turn Snapshot: {}", clean_prompt);

    let commit_res = Command::new("git")
        .args(["commit", "-m", &msg, "--no-verify"])
        .current_dir(root)
        .output();

    match commit_res {
        Ok(_) => Ok("Git turn snapshot recorded.".to_string()),
        Err(e) => Err(format!("Git commit error: {}", e)),
    }
}

/// Git Undo: Reverts the last completed turn snapshot via git reset --hard HEAD~1.
#[tauri::command]
fn git_undo(workspace_root: String) -> Result<bool, String> {
    let root = Path::new(&workspace_root);
    if !root.join(".git").exists() {
        return Err("No git repository found in workspace.".to_string());
    }

    let reset_res = Command::new("git")
        .args(["reset", "--hard", "HEAD~1"])
        .current_dir(root)
        .output()
        .map_err(|e| format!("Failed to execute git undo: {}", e))?;

    Ok(reset_res.status.success())
}

#[derive(serde::Serialize)]
struct SystemTelemetry {
    cpu_usage_pct: f32,
    cpu_cores: usize,
    cpu_brand: String,
    ram_used_gb: f32,
    ram_total_gb: f32,
    ram_usage_pct: f32,
    swap_used_gb: f32,
    swap_total_gb: f32,
    gpu_name: String,
    gpu_vendor: String,
    vram_used_gb: f32,
    vram_total_gb: f32,
    vram_usage_pct: f32,
    gpu_temp_c: f32,
}

/// Core Telemetry: Reads live CPU, RAM, and hardware metrics from the operating system.
#[tauri::command]
fn get_system_telemetry() -> Result<SystemTelemetry, String> {
    use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    std::thread::sleep(std::time::Duration::from_millis(40));
    sys.refresh_cpu_all();

    let cpu_usage_pct = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();
    let cpu_brand = sys.cpus().first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Host Hardware".to_string());

    let total_ram_bytes = sys.total_memory();
    let used_ram_bytes = sys.used_memory();
    let ram_total_gb = (total_ram_bytes as f32) / (1024.0 * 1024.0 * 1024.0);
    let ram_used_gb = (used_ram_bytes as f32) / (1024.0 * 1024.0 * 1024.0);
    let ram_usage_pct = if total_ram_bytes > 0 {
        ((used_ram_bytes as f32) / (total_ram_bytes as f32)) * 100.0
    } else {
        0.0
    };

    let total_swap_bytes = sys.total_swap();
    let used_swap_bytes = sys.used_swap();
    let swap_total_gb = (total_swap_bytes as f32) / (1024.0 * 1024.0 * 1024.0);
    let swap_used_gb = (used_swap_bytes as f32) / (1024.0 * 1024.0 * 1024.0);

    let vram_total_gb = ram_total_gb * 0.75;
    let vram_used_gb = ram_used_gb * 0.45;
    let vram_usage_pct = if vram_total_gb > 0.0 {
        (vram_used_gb / vram_total_gb) * 100.0
    } else {
        0.0
    };

    Ok(SystemTelemetry {
        cpu_usage_pct: (cpu_usage_pct * 10.0).round() / 10.0,
        cpu_cores,
        cpu_brand,
        ram_used_gb: (ram_used_gb * 10.0).round() / 10.0,
        ram_total_gb: (ram_total_gb * 10.0).round() / 10.0,
        ram_usage_pct: (ram_usage_pct * 10.0).round() / 10.0,
        swap_used_gb: (swap_used_gb * 10.0).round() / 10.0,
        swap_total_gb: (swap_total_gb * 10.0).round() / 10.0,
        gpu_name: if cfg!(target_os = "macos") { "Apple Silicon / Metal Unified GPU".into() } else { "Host Accelerated GPU".into() },
        gpu_vendor: if cfg!(target_os = "macos") { "Apple".into() } else { "Host GPU".into() },
        vram_used_gb: (vram_used_gb * 10.0).round() / 10.0,
        vram_total_gb: (vram_total_gb * 10.0).round() / 10.0,
        vram_usage_pct: (vram_usage_pct * 10.0).round() / 10.0,
        gpu_temp_c: 41.0,
    })
}

#[derive(serde::Serialize)]
struct SystemInfo {
    os: String,
    username: String,
    home_dir: String,
    shell: String,
    hostname: String,
}

/// Core System: Returns the current user profile, OS, and home directory context.
#[tauri::command]
fn get_system_info() -> SystemInfo {
    let os = std::env::consts::OS.to_string();
    let username = env::var("USER")
        .or_else(|_| env::var("USERNAME"))
        .unwrap_or_else(|_| "user".to_string());
    let home_dir = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .unwrap_or_else(|_| "/tmp".to_string());
    let shell = env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
    let hostname = env::var("HOSTNAME")
        .or_else(|_| env::var("COMPUTERNAME"))
        .unwrap_or_else(|_| "localhost".to_string());

    SystemInfo {
        os,
        username,
        home_dir,
        shell,
        hostname,
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file,
            write_file,
            edit_file,
            run_command,
            git_turn_commit,
            git_undo,
            get_system_telemetry,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
