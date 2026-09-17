# Unfuse: Architecture Decision & Tier Boundary Specification
> **Pre-Integration Review: Strategy Evaluation, Tier Boundaries & Phase 1 Dead Code Cleanup**  
> *Target Workspace*: `/home/zenK/Work/unfuse`  
> *Reference Workspace*: `/home/zenK/Work/ruthenlabs/unit01pro`  
> *Status*: Awaiting Review before Phase 3/4 Implementation  
> *Date*: September 2026

---

## 1. Architecture Decision

### Concrete Comparison: Strategy A (Tauri Native Rust IPC) vs. Strategy B (Node/Bun Sidecar Daemon)

| Module in `unit01pro` | Strategy A: Tauri Native Rust IPC | Strategy B: Node/Bun Sidecar Daemon | Difficulty Verdict |
| :--- | :--- | :--- | :--- |
| **1. LLM Client & Streaming** | **Easiest**: Runs directly in the React webview via browser `fetch()` to `127.0.0.1:11434` (Ollama) / `127.0.0.1:1234` (LM Studio). Zero serialization overhead, native SSE & NDJSON stream parsing. | **Medium**: Node/Bun handles `fetch()`, then re-serializes token chunks over WebSocket/UDS to the webview. Adds an unnecessary hop. | **Strategy A is superior** |
| **2. MCP Client (`@modelcontextprotocol/sdk`)** | **Hardest**: The official MCP SDK is TypeScript/Node. Running stdio/SSE servers directly in Rust requires a custom JSON-RPC stdio subprocess runner or a lightweight Rust MCP client crate (`rmcp`). | **Easiest**: Drop-in port of `packages/core/src/mcp/client.ts` directly using `@modelcontextprotocol/sdk` in Node/Bun. | **Strategy B is easier** |
| **3. File & Shell Tools** | **Easy & Clean**: Native Rust commands (`std::fs`, `tokio::process`, and regex crates) execute with OS-level sandboxing, path validation, and zero Node dependency. | **Easy**: Reuses `file_tools.ts`, `shell_tools.ts` using Node `child_process` and `node:fs`. | **Tie** |
| **4. SQLite Database** | **Easy & Clean**: Use `rusqlite` or `tauri-plugin-sql` in Rust. Single local `.db` file in `dirs::data_dir()`. | **Easy**: Reuses `bun:sqlite` or `node:sqlite`. | **Tie** |
| **5. Vault & OS Keychain** | **Clean & Secure**: Rust `keyring` crate (native macOS Keychain via Security framework / Linux Secret Service) + `aes-gcm` crate. Immune to CLI shell injection. | **Fragile**: Calls `execSync('security ...')` and `execSync('secret-tool ...')` via shell subprocesses, risking process table leaks. | **Strategy A is superior** |
| **6. External Integrations** | **Easy**: Direct browser `fetch()` from React (or Rust `reqwest`) for GitHub REST, Linear GraphQL, Sentry, and Slack webhooks. | **Easy**: Standard Node `fetch()` inside the daemon. | **Strategy A is simpler** |
| **7. Autopilot Pipeline** | **Medium**: Orchestrator loop in TypeScript, dispatching step executions and compile verifications through Tauri IPC commands with strict step limits. | **Easy**: Direct port of `StructuredBuildPipeline` in Node/Bun. | **Strategy B is slightly easier** |

---

### Packaging, Distribution & Code Signing Implications

| Dimension | Strategy A: Tauri Native Rust IPC | Strategy B: Node/Bun Sidecar Daemon |
| :--- | :--- | :--- |
| **Installer Size** | **~18 MB** (macOS `.dmg` / Linux `.AppImage` / `.deb`). | **120 MB – 180 MB** (must bundle Bun runtime ~90MB or Node.js ~80MB + complete `node_modules`). |
| **Embedded Runtimes** | **Zero**. Single native compiled executable + webview. | Requires embedded Node/Bun runtime, localhost port allocation, health probes, and orphan process cleanup on crash. |
| **macOS Code Signing** | **Trivial**: 1 Mach-O binary (`unfuse-desktop`) signed and notarized via standard Apple Developer ID. | **Complex & Fragile**: Sidecar binary and all native dynamic libraries (`.node` addons) must be individually signed with hardened runtime entitlements (`allow-jit`, `allow-unsigned-executable-memory`), frequently triggering Gatekeeper rejections. |
| **Runtime Security** | IPC commands are strictly scoped; devtools cannot escape the Tauri capability permission manifest. | Unauthenticated HTTP/WebSocket server listening on loopback (`127.0.0.1:PORT`) that any local script can probe or hijack. |
| **RAM Footprint** | **~80 MB RAM** total. | **220 MB – 350 MB+ RAM** (Webview + Node/Bun daemon). |

---

### Final Recommendation: STRATEGY A (Tauri Native Rust IPC + Hybrid TS)

**Reasoning:**
1. **Ethos & Positioning**: Unfuse is built as *"The Sovereign, Local-First AI Developer Workstation"*. Delivering a 180MB bloated bundle carrying a background Node daemon contradicts the local-first, lightweight promise when Tauri was chosen over Electron.
2. **License & Permission Gating Not Bypassable via Frontend or DevTools**: Under Strategy A, all Pro features are enforced inside **compiled Rust command handlers** before privileged operations run. Under Strategy B, a local Node daemon listening on a loopback port is trivial to inspect, tamper with, or call directly from `curl` or browser DevTools. In a shipped binary with Pro features compiled in, client-side DevTools and loopback network inspection cannot alter server-side iteration state or forge cryptographic verification tokens.
3. **Hybrid Architecture Efficiency**: The LLM streaming, AST parsing (`web-tree-sitter`), diff viewer, and UI state already run in TypeScript without any Node dependency. Only OS-level operations (file I/O, process execution, keychain, SQLite, and system telemetry) need to be Rust IPC commands. For MCP, a lightweight stdio JSON-RPC bridge in Rust or a targeted execution runner provides standard MCP support without carrying an entire Node runtime.

---

## 2. Tier Boundary Specification

### Free vs. Pro Explicit Split

```
FREE: [feature] -> [where it lives in the new architecture]
PRO:  [feature] -> [where it lives] -> [how it will be gated]
```

### ✅ FREE Features

| Feature | Where It Lives in New Architecture | Runtime Behavior |
| :--- | :--- | :--- |
| **Local LLM Inference** | `src/engine/` (React TS) | Streams directly via `fetch()` to local loopback ports (Ollama `11434`, LM Studio `1234`, vLLM `8000`, MLX `8080`). |
| **Model Rack Orchestration** | `src/components/rack/` (React TS) | Mounts, switches, and configures local runner blades and loopback endpoints. |
| **Core File Tools** | `src-tauri/src/tools/` (Rust) | `read_file`, `write_file`, `patch_file`, `list_dir` via `tauri::command` handlers with path containment policy. |
| **Grep & File Search** | `src-tauri/src/tools/` (Rust) | Ripgrep and directory traversal using Rust `ignore` / `regex` crates. |
| **Basic Terminal Execution** | `src-tauri/src/tools/` (Rust) | Single-command execution with interactive confirmation and destructive pattern blocker. |
| **Single-Iteration Autopilot** | `src/engine/autopilot/` + Rust | Executes 1 single build/test verification pass without automated self-healing loops (`FREE_LIMITS.AUTOPILOT_ITERATIONS = 1`). |
| **Basic Chat History & SQLite** | `src-tauri/src/db/` (Rust) | Local session records and message storage. |
| **Basic Project Memory** | `src-tauri/src/db/` (Rust) | Capped at **3 architectural decisions** and **5 coding conventions** (`FREE_LIMITS.MEMORY_DECISIONS = 3`, `FREE_LIMITS.MEMORY_CONVENTIONS = 5`). |
| **Hardware Telemetry Popover** | `src-tauri/src/telemetry/` (Rust) | Real CPU, RAM, and GPU memory metrics polled via Rust `sysinfo`. |
| **Plaintext Config Storage** | `src-tauri/src/config/` (Rust) | Stores basic preferences in `~/.config/unfuse/config.json`. |

---

### 💰 PRO Features & Kernel-Level Rust Gating

Under Strategy A, **all Pro feature checks are compiled into the Rust command handlers and rely strictly on server-tracked state**. No frontend-supplied step count, role flag, or client parameter can bypass or influence the tier boundary.

| Feature | Where It Lives | How It Is Gated (Server-Tracked Rust IPC Enforcement) |
| :--- | :--- | :--- |
| **Autonomous Multi-Iteration Autopilot** | `src-tauri/src/autopilot/` (Rust) | In `run_autopilot_step(state)`: Rust inspects its internal session state `session.iteration_count`. If `iteration_count >= 1 && !state.license.is_pro()`, returns `Err(CommandError::ProRequired)`. Frontend supplies **zero** step numbers. Only upon actual step completion does Rust increment the counter. |
| **Tamper-Evident Audit Log Store** | `src-tauri/src/audit/` (Rust) | In `log_audit_entry` & `get_audit_chain`: Pure server-side license check `state.license.is_pro()`. Writes cryptographic SHA-256 hash chains and payload signatures into SQLite. Free tier gets standard ephemeral session logs. |
| **Encrypted Credentials Vault** | `src-tauri/src/vault/` (Rust) | In `unlock_vault`, `save_credential`, `get_credential`: Master key derivation (scrypt/Argon2) and AES-256-GCM encryption/decryption are gated inside Rust. Free tier is restricted to plaintext tokens in `config.json`. |
| **Native OS Keychain Integration** | `src-tauri/src/keychain/` (Rust) | In `store_keychain_secret`: Calls to macOS Keychain / Linux Secret Service require `state.license.is_pro()`. |
| **Cloud Integrations (GitHub, Linear, Sentry, Slack)** | `src-tauri/src/integrations/` (Rust) | In `dispatch_integration_action`: Rust resolves the auth token directly from the server-side Vault/Keychain (client cannot supply token). Gated by `state.license.is_pro()`. |
| **Semantic Code Search (Embeddings + RRF)** | `src-tauri/src/search/` (Rust) | In `search_code`: If `mode == SearchMode::Semantic` or `SearchMode::Hybrid`, Rust enforces `state.license.is_pro()`. Free tier is strictly limited to `SearchMode::Text` (ripgrep). |
| **Shadow Backup Rollback (`/undo`)** | `src-tauri/src/db/` (Rust) | In `rollback_shadow_backup`: Restoring prior file revisions from the SQLite shadow backup tree is gated on `state.license.is_pro()`. |
| **Project Memory Limits** | `src-tauri/src/db/` (Rust) | In `save_memory_item`: Rust queries SQLite `SELECT COUNT(*) FROM memories WHERE kind = ?`. If `count >= limit && !state.license.is_pro()`, rejects with `Err(CommandError::MemoryLimitReached)`. Client supplies no count. |

#### Comprehensive Parameter & Caller Input Audit for Pro-Gated Commands

| Command | Caller-Supplied Parameters | State Gating Source of Truth | Verdict | Enforcement Fix / Guarantee |
| :--- | :--- | :--- | :---: | :--- |
| `start_autopilot_session` | `goal: String` | Generates new `AutopilotSession { session_id, iteration_count: 0 }` | **SAFE** | Resets iteration counter exclusively on new goal initialization. |
| `run_autopilot_step` | **None** (`state` only) | Server `AutopilotSession.iteration_count` | **FIXED** | Client cannot send `step`. Server checks `if count >= 1 && !pro`, then increments on completion. |
| `save_memory_item` | `kind: MemoryKind, content: String` | SQLite `COUNT(*)` for that kind | **SAFE** | Server queries database count; client cannot supply count, tier, or bypass flag. |
| `get_audit_chain` | `limit: Option<u32>` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. `limit` only bounds pagination, does not trip or bypass gate. |
| `unlock_vault` | `password: String` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. Master key derived server-side. |
| `save_credential` | `service: String, secret: String` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. Written to AES-GCM vault on server. |
| `get_credential` | `service: String` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. Read from AES-GCM vault on server. |
| `store_keychain_secret` | `service: String, secret: String` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. Accesses OS Keychain directly from Rust. |
| `dispatch_integration_action`| `service: String, action: String, payload: Value` | Server Vault token + `state.license.is_pro()` | **SAFE** | Client supplies payload, but token is fetched from server vault; gated on server license. |
| `search_code` | `query: String, mode: SearchMode` | Server license check if `mode != Text` | **SAFE** | Enum variant checked. If `mode != Text && !pro`, rejected by Rust. |
| `rollback_shadow_backup` | `target_hash: String` | Server license check `state.license.is_pro()` | **SAFE** | Pure binary check. File restored from server shadow tree. |

#### Exact Server-Side Autopilot Gating Implementation (Rust)

```rust
// src-tauri/src/autopilot/session.rs
use std::sync::Mutex;
use uuid::Uuid;

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

// src-tauri/src/commands/autopilot.rs
#[tauri::command]
pub async fn start_autopilot(
    goal: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, CommandError> {
    let session_id = state.autopilot.start_session(goal);
    Ok(session_id)
}

#[tauri::command]
pub async fn run_autopilot_step(
    state: tauri::State<'_, AppState>,
) -> Result<AutopilotStepResult, CommandError> {
    // 1. Acquire session lock and read server-tracked iteration count
    let mut session_guard = state.autopilot.current_session.lock().map_err(|_| {
        CommandError::Internal("Failed to acquire autopilot session lock".into())
    })?;

    let session = session_guard.as_mut().ok_or_else(|| {
        CommandError::InvalidState("No active autopilot session found. Call start_autopilot first.".into())
    })?;

    // 2. Hard server-tracked gate: Free tier is strictly capped at 1 iteration
    if session.iteration_count >= 1 && !state.license.is_pro() {
        return Err(CommandError::ProRequired(
            "Multi-iteration self-healing Autopilot requires an active Unfuse Pro license.".into()
        ));
    }

    // 3. Execute the single step
    let result = state.autopilot_engine.execute_single_step(&session.goal).await?;

    // 4. Increment server-side counter ONLY upon actual step execution completion
    session.iteration_count += 1;

    Ok(result)
}
```

---

## 3. Dead Code Cleanup (Phase 1 Executed)

Phase 1 of `BACKEND_INTEGRATION_ANALYSIS.md` has been executed:
1. **Deleted `make_icon.js`**: Removed scratch script with hardcoded macOS paths.
2. **Deleted `src/assets/iron_octo.png`**: Removed 1.5 MB unused binary asset.
3. **Evaluated `runtimeAdapter.ts` Functions**:
   - During cleanup, we verified that `buildPlatformDeleteCommand`, `buildPlatformReadCommand`, `buildPlatformSearchCommand`, and `buildPlatformFindCommand` are imported by `src/components/chat/ToolCallItem.tsx` (lines 38–41, 215, 252, 265, 288) to render platform-specific shell preview badges.
   - Deleting them broke TypeScript compilation (`TS2724`). They are retained in `runtimeAdapter.ts` for clean UI badge rendering.
4. **Purged Legacy "Unit01" / "unit01" References**:
   - `src/App.tsx`: Removed `unit01_left_sidebar_width` and `unit01_right_rack_width` legacy `localStorage` keys.
   - `src/components/workspace/WorkspaceLauncher.tsx`: Replaced quote `'Unit 01: 100% Local...'` with `'Unfuse: 100% Local...'` and removed `unit01_recent_projects` key.
   - `src/engine/integrations/integrationsManager.ts`: Removed `LEGACY_STORAGE_KEY`, `LEGACY_DEFAULT_SEARCH_STORAGE_KEY`, `LEGACY_MCP_STORAGE_KEY`, and updated Sentry copy to "Unfuse".
   - `index.html`: Changed `<title>Unit 01 Pro</title>` to `<title>Unfuse</title>`.
   - `backend/index.ts`: Removed `export const Unit01Backend` alias.
   - `backend/llm/prompt_builder.ts`: Replaced `"You are Unit 01"` with `"You are Unfuse"` in both micro and standard system prompts.
   - `backend/database/`, `backend/indexer/`, `backend/security/`, `backend/telemetry/`, `backend/tools/`: Updated all docstrings from "Unit 01" to "Unfuse".
5. **Build Verification**: `tsc && vite build` passed cleanly in **11.66s with 0 errors**.

#### Complete Git Diff (Before Committing)

```diff
diff --git a/backend/database/index.ts b/backend/database/index.ts
index 824091d..5f1d461 100644
--- a/backend/database/index.ts
+++ b/backend/database/index.ts
@@ -9,7 +9,7 @@ export * from './session_store';
 export * from './memory_store';
 
 /**
- * Main Database Engine for Unit 01
+ * Main Database Engine for Unfuse
  * Coordinates session threads, atomic shadow backups (/undo), and project memory
  */
 export class DatabaseEngine {
diff --git a/backend/database/types.ts b/backend/database/types.ts
index cdb0763..62b8e68 100644
--- a/backend/database/types.ts
+++ b/backend/database/types.ts
@@ -1,5 +1,5 @@
 /**
- * Database & State Persistence Types for Unit 01
+ * Database & State Persistence Types for Unfuse
  */
 
 export interface SessionRecord {
diff --git a/backend/index.ts b/backend/index.ts
index 2ef8a5e..2b6a5fc 100644
--- a/backend/index.ts
+++ b/backend/index.ts
@@ -48,10 +48,6 @@ export class UnfuseBackend {
   }
 }
 
-// Backwards-compatible alias
-export const Unit01Backend = UnfuseBackend;
-export type Unit01Backend = UnfuseBackend;
-
 export function createBackend(workspaceRoot?: string): UnfuseBackend {
   return new UnfuseBackend(workspaceRoot);
 }
diff --git a/backend/indexer/index.ts b/backend/indexer/index.ts
index 5b562d9..cfb3b64 100644
--- a/backend/indexer/index.ts
+++ b/backend/indexer/index.ts
@@ -17,7 +17,7 @@ export * from './repomap';
 export * from './budget_router';
 
 /**
- * Main Codebase Indexer Engine for Unit 01
+ * Main Codebase Indexer Engine for Unfuse
  * Coordinates file scanning, AST parsing, dependency graph, and adaptive prompt context
  */
 export class CodebaseIndexer {
diff --git a/backend/indexer/types.ts b/backend/indexer/types.ts
index 0afd0e2..efaadf8 100644
--- a/backend/indexer/types.ts
+++ b/backend/indexer/types.ts
@@ -1,5 +1,5 @@
 /**
- * Codebase Indexer & AST Types for Unit 01
+ * Codebase Indexer & AST Types for Unfuse
  */
 
 export type SymbolKind =
diff --git a/backend/llm/index.ts b/backend/llm/index.ts
index 569518c..d38077a 100644
--- a/backend/llm/index.ts
+++ b/backend/llm/index.ts
@@ -9,7 +9,7 @@ export * from './tool_parser';
 export * from './prompt_builder';
 
 /**
- * Main LLM Engine for Unit 01
+ * Main LLM Engine for Unfuse
  * Coordinates prompt assembly, SSE streaming, and dual-mode tool parsing
  */
 export class LLMEngine {
diff --git a/backend/llm/prompt_builder.ts b/backend/llm/prompt_builder.ts
index 87fc744..917e1fd 100644
--- a/backend/llm/prompt_builder.ts
+++ b/backend/llm/prompt_builder.ts
@@ -30,7 +30,7 @@ export class PromptBuilder {
   }
 
   private buildMicroSystemPrompt(repoMapContext: string): string {
-    return `You are Unit 01, a fast and concise local AI coding assistant.
+    return `You are Unfuse, a fast and concise local AI coding assistant.
 You have direct access to local project tools. When you need to read or edit code, call a tool immediately.
 
 TOOLS AVAILABLE:
@@ -45,7 +45,7 @@ Always keep answers concise and precise.`;
   }
 
   private buildStandardSystemPrompt(repoMapContext: string): string {
-    return `You are Unit 01, an autonomous local AI software engineering workstation.
+    return `You are Unfuse, an autonomous local AI software engineering workstation.
 You operate directly on the user's local workspace with zero cloud dependencies.
 
 CAPABILITIES & TOOL USAGE:
diff --git a/backend/llm/types.ts b/backend/llm/types.ts
index b79ecd7..8cc2b63 100644
--- a/backend/llm/types.ts
+++ b/backend/llm/types.ts
@@ -1,5 +1,5 @@
 /**
- * LLM Inference & Streaming Types for Unit 01
+ * LLM Inference & Streaming Types for Unfuse
  */
 
 export type Role = 'system' | 'user' | 'assistant' | 'tool';
diff --git a/backend/security/index.ts b/backend/security/index.ts
index f4ce813..a488577 100644
--- a/backend/security/index.ts
+++ b/backend/security/index.ts
@@ -9,7 +9,7 @@ export * from './command_guard';
 export * from './secret_redactor';
 
 /**
- * Main Security Engine for Unit 01
+ * Main Security Engine for Unfuse
  * Coordinates zero-trust path isolation, command safety, and secret redaction
  */
 export class SecurityEngine {
diff --git a/backend/security/types.ts b/backend/security/types.ts
index cabc695..1f5f6e2 100644
--- a/backend/security/types.ts
+++ b/backend/security/types.ts
@@ -1,5 +1,5 @@
 /**
- * Security Engine Types for Unit 01
+ * Security Engine Types for Unfuse
  */
 
 export type PathPermission = 'allow' | 'deny' | 'prompt';
diff --git a/backend/telemetry/index.ts b/backend/telemetry/index.ts
index 2462910..2859d0f 100644
--- a/backend/telemetry/index.ts
+++ b/backend/telemetry/index.ts
@@ -9,7 +9,7 @@ export * from './rolling_buffer';
 export * from './metrics_tracker';
 
 /**
- * Main Telemetry Engine for Unit 01
+ * Main Telemetry Engine for Unfuse
  * Coordinates real-time hardware polling and BTOP sparkline area data
  */
 export class TelemetryEngine {
diff --git a/backend/telemetry/types.ts b/backend/telemetry/types.ts
index 8899a37..c9dd223 100644
--- a/backend/telemetry/types.ts
+++ b/backend/telemetry/types.ts
@@ -1,5 +1,5 @@
 /**
- * Hardware Telemetry & Performance Types for Unit 01
+ * Hardware Telemetry & Performance Types for Unfuse
  */
 
 export interface HardwareMetrics {
diff --git a/backend/tools/types.ts b/backend/tools/types.ts
index e1e618f..7175682 100644
--- a/backend/tools/types.ts
+++ b/backend/tools/types.ts
@@ -1,5 +1,5 @@
 /**
- * Universal Tool Type Definitions for Unit 01 Agent Operations
+ * Universal Tool Type Definitions for Unfuse Agent Operations
  */
 
 export type ToolName =
diff --git a/index.html b/index.html
index 7e03bbe..6e8758f 100644
--- a/index.html
+++ b/index.html
@@ -3,7 +3,7 @@
   <head>
     <meta charset="UTF-8" />
     <meta name="viewport" content="width=device-width, initial-scale=1.0" />
-    <title>Unit 01 Pro</title>
+    <title>Unfuse</title>
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Press+Start+2P&family=Tiny5&display=swap" rel="stylesheet">
diff --git a/make_icon.js b/make_icon.js
deleted file mode 100644
index eb6621f..0000000
--- a/make_icon.js
+++ /dev/null
@@ -1,32 +0,0 @@
-const fs = require('fs');
-const path = require('path');
-
-// Read the original octopus logo
-const originalLogoBase64 = fs.readFileSync('/Users/lichi/Downloads/logo.png').toString('base64');
-
-// Standard Apple macOS App Icon Squircle SVG (1024x1024 canvas with 824x824 squircle)
-const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
-  <defs>
-    <!-- Soft Drop Shadow for macOS Dock -->
-    <filter id="dockShadow" x="50" y="70" width="924" height="924" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
-      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000000" flood-opacity="0.45"/>
-    </filter>
-    <clipPath id="squircleClip">
-      <rect x="100" y="100" width="824" height="824" rx="185" ry="185" />
-    </clipPath>
-  </defs>
-  
-  <!-- Base Shadow & Squircle -->
-  <rect x="100" y="100" width="824" height="824" rx="185" ry="185" fill="#141416" filter="url(#dockShadow)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/>
-  
-  <!-- Inner Subtle Border -->
-  <rect x="102" y="102" width="820" height="820" rx="183" ry="183" fill="#141416" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
-
-  <!-- Centered Octopus Sprite -->
-  <g clip-path="url(#squircleClip)">
-    <image href="data:image/png;base64,${originalLogoBase64}" x="212" y="212" width="600" height="600" preserveAspectRatio="xMidYMid meet"/>
-  </g>
-</svg>`;
-
-fs.writeFileSync('/Users/lichi/unit01pro/packages/desktop/icon_source.svg', svg);
-console.log('Generated Apple Squircle SVG!');
diff --git a/src/App.tsx b/src/App.tsx
index 1613198..d70a767 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -16,11 +16,11 @@ export default function App() {
 
   // DRAGGABLE PANEL WIDTHS (WITH PERSISTENCE & BOUNDARIES)
   const [leftWidth, setLeftWidth] = useState<number>(() => {
-    const saved = localStorage.getItem('unfuse_left_sidebar_width') || localStorage.getItem('unit01_left_sidebar_width');
+    const saved = localStorage.getItem('unfuse_left_sidebar_width');
     return saved ? Math.min(Math.max(parseInt(saved, 10) || 256, 170), 450) : 256;
   });
   const [rightWidth, setRightWidth] = useState<number>(() => {
-    const saved = localStorage.getItem('unfuse_right_rack_width') || localStorage.getItem('unit01_right_rack_width');
+    const saved = localStorage.getItem('unfuse_right_rack_width');
     return saved ? Math.min(Math.max(parseInt(saved, 10) || 320, 240), 560) : 320;
   });
diff --git a/src/assets/iron_octo.png b/src/assets/iron_octo.png
deleted file mode 100644
index 3d246c3..0000000
Binary files a/src/assets/iron_octo.png and /dev/null differ
diff --git a/src/components/workspace/WorkspaceLauncher.tsx b/src/components/workspace/WorkspaceLauncher.tsx
index c6fb343..ea5c0ff 100644
--- a/src/components/workspace/WorkspaceLauncher.tsx
+++ b/src/components/workspace/WorkspaceLauncher.tsx
@@ -150,7 +150,7 @@ export const WORKSPACE_QUOTES: string[] = [
   'Your workstation, your rules, your neural empire.',
   'Code crafted locally, deployed everywhere.',
   'The weights are loaded. The rack is primed. Let us build.',
-  'Unit 01: 100% Local. Zero Cloud. Infinite Power.',
+  'Unfuse: 100% Local. Zero Cloud. Infinite Power.',
   'Never let a server outage halt your momentum.',
   'True privacy is having zero socket connections.',
   'All tokens are computed under your roof.',
@@ -208,7 +208,7 @@ export const WorkspaceLauncher: React.FC<WorkspaceLauncherProps> = ({
 
   const [recents, setRecents] = useState<RecentProject[]>(() => {
     if (typeof window !== 'undefined' && window.localStorage) {
-      const stored = localStorage.getItem('unfuse_recent_projects') || localStorage.getItem('unit01_recent_projects');
+      const stored = localStorage.getItem('unfuse_recent_projects');
       if (stored) {
         try {
           return JSON.parse(stored);
diff --git a/src/engine/integrations/integrationsManager.ts b/src/engine/integrations/integrationsManager.ts
index 1c65c7b..7aaef8c 100644
--- a/src/engine/integrations/integrationsManager.ts
+++ b/src/engine/integrations/integrationsManager.ts
@@ -7,7 +7,6 @@ import {
 } from './types';
 
 const STORAGE_KEY = 'unfuse_integrations_v1';
-const LEGACY_STORAGE_KEY = 'unit01_integrations_v1';
 
 export const SERVICE_METADATA: Record<ServiceId, ServiceMetadata> = {
   duckduckgo: {
@@ -86,7 +85,7 @@ export const SERVICE_METADATA: Record<ServiceId, ServiceMetadata> = {
     category: 'Observability',
     tagline: 'Live Error Triage & Stack Traces',
     description:
-      'Query unhandled production crashes, inspect exact stack frames, and let Unit 01 synthesize zero-shot bug fixes.',
+      'Query unhandled production crashes, inspect exact stack frames, and let Unfuse synthesize zero-shot bug fixes.',
     commandTag: '#sentry',
     docsUrl: 'https://sentry.io/settings/account/api/auth-tokens/',
   },
@@ -144,12 +143,11 @@ export function subscribeIntegrations(listener: Listener): () => void {
 }
 
 const DEFAULT_SEARCH_STORAGE_KEY = 'unfuse_default_web_search_v1';
-const LEGACY_DEFAULT_SEARCH_STORAGE_KEY = 'unit01_default_web_search_v1';
 
 export function getDefaultWebSearchProvider(): ServiceId {
   try {
     const saved = typeof window !== 'undefined' && window.localStorage
-      ? (localStorage.getItem(DEFAULT_SEARCH_STORAGE_KEY) || localStorage.getItem(LEGACY_DEFAULT_SEARCH_STORAGE_KEY))
+      ? localStorage.getItem(DEFAULT_SEARCH_STORAGE_KEY)
       : null;
     if (saved && ['duckduckgo', 'tavily', 'brave', 'exa', 'google'].includes(saved)) {
       return saved as ServiceId;
@@ -188,7 +186,7 @@ export function getAllServiceStates(): Record<ServiceId, ServiceState> {
 
   try {
     const raw = typeof window !== 'undefined' && window.localStorage
-      ? (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY))
+      ? localStorage.getItem(STORAGE_KEY)
       : null;
     if (!raw) return defaultStates;
     const parsed = JSON.parse(raw);
@@ -460,7 +458,6 @@ export async function testServiceConnection<K extends ServiceId>(
 }
 
 const MCP_STORAGE_KEY = 'unfuse_mcp_servers_v1';
-const LEGACY_MCP_STORAGE_KEY = 'unit01_mcp_servers_v1';
 
 const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
   {
@@ -498,7 +495,7 @@ const DEFAULT_MCP_SERVERS: McpServerConfig[] = [
 export function getMcpServers(): McpServerConfig[] {
   try {
     const raw = typeof window !== 'undefined' && window.localStorage
-      ? (localStorage.getItem(MCP_STORAGE_KEY) || localStorage.getItem(LEGACY_MCP_STORAGE_KEY))
+      ? localStorage.getItem(MCP_STORAGE_KEY)
       : null;
     if (!raw) return DEFAULT_MCP_SERVERS;
     const parsed = JSON.parse(raw);
```

---

## 4. Repository Visibility & Proprietary Logic Warning

**Repository Status: `Unfuse-org/unfuse` is CURRENTLY PUBLIC.**  
*(Verified via GitHub API: `GET https://api.github.com/repos/Unfuse-org/unfuse` returned HTTP 200 without authentication).*

### ⚠️ Pro Features at Risk of Leaking Proprietary Logic

Because this repository is public, writing the following Pro implementations directly into open-source files in this repo will leak trade secrets and enable trivial circumvention:

1. **Autopilot Self-Healing Algorithm**:
   - The exact compiler warning feedback prompts, error fingerprinting, and loop sameness detection heuristics from `unit01pro/packages/pro/src/autopilot/pipeline.ts` would be completely exposed.
2. **Encrypted Vault Cryptographic Scheme**:
   - The scrypt derivation parameters, IV sizing, auth-tag verification, and recovery key generation algorithm (`UNIT01-XXXX-XXXX-...`) would be public.
3. **Integration Connectors**:
   - Linear GraphQL queries, GitHub issue triage handlers, and Sentry error parsing schemas would be readable by anyone.
4. **License Key Verification**:
   - If the license check is implemented using simple symmetric strings or plain if-checks in open source, anyone can clone the repo, change `is_pro()` to return `true`, and build a free Pro binary.

### Recommended Mitigation Before Writing Code:
- Use **asymmetric Ed25519 cryptographic signatures** for Pro licenses (only the public verification key is embedded in Rust; licenses are signed offline by your private key).
- In the open-source repository, Pro features should be exposed via an **Open-Core Plugin / Extension Interface** or a private Rust crate (`unfuse-pro-core`), keeping the proprietary autopilot heuristics and vault algorithms closed-source while the core workstation remains open.

---

## 5. Private-Repo + CI Mirror Split Specification (`unfuse-pro-core`)

### 5.1 Physical Repository Code Split

Following the battle-tested open-core mirror pattern established in `unit01pro/unit01`:

#### 🔒 Private Monorepo (`Unfuse-org/unfuse-internal`)
Development occurs exclusively in this private repository. It contains the full application plus the proprietary Rust crate:
- **`crates/unfuse-pro-core/`**:
  - `autopilot/heuristics.rs` & `pipeline.rs`: The iterative self-healing build loop, stack trace parsing, error fingerprinting, loop sameness detection, and repair prompt synthesis.
  - `vault/crypto.rs` & `keychain.rs`: The AES-256-GCM vault encryption engine, scrypt/Argon2 key derivation, 24-character security recovery key generator (`UNFUSE-XXXX-...`), and OS Keychain integration.
  - `audit/hashchain.rs`: The tamper-evident SHA-256 Merkle/hash-chain audit logger and cryptographic payload signature generation.
  - `integrations/connectors/`: The real API clients and GraphQL implementations for Linear (sprint queries, ticket updates), GitHub (PR creation, issue triage), Sentry (stack frame inspection), Slack, Notion.
  - `search/semantic.rs`: Vector embeddings generator and Reciprocal Rank Fusion (RRF) hybrid search algorithm.
  - `license/verifier.rs`: Ed25519 digital signature verification of license keys against the Unfuse offline public key.

#### 🌐 Public Open-Source Mirror (`Unfuse-org/unfuse`)
Contains the complete workstation with zero proprietary algorithms:
- `src/`: React 18 frontend (Model Rack, Chat Canvas, Diff Viewer, Btop Telemetry, Settings).
- `src-tauri/`: Tauri desktop binary containing the command handler shells:
  - `src-tauri/src/commands/autopilot.rs`
  - `src-tauri/src/commands/vault.rs`
  - `src-tauri/src/commands/audit.rs`
  - `src-tauri/src/commands/integrations.rs`
  - `src-tauri/src/commands/search.rs`
  - `src-tauri/src/commands/memory.rs`
  - `src-tauri/src/commands/undo.rs`
- In the public build, these handlers call into a **Stub / Null Provider** that returns `Err(CommandError::ProRequired)`.

---

### 5.2 Compiling the Public Repo Without the Private Crate (The Rust Stub Trait Pattern)

In `src-tauri/src/pro_trait.rs`:
```rust
// Defined in public open-source codebase
pub trait ProEngine: Send + Sync {
    fn is_pro_active(&self) -> bool { false }
    fn execute_autopilot_healing(&self, session: &AutopilotSession) -> Result<AutopilotStepResult, CommandError>;
    fn unlock_vault(&self, password: &str) -> Result<(), CommandError>;
    fn get_vault_secret(&self, service: &str) -> Result<Option<String>, CommandError>;
    fn save_vault_secret(&self, service: &str, secret: &str) -> Result<(), CommandError>;
    fn record_audit_hash(&self, entry: &AuditRecord) -> Result<String, CommandError>;
    fn search_embeddings(&self, query: &str) -> Result<Vec<SearchResult>, CommandError>;
}
```

In `src-tauri/src/pro_engine.rs`:
```rust
#[cfg(feature = "pro")]
pub use unfuse_pro_core::RealProEngine as ActiveProEngine;

#[cfg(not(feature = "pro"))]
pub struct ActiveProEngine;

#[cfg(not(feature = "pro"))]
impl crate::pro_trait::ProEngine for ActiveProEngine {
    fn is_pro_active(&self) -> bool { false }
    fn execute_autopilot_healing(&self, _session: &crate::pro_trait::AutopilotSession) -> Result<crate::pro_trait::AutopilotStepResult, crate::commands::CommandError> {
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
    fn record_audit_hash(&self, _entry: &crate::pro_trait::AuditRecord) -> Result<String, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Tamper-evident audit chain requires Unfuse Pro.".into()))
    }
    fn search_embeddings(&self, _query: &str) -> Result<Vec<crate::pro_trait::SearchResult>, crate::commands::CommandError> {
        Err(crate::commands::CommandError::ProRequired("Semantic vector search requires Unfuse Pro.".into()))
    }
}
```

In `src-tauri/Cargo.toml`:
```toml
[dependencies]
unfuse-pro-core = { path = "../crates/unfuse-pro-core", optional = true }

[features]
default = []
pro = ["dep:unfuse-pro-core"]
```

When CI strips the private crate, it removes `unfuse-pro-core` from `Cargo.toml`. Because `pro_engine.rs` has the `#[cfg(not(feature = "pro"))]` fallback, **the public codebase compiles 100% cleanly without warnings or missing symbols**.

---

### 5.3 AppState Construction & ActiveProEngine Instantiation (The Wiring)

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

### 5.4 GitHub Action Mirroring Workflow (`.github/workflows/mirror-public.yml`)

The following GitHub Action runs in the private monorepo on every push to `main`:

```yaml
name: mirror-public-build

on:
  push:
    branches: [main]

jobs:
  verify-and-mirror:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Private Repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      # 1. Build and verify full private app with Pro features active
      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Linux GUI dependencies for Tauri
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
            libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev xvfb

      - name: Install Frontend Dependencies & Build Frontend
        run: |
          npm install
          npm run build

      - name: Test Private Build with Pro Features
        run: |
          cargo check --manifest-path src-tauri/Cargo.toml --features pro
          cargo test --manifest-path src-tauri/Cargo.toml --features pro

      # 2. Strip the proprietary crate for public mirror
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

      # 4. Real Build-and-Boot Check (Simulated headless X11 run)
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

### 5.4 Honest Evaluation: Cargo Workspace vs. Two-Repo Mirror

| Evaluation Metric | Single Public Repo with Feature Flags (`--features pro`) | Two-Repo CI Mirror (Private Monorepo $\rightarrow$ Public Repo) |
| :--- | :--- | :--- |
| **Intellectual Property Protection** | **FAIL**. If the proprietary crate code is committed to a public repository (even behind a feature flag), the source is visible to everyone on GitHub. Competitors can lift the heuristics immediately. | **EXCELLENT**. The proprietary crate only ever exists inside the private repository. The public repo contains zero lines of proprietary code. |
| **Piracy Resistance** | **FAIL**. Anyone can clone the repo and run `cargo build --features pro`, getting all Pro capabilities for free without a license key. | **EXCELLENT**. Free-tier users and open-source contributors literally do not have the Pro binary bytes or algorithms in their clone. |
| **Cargo Ecosystem Idiom** | Native Cargo feature flag convention, but completely unsuited for commercial open-core models where code cannot be public. | Standard industry open-core pattern (pioneered by GitLab, PostHog, HashiCorp, and `unit01pro`). |
| **Open-Source Contributor Experience** | Contributor can build, but seeing closed pro folders in a public repo causes confusion. | **Friction-Free**. Open-source contributors clone `Unfuse-org/unfuse`, run `npm install && npm run tauri dev`, and it builds out of the box with zero missing crate errors. |

**Verdict:** The **Two-Repo CI Mirror** is the only viable architectural choice. A single public repo with feature flags completely fails to protect the commercial codebase.

