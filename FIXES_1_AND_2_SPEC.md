# Unfuse: FIX 1 & FIX 2 Specifications
> **Pre-Implementation Gating Architecture & Open-Core Mirror Split**  
> *Workspace*: `/home/zenK/Work/unfuse`  
> *Reference*: `/home/zenK/Work/ruthenlabs/unit01pro`  
> *Status*: Ready for Review & Sign-Off  
> *Date*: September 2026

---

## Executive Overview

Per architectural review requirements before Phase 2/3/4 implementation:
1. **FIX 1**: Server-side iteration state for autopilot gating (eliminating client-controlled bypasses) and comprehensive caller-input audit for all Pro commands.
2. **FIX 2**: Private repository monorepo (`unfuse-internal`) vs. public mirror (`unfuse`) split, Rust `ProEngine` trait/stub pattern, and GitHub Actions mirror workflow (`mirror-public.yml`).

---

## 1. FIX 1: Server-Side Autopilot Session Gating & Caller Audit

### 1.1 The Vulnerability in Client-Supplied Step Parameter
In client-gated designs, commands like `run_autopilot_step(step: u32)` rely on the caller to report which iteration is currently executing:
```rust
// ❌ VULNERABLE PATTERN (DO NOT USE)
#[tauri::command]
pub async fn run_autopilot_step(step: u32, state: State<'_, AppState>) -> Result<StepResult, Error> {
    if step > 1 && !state.license.is_pro() {
        return Err(Error::ProRequired);
    }
    // ...
}
```
**Why this fails:**
- The frontend controls the value of `step`.
- A free-tier client can call `run_autopilot_step(1)` repeatedly in a loop from JavaScript or browser DevTools.
- The gate never triggers because `step` is always `1`. The client achieves infinite self-healing loops without a Pro license.

---

### 1.2 The Fix: Server-Tracked `AutopilotSession` State
The client must **never** supply or control iteration numbers. The server (compiled Rust binary) maintains an internal `AutopilotSession` protected by a `Mutex`. The counter is only incremented by Rust after a step actually completes.

#### Data Structures (`src-tauri/src/autopilot/session.rs`)
```rust
use std::sync::Mutex;
use uuid::Uuid;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopilotSession {
    pub session_id: String,
    pub goal: String,
    pub iteration_count: u32,
    pub created_at: u64,
}

pub struct AutopilotManager {
    pub current_session: Mutex<Option<AutopilotSession>>,
}

impl AutopilotManager {
    pub fn new() -> Self {
        Self {
            current_session: Mutex::new(None),
        }
    }

    /// Resets iteration counter exclusively on new goal initialization
    pub fn start_session(&self, goal: String) -> String {
        let mut session = self.current_session.lock().unwrap();
        let session_id = Uuid::new_v4().to_string();
        *session = Some(AutopilotSession {
            session_id: session_id.clone(),
            goal,
            iteration_count: 0,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        });
        session_id
    }
}
```

#### Tauri Command Handlers (`src-tauri/src/commands/autopilot.rs`)
```rust
use tauri::State;
use crate::state::AppState;
use crate::commands::CommandError;
use serde::Serialize;

#[derive(Serialize)]
pub struct AutopilotStepResult {
    pub session_id: String,
    pub iteration: u32,
    pub success: bool,
    pub output: String,
    pub healed: bool,
}

/// Start an autopilot session: frontend provides ONLY the goal.
/// Server assigns session ID and sets iteration_count = 0.
#[tauri::command]
pub async fn start_autopilot(
    goal: String,
    state: State<'_, AppState>,
) -> Result<String, CommandError> {
    if goal.trim().is_empty() {
        return Err(CommandError::InvalidInput("Goal cannot be empty".into()));
    }
    let session_id = state.autopilot.start_session(goal);
    Ok(session_id)
}

/// Run an autopilot step: frontend passes ZERO step or counter arguments.
/// Gate relies exclusively on server-tracked session.iteration_count.
#[tauri::command]
pub async fn run_autopilot_step(
    state: State<'_, AppState>,
) -> Result<AutopilotStepResult, CommandError> {
    // 1. Lock server state and inspect the active session
    let mut session_guard = state.autopilot.current_session.lock().map_err(|_| {
        CommandError::Internal("Failed to acquire autopilot session lock".into())
    })?;

    let session = session_guard.as_mut().ok_or_else(|| {
        CommandError::InvalidState("No active autopilot session found. Call start_autopilot first.".into())
    })?;

    // 2. Pure server-side gate: Free tier is capped at 1 iteration
    if session.iteration_count >= 1 && !state.license.is_pro() {
        return Err(CommandError::ProRequired(
            "Multi-iteration self-healing Autopilot requires an active Unfuse Pro license.".into()
        ));
    }

    // 3. Execute the single step via the engine
    let result = state.autopilot_engine.execute_single_step(&session.goal).await?;

    // 4. Server increments internal counter ONLY upon actual step completion
    session.iteration_count += 1;

    Ok(AutopilotStepResult {
        session_id: session.session_id.clone(),
        iteration: session.iteration_count,
        success: result.success,
        output: result.output,
        healed: result.healed,
    })
}
```

---

### 1.3 Caller-Input Audit Table for All Pro Commands

To ensure no other commands have client-bypass vulnerabilities, every Pro-gated command was audited:

| Command | Caller-Supplied Parameters | State Gating Source of Truth | Security Verdict | Enforcement Mechanism |
| :--- | :--- | :--- | :---: | :--- |
| `start_autopilot` | `goal: String` | Generates new `AutopilotSession { iteration_count: 0 }` | **SAFE** | Resets iteration counter exclusively on new goal initialization. Client cannot supply count. |
| `run_autopilot_step` | **None** (`state` only) | Server `session.iteration_count` | **FIXED** | Client supplies zero numbers. Rust enforces `count >= 1 && !pro` and increments internally on completion. |
| `save_memory_item` | `kind: MemoryKind, content: String` | SQLite `COUNT(*)` for kind | **SAFE** | Server queries SQLite count. If `count >= limit && !pro`, rejects. Client cannot pass count or bypass flag. |
| `get_audit_chain` | `limit: Option<u32>` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. `limit` only sets SQL `LIMIT`, does not bypass gate. |
| `unlock_vault` | `password: String` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. Master key derivation and decryption execute in Rust. |
| `save_credential` | `service: String, secret: String` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. AES-256-GCM vault write executes in Rust. |
| `get_credential` | `service: String` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. Read from server AES-GCM vault. |
| `store_keychain_secret`| `service: String, secret: String` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. OS Keychain API called directly in Rust. |
| `dispatch_integration_action` | `service: String, action: String, payload: Value` | Server Vault token + `state.license.is_pro()` | **SAFE** | Client sends payload, but auth token is fetched from server vault. Gated by `is_pro()`. |
| `search_code` | `query: String, mode: SearchMode` | Server license check if `mode != SearchMode::Text` | **SAFE** | Enum checked on server. If `mode != Text && !pro`, rejects semantic search. |
| `rollback_shadow_backup` | `target_hash: String` | Server license check `state.license.is_pro()` | **SAFE** | Binary license check. File restored from server shadow backup tree. |

---

## 2. FIX 2: Private-Repo + CI Mirror Split Specification

### 2.1 The Open-Core Problem in a Public Repository
- The GitHub repository `Unfuse-org/unfuse` is public.
- In Rust, using Cargo feature flags (`--features pro`) inside a single public repository provides **zero protection** for proprietary code:
  - The proprietary algorithms and heuristics would be committed to GitHub for anyone to read and copy.
  - Anyone can clone the repository and run `cargo build --features pro`, unlocking Pro features without paying.
- Therefore, a **Two-Repo CI Mirror** pattern is required.

---

### 2.2 Physical Repository Directory Split

```
PUBLIC REPOSITORY: Unfuse-org/unfuse (Apache 2.0 / MIT)
├── .github/workflows/
│   ├── ci.yml                     (Open-source PR & build checks)
├── src/                           (React 18 + Vite frontend)
├── src-tauri/
│   ├── Cargo.toml                 (Public manifest: NO proprietary crate)
│   ├── src/
│   │   ├── main.rs
│   │   ├── pro_trait.rs           (ProEngine trait definition)
│   │   ├── pro_engine.rs          (Null / Stub provider returning Err(ProRequired))
│   │   ├── commands/              (Standard IPC commands)
│   │   ├── tools/                 (Core open-source file/shell tools)
│   │   ├── db/                    (SQLite session store)
│   │   └── telemetry/             (sysinfo hardware metrics)

PRIVATE REPOSITORY: Unfuse-org/unfuse-internal (Proprietary Monorepo)
├── .github/workflows/
│   ├── mirror-public.yml          (Automated strip, verify & mirror action)
├── crates/
│   └── unfuse-pro-core/           (🔒 PROPRIETARY CRATE - NEVER IN PUBLIC REPO)
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── autopilot/heuristics.rs  (Self-healing loops, fingerprinting)
│           ├── vault/crypto.rs          (AES-256-GCM, Argon2 derivation)
│           ├── audit/hashchain.rs       (SHA-256 tamper-evident log store)
│           ├── search/embeddings.rs     (Vector search & RRF fusion)
│           └── integrations/connectors/ (GitHub, Linear, Sentry, Slack)
├── src/                           (Identical to public)
└── src-tauri/
    ├── Cargo.toml                 (Has optional pro feature -> unfuse-pro-core)
    └── src/
        ├── pro_trait.rs           (Identical trait definition)
        └── pro_engine.rs          (Switches between RealProEngine and Stub)
```

---

### 2.3 Compiling the Public Repo Without the Private Crate (The Rust Stub Trait Pattern)

#### 1. Public Trait (`src-tauri/src/pro_trait.rs`)
```rust
use crate::commands::CommandError;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutopilotStepResult {
    pub success: bool,
    pub output: String,
    pub healed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditRecord {
    pub action: String,
    pub payload_hash: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub score: f32,
    pub snippet: String,
}

/// The abstraction implemented by both the real private engine and the public stub
pub trait ProEngine: Send + Sync {
    fn is_pro_active(&self) -> bool { false }
    fn execute_autopilot_step(&self, goal: &str) -> Result<AutopilotStepResult, CommandError>;
    fn unlock_vault(&self, password: &str) -> Result<(), CommandError>;
    fn get_vault_secret(&self, service: &str) -> Result<Option<String>, CommandError>;
    fn save_vault_secret(&self, service: &str, secret: &str) -> Result<(), CommandError>;
    fn record_audit_hash(&self, record: &AuditRecord) -> Result<String, CommandError>;
    fn search_embeddings(&self, query: &str) -> Result<Vec<SearchResult>, CommandError>;
}
```

#### 2. Provider Switch (`src-tauri/src/pro_engine.rs`)
```rust
// When building with the proprietary crate in the private repository:
#[cfg(feature = "pro")]
pub use unfuse_pro_core::RealProEngine as ActiveProEngine;

// When building in the open-source public repository (or without --features pro):
#[cfg(not(feature = "pro"))]
pub struct ActiveProEngine;

#[cfg(not(feature = "pro"))]
impl crate::pro_trait::ProEngine for ActiveProEngine {
    fn is_pro_active(&self) -> bool {
        false
    }

    fn execute_autopilot_step(&self, _goal: &str) -> Result<crate::pro_trait::AutopilotStepResult, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired(
            "Multi-iteration self-healing Autopilot requires Unfuse Pro.".into()
        ))
    }

    fn unlock_vault(&self, _password: &str) -> Result<(), crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Encrypted Vault requires Unfuse Pro.".into()))
    }

    fn get_vault_secret(&self, _service: &str) -> Result<Option<String>, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Encrypted Vault requires Unfuse Pro.".into()))
    }

    fn save_vault_secret(&self, _service: &str, _secret: &str) -> Result<(), crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Encrypted Vault requires Unfuse Pro.".into()))
    }

    fn record_audit_hash(&self, _record: &crate::pro_trait::AuditRecord) -> Result<String, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Tamper-evident audit chain requires Unfuse Pro.".into()))
    }

    fn search_embeddings(&self, _query: &str) -> Result<Vec<crate::pro_trait::SearchResult>, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Semantic vector search requires Unfuse Pro.".into()))
    }
}
```

#### 3. Cargo Configuration (`src-tauri/Cargo.toml`)
```toml
[dependencies]
# In private repo, this resolves to ../crates/unfuse-pro-core
# In public repo, this line and the pro feature are stripped by CI
unfuse-pro-core = { path = "../crates/unfuse-pro-core", optional = true }

```toml
[dependencies]
# In private repo, this resolves to ../crates/unfuse-pro-core
# In public repo, this line and the pro feature are stripped by CI
unfuse-pro-core = { path = "../crates/unfuse-pro-core", optional = true }

[features]
default = []
pro = ["dep:unfuse-pro-core"]
```

---

### 2.4 AppState Construction & ActiveProEngine Instantiation (The Wiring)

Here is the exact dependency injection and lifecycle architecture that instantiates `ActiveProEngine` based on the `pro` Cargo feature flag and attaches it to `AppState`:

#### 1. AppState Definition (`src-tauri/src/state.rs`)
```rust
use std::sync::Arc;
use crate::autopilot::session::AutopilotManager;
use crate::pro_trait::ProEngine;
use crate::license::LicenseManager;
use crate::db::DatabaseManager;

pub struct AppState {
    /// Server-tracked autopilot iteration counter and session manager (FIX 1)
    pub autopilot: AutopilotManager,

    /// ProEngine provider: either RealProEngine (via unfuse-pro-core) or StubProEngine
    /// Decoupled via trait object so AppState requires zero #[cfg] branches
    pub pro_engine: Arc<dyn ProEngine>,

    /// Cryptographic license manager (asymmetric Ed25519 signature verification)
    pub license: LicenseManager,

    /// Persistent local SQLite connection pool
    pub db: DatabaseManager,
}
```

#### 2. Factory Instantiation (`src-tauri/src/pro_engine.rs`)
```rust
use std::sync::Arc;
use crate::pro_trait::ProEngine;
use crate::license::LicenseManager;
use tauri::AppHandle;

#[cfg(feature = "pro")]
pub use unfuse_pro_core::RealProEngine as ActiveProEngine;

#[cfg(not(feature = "pro"))]
pub struct ActiveProEngine;

#[cfg(not(feature = "pro"))]
impl ActiveProEngine {
    pub fn new() -> Self {
        Self
    }
}

/// Factory function called during app bootstrap in main.rs.
/// Compiles to RealProEngine if --features pro is set (private monorepo release),
/// or StubProEngine if --features pro is absent (public open-source mirror).
pub fn init_pro_engine(app_handle: &AppHandle, license: &LicenseManager) -> Arc<dyn ProEngine> {
    #[cfg(feature = "pro")]
    {
        // Instantiates proprietary engine with access to app handle and verified license
        Arc::new(ActiveProEngine::new(app_handle.clone(), license.clone()))
    }

    #[cfg(not(feature = "pro"))]
    {
        let _ = (app_handle, license);
        // Instantiates open-source stub that returns Err(ProRequired) on all pro methods
        Arc::new(ActiveProEngine::new())
    }
}
```

#### 3. Tauri v2 Application Setup (`src-tauri/src/main.rs`)
```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tauri::Manager;
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
            // 1. Resolve OS data directory (~/.local/share/unfuse or ~/Library/Application Support/unfuse)
            let app_data_dir = app.path().app_data_dir()
                .expect("Failed to resolve app data directory");
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            // 2. Initialize local SQLite database
            let db_path = app_data_dir.join("unfuse.db");
            let db = DatabaseManager::new(&db_path)
                .expect("Failed to initialize SQLite database");

            // 3. Initialize License Manager (reads stored Ed25519 signature from disk)
            let license = LicenseManager::init(&app_data_dir);

            // 4. Instantiate ProEngine based on Cargo feature flag
            let pro_engine = init_pro_engine(app.handle(), &license);

            // 5. Initialize Autopilot Session Manager (server-side iteration state)
            let autopilot = AutopilotManager::new();

            // 6. Assemble AppState
            let app_state = AppState {
                autopilot,
                pro_engine,
                license,
                db,
            };

            // 7. Hand state ownership to Tauri runtime container
            app.manage(app_state);

            // 8. Platform vibrancy window styling
            #[cfg(target_os = "macos")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // FIX 1: Autopilot commands (zero client-supplied step counters)
            commands::autopilot::start_autopilot,
            commands::autopilot::run_autopilot_step,

            // Pro commands gated by license and ProEngine
            commands::vault::unlock_vault,
            commands::vault::save_credential,
            commands::vault::get_credential,
            commands::audit::get_audit_chain,

            // Core open-source commands
            commands::tools::read_file,
            commands::tools::write_file,
            commands::telemetry::get_system_telemetry,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 4. How Commands Consume the Injected Engine & Server State
In `src-tauri/src/commands/autopilot.rs`:
```rust
#[tauri::command]
pub async fn run_autopilot_step(
    state: tauri::State<'_, AppState>,
) -> Result<AutopilotStepResult, CommandError> {
    // 1. Lock server state to inspect session.iteration_count
    let mut session_guard = state.autopilot.current_session.lock().map_err(|_| {
        CommandError::Internal("Failed to acquire session lock".into())
    })?;

    let session = session_guard.as_mut().ok_or_else(|| {
        CommandError::InvalidState("No active autopilot session. Call start_autopilot first.".into())
    })?;

    // 2. Server-side Gate: Iteration 1+ strictly requires Pro
    if session.iteration_count >= 1 && !state.license.is_pro() {
        return Err(CommandError::ProRequired(
            "Multi-iteration self-healing Autopilot requires an active Unfuse Pro license.".into()
        ));
    }

    // 3. Execution: Free single pass vs Pro self-healing engine
    let step_result = if session.iteration_count >= 1 {
        // Dispatches to Arc<dyn ProEngine> (RealProEngine or StubProEngine)
        state.pro_engine.execute_autopilot_step(&session.goal)?
    } else {
        // Free core single-pass verification
        crate::autopilot::core_runner::execute_single_pass(&session.goal).await?
    };

    // 4. Increment server-side iteration counter ONLY on successful completion
    session.iteration_count += 1;

    Ok(AutopilotStepResult {
        session_id: session.session_id.clone(),
        iteration: session.iteration_count,
        success: step_result.success,
        output: step_result.output,
        healed: step_result.healed,
    })
}
```

---

### 2.5 GitHub Action Mirroring Workflow (`.github/workflows/mirror-public.yml`)

```yaml
name: mirror-public-build

on:
  push:
    branches:
      - main

jobs:
  verify-and-mirror:
    name: Verify Pro Build, Strip Proprietary Code, and Mirror
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Private Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.PRIVATE_REPO_PAT }}

      - name: Setup Rust Toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Setup Node.js & Dependencies
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Frontend Dependencies
        run: npm ci

      - name: Install Linux Desktop Dependencies (WebKitGTK, X11)
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            xvfb

      # 1. Verify that the private monorepo compiles with all Pro capabilities
      - name: Verify Full Pro Build
        run: |
          npm run build
          cargo check --manifest-path src-tauri/Cargo.toml --features pro
          cargo test --manifest-path src-tauri/Cargo.toml --features pro

      # 2. Strip the proprietary crate for the public mirror
      - name: Strip Pro Crate & Reconfigure Cargo
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"

          # Remove proprietary crate directory
          git rm -r --cached crates/unfuse-pro-core 2>/dev/null || true
          rm -rf crates/unfuse-pro-core

          # Strip optional pro dependency and feature from src-tauri/Cargo.toml
          sed -i '/unfuse-pro-core/d' src-tauri/Cargo.toml
          sed -i 's/pro = \["dep:unfuse-pro-core"\]/pro = []/g' src-tauri/Cargo.toml

          git add src-tauri/Cargo.toml
          git commit -m "chore: strip proprietary pro crate for public mirror" --allow-empty

      # 3. Verify public build compiles STANDALONE with zero pro code
      - name: Verify Public Build Compiles Standalone
        run: |
          cargo check --manifest-path src-tauri/Cargo.toml
          cargo build --manifest-path src-tauri/Cargo.toml

      # 4. Real Build-and-Boot Check (Headless X11)
      - name: Verify Desktop Binary Boots Cleanly
        run: |
          set +e
          timeout 8s xvfb-run ./src-tauri/target/debug/unfuse-desktop --verify-boot > /tmp/boot.log 2>&1
          EXIT_CODE=$?
          set -e

          cat /tmp/boot.log

          # Check for panics, missing symbol link errors, or unresolved crates
          if grep -qiE "panic|cannot find module|undefined symbol|unresolved import" /tmp/boot.log; then
            echo "::error::Public binary boot verification failed! Found critical runtime errors."
            exit 1
          fi

          # Exit 124 = killed by timeout, which is expected since GUI app waits for user input
          if [ "$EXIT_CODE" -ne 0 ] && [ "$EXIT_CODE" -ne 124 ]; then
            echo "::error::App exited unexpectedly with code $EXIT_CODE"
            exit 1
          fi

          echo "Public build verified clean — compiles and boots successfully with zero proprietary code."

      # 5. Push clean stripped branch to public repository
      - name: Push to Public Mirror Repository
        env:
          PUBLIC_REPO_TOKEN: ${{ secrets.PUBLIC_REPO_TOKEN }}
        run: |
          git config --local --unset-all http.https://github.com/.extraheader
          git remote add public https://x-access-token:${PUBLIC_REPO_TOKEN}@github.com/Unfuse-org/unfuse.git
          git push public main --force
```

---

### 2.5 Honest Evaluation: Cargo Workspace vs. Two-Repo Mirror

| Evaluation Metric | Single Public Repo with Feature Flags (`--features pro`) | Two-Repo CI Mirror (Private Monorepo $\rightarrow$ Public Repo) |
| :--- | :--- | :--- |
| **Intellectual Property Protection** | **FAIL**. If the proprietary crate code is committed to a public repository (even behind a feature flag), the source is visible to everyone on GitHub. Competitors can lift the heuristics immediately. | **EXCELLENT**. The proprietary crate only ever exists inside the private repository. The public repo contains zero lines of proprietary code. |
| **Piracy Resistance** | **FAIL**. Anyone can clone the repo and run `cargo build --features pro`, getting all Pro capabilities for free without a license key. | **EXCELLENT**. Free-tier users and open-source contributors literally do not have the Pro binary bytes or algorithms in their clone. |
| **Cargo Ecosystem Idiom** | Native Cargo feature flag convention, but completely unsuited for commercial open-core models where code cannot be public. | Standard industry open-core pattern (pioneered by GitLab, PostHog, HashiCorp, and `unit01pro`). |
| **Open-Source Contributor Experience** | Contributor can build, but seeing closed pro folders in a public repo causes confusion. | **Friction-Free**. Open-source contributors clone `Unfuse-org/unfuse`, run `npm install && npm run tauri dev`, and it builds out of the box with zero missing crate errors. |

**Verdict:** The **Two-Repo CI Mirror** is the only viable architectural choice. A single public repo with feature flags completely fails to protect the commercial codebase.
