// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod agent;
pub mod orchestrator;
pub mod provider;
pub mod prompt;
pub mod storage;
pub mod tools;
pub mod integrations;

use std::collections::HashMap;
use std::time::Duration;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

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
    gpu_name: Option<String>,
    gpu_vendor: Option<String>,
    vram_used_gb: Option<f32>,
    vram_total_gb: Option<f32>,
    vram_usage_pct: Option<f32>,
    gpu_temp_c: Option<f32>,
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
    std::thread::sleep(Duration::from_millis(40));
    sys.refresh_cpu_all();

    let cpu_usage_pct = sys.global_cpu_usage();
    let cpu_cores = sys.cpus().len();
    let cpu_brand = sys
        .cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Host Processor".to_string());

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

    Ok(SystemTelemetry {
        cpu_usage_pct: (cpu_usage_pct * 10.0).round() / 10.0,
        cpu_cores,
        cpu_brand,
        ram_used_gb: (ram_used_gb * 10.0).round() / 10.0,
        ram_total_gb: (ram_total_gb * 10.0).round() / 10.0,
        ram_usage_pct: (ram_usage_pct * 10.0).round() / 10.0,
        swap_used_gb: (swap_used_gb * 10.0).round() / 10.0,
        swap_total_gb: (swap_total_gb * 10.0).round() / 10.0,
        gpu_name: None,
        gpu_vendor: None,
        vram_used_gb: None,
        vram_total_gb: None,
        vram_usage_pct: None,
        gpu_temp_c: None,
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

/// Model Capabilities: Resolves a model's capabilities based on its provider and metadata.
#[tauri::command]
fn resolve_model_capabilities(provider: String, metadata: Option<serde_json::Value>) -> Result<provider::capability::ModelCapabilities, String> {
    Ok(provider::capability::resolve_model_capabilities(&provider, metadata.as_ref()))
}

#[tauri::command]
fn sync_integration_config(
    session_id: String,
    configs: HashMap<String, integrations::ServiceConfig>,
) -> Result<(), String> {
    let session = agent::get_or_create_session(&session_id);
    let mut guard = session.lock().unwrap();
    guard.integrations = configs;
    Ok(())
}

#[tauri::command]
pub async fn run_collaborative_turn(
    app: tauri::AppHandle,
    workspace_root: String,
    session_id: String,
    prompt: String,
    llm_configs: HashMap<String, agent::LlmConfigPayload>,
) -> Result<Vec<provider::ChatMessage>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        orchestrator::Orchestrator::run_collaborative_turn(
            app,
            workspace_root,
            session_id,
            prompt,
            llm_configs,
        )
    })
    .await
    .map_err(|e| format!("Collaborative turn task failed: {}", e))?
    .await
}

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_telemetry,
            get_system_info,
            agent::run_agent_turn,
            agent::cancel_agent_turn,
            agent::resolve_tool_permission,
            agent::update_session_policy,
            orchestrator::run_collaborative_turn,
            storage::create_session,
            storage::load_session,
            storage::list_sessions,
            storage::search_sessions,
            storage::rebuild_index,
            resolve_model_capabilities,
            sync_integration_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
