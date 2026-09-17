// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

mod commands;
mod state;
mod pro_trait;
mod pro_engine;
mod autopilot;
mod license;
mod db;

use state::AppState;
use autopilot::session::AutopilotManager;
use license::LicenseManager;
use db::DatabaseManager;
use pro_engine::init_pro_engine;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 1. Resolve OS application data directory
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            // 2. Initialize database
            let db_path = app_data_dir.join("unfuse.db");
            let db = DatabaseManager::new(&db_path)
                .expect("Failed to initialize database");

            // 3. Initialize LicenseManager
            let license = LicenseManager::init(&app_data_dir);

            // 4. Instantiate ProEngine based on Cargo feature flag (RealProEngine or StubProEngine)
            let pro_engine = init_pro_engine(app.handle(), &license);

            // 5. Initialize AutopilotManager (server-side session and iteration tracking)
            let autopilot = AutopilotManager::new();

            // 6. Assemble AppState
            let app_state = AppState {
                autopilot,
                pro_engine,
                license,
                db,
            };

            // 7. Inject state into Tauri container
            app.manage(app_state);

            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::autopilot::start_autopilot,
            commands::autopilot::run_autopilot_step,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::replace_file_content,
            commands::shell::run_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
