# Unfuse: Backend Integration & Dead Code Analysis
> **Comprehensive Comparative Audit: `unfuse` Desktop vs. `unit01pro` CLI**  
> *Target Workspace*: `/home/zenK/Work/unfuse`  
> *Reference Workspace*: `/home/zenK/Work/ruthenlabs/unit01pro`  
> *Generated*: September 2026

---

## 1. Executive Summary

**Unfuse** is conceived as a sovereign, local-first AI developer workstation packaged with Tauri v2, React 18, and Tailwind CSS. Visually, it features a polished dark-mode interface with collapsible sidebars, a modular model rack, btop-style telemetry graphs, diff viewers, and integration dialogs.

However, an in-depth architectural audit reveals that **the backend is completely decoupled and inactive**:
1. **100% Mocked UI**: When messages or `#` commands are dispatched from the canvas (`ChatPanel.tsx`), the application does not execute any AI model, tool, or integration. Instead, it runs hardcoded `setTimeout` simulations that return canned text and fake diffs.
2. **Orphaned `backend/` Folder**: The `backend/` directory contains ~3,500 lines of TypeScript (LLM streaming, AST indexer, security guards, diff engine, file operations, hardware telemetry). Yet, **not a single file in `backend/` is imported by `src/`**.
3. **Runtime Mismatch**: The backend code relies on Node.js built-in APIs (`node:fs/promises`, `node:child_process`, `node:os`, `process.cwd()`, `fdir`), whereas the frontend is bundled by Vite for a browser webview environment where these modules do not exist.
4. **Reference Implementation in `unit01pro`**: The predecessor CLI tool (`unit01pro`) contains a battle-tested, fully functional autonomous agent loop, an authentic Model Context Protocol (MCP) client, encrypted vault/keychain security, persistent SQLite caching, real GitHub/Linear/Sentry integrations, and an autonomous "Autopilot" build-test-heal pipeline.

This document details all dead code in `unfuse`, provides a line-by-line comparison with `unit01pro`, analyzes the root causes of the backend decoupling, and lays out a concrete engineering plan to pair the backend into a fully functional workstation.

---

## 2. Comprehensive Dead Code & Orphaned Logic Audit

| Category | File / Path | Lines / Size | Current State & Reason for Dead Code |
| :--- | :--- | :--- | :--- |
| **Entire Orphaned Subsystem** | `backend/**` (26 files) | ~3,500 lines | **Completely unimported.** `src/` has zero imports from `backend/`. Not listed in `tsconfig.json` `include`. Cannot compile in Vite without Node polyfills or an IPC bridge. |
| **Root Scratch Script** | `make_icon.js` | 33 lines | Leftover utility script with hardcoded absolute macOS paths (`/Users/lichi/...`). Not referenced in `package.json` scripts or build pipelines. |
| **Unused Static Asset** | `src/assets/iron_octo.png` | 1.5 MB | High-resolution graphic sitting in assets; never imported or rendered anywhere in the application. |
| **Dead Runtime Functions** | `src/engine/runtimeAdapter.ts` | Lines 185–231 | Exported helper functions (`buildPlatformDeleteCommand`, `buildPlatformReadCommand`, `buildPlatformSearchCommand`, `buildPlatformFindCommand`) that are never imported or invoked anywhere. |
| **Simulated Adapter Function** | `src/engine/runtimeAdapter.ts` | Lines 19–107 (`buildProviderPayload`) | Implements full payload translation for Ollama/LM Studio/vLLM, but is never called by the UI. Only referenced as a mock string inside `ChatPanel.tsx:739`. |
| **Canned Mock Responses** | `src/components/chat/ChatPanel.tsx` | Lines 504–1150 (~650 lines) | The entire message submission logic (`handleSendMessage`) is a massive mock simulating clarification popups, `#github`, `#linear`, `#sentry`, `#search`, `#postgres`, and code diffs using hardcoded `setTimeout` timers. |
| **Mock Connection Testers** | `src/engine/integrations/integrationsManager.ts` | Lines 405–445, 614–639 | `testConnection` and `testMcpServerConnection` return fake `await new Promise(r => setTimeout(r, 220))` simulated delays rather than executing real network or process handshakes. |
| **Random Telemetry Generator** | `src/components/chat/BtopTelemetryPopover.tsx` | Lines 29–49 | Popover graphs generate random numbers via `Math.random()` on an interval instead of consuming real hardware data from `backend/telemetry/hardware.ts`. |
| **Unconnected Voice Component** | `src/components/chat/VoiceOrbSquare.tsx` | 55 lines | Visual component rendered in `ChatInput.tsx` with animated rings, but completely disconnected from any speech-to-text or audio backend. |
| **Volatile In-Memory Maps** | `backend/database/session_store.ts` & `shadow_backups.ts` | ~200 lines | Implemented with in-memory `Map<string, SessionRecord>`, causing all session data, history, and shadow backups to wipe on app reload. |
| **Legacy `unit01` Artifacts** | Multiple files | ~15 occurrences | Leftover references to legacy branding: `Unit01Backend` alias in `backend/index.ts`, `You are Unit 01...` in system prompts, and `localStorage` legacy fallback keys (`unit01_...`). |

---

## 3. Feature Comparison: `unfuse` vs. `unit01pro`

| Feature / Subsystem | Previous CLI (`unit01pro`) | Current Desktop (`unfuse`) | Gap & Required Work |
| :--- | :--- | :--- | :--- |
| **Agentic Loop** | **Active & Functional** (`packages/cli/src/index.tsx`). Streams tokens, parses XML/JSON tool calls, prompts for permissions, executes tools, feeds output back to LLM. | **Inactive / Simulated**. UI renders mock message with `setTimeout` (400–750ms). Real `LLMClient` exists in `backend/` but is never called. | Wire `ChatPanel` to `LLMClient` or backend orchestrator to execute real multi-turn streaming. |
| **Model Connectivity** | Connects to Ollama loopback (`/api/chat` and `/api/generate`) with automatic token streaming and tool definitions. | Has `buildProviderPayload()` in `runtimeAdapter.ts` and `LLMClient` in `backend/`, but UI does not initiate network calls. | Connect mounted rack blade configuration directly to the request executor. |
| **Model Context Protocol (MCP)** | **Real MCP Client** (`packages/core/src/mcp/client.ts`) using `@modelcontextprotocol/sdk`. Spawns stdio and SSE transports, introspects schemas, executes tools. | **UI Form Only** (`McpView.tsx`). Reads/writes JSON in `localStorage`. Connection test is a dummy `setTimeout(220)`. No real client SDK. | Integrate `@modelcontextprotocol/sdk` into the backend runner and wire exposed tools into the agent prompt. |
| **Filesystem & Tools** | **Active Native Execution** (`file_tools.ts`, `shell_tools.ts`, `search_tools.ts`). Real file slicing, unified diffs, Myers patching, ripgrep search, child process execution. | `backend/tools/` has real implementations, but they use Node `fs`/`child_process` and are never imported or invoked by the UI. | Expose native tool execution across the Tauri IPC bridge (`invoke('execute_tool')`) or backend daemon. |
| **Database & Persistence** | **Persistent SQLite** (`packages/core/src/database/db.ts`) with `bun:sqlite` / `node:sqlite`. Stores files, AST chunks, embeddings, shadow backups, and sessions in `~/.local/share/com.ruthenlabs.unit01`. | **Volatile In-Memory Maps** in `backend/database/` (`Map<string, any>`). The UI stores session UI state in React `useState(INITIAL_SESSIONS)` with dummy items. | Add SQLite persistence (via Tauri SQLite plugin, local SQLite file, or IndexedDB) for sessions, messages, and diff checkpoints. |
| **Autonomous Autopilot** | **Complete Build-Test-Heal Loop** (`packages/pro/src/autopilot/pipeline.ts`). Executes code edits, runs `npm test`/`cargo check`, captures errors, loops up to 8 iterations with sameness detection. | **None**. No autonomous execution loop or compile verification pipeline exists in `unfuse`. | Port `StructuredBuildPipeline` to run as an autonomous workstation task with live streaming UI output. |
| **External Integrations** | **Real API Connectors** (`packages/pro/src/connect/integrations/`): GitHub (issues/PRs), Linear (GraphQL), Slack, Sentry, Notion. | **UI Modal Only** (`ServiceConnectModal.tsx`). Stores tokens in `localStorage`. Command handlers in `ChatPanel.tsx` return hardcoded mock responses. | Port real API client implementations from `unit01pro` into the integration manager. |
| **Credentials & Security** | **Encrypted Vault & Keychain** (`packages/pro/src/connect/vault.ts` & `keychain.ts`). AES-256-GCM encrypted vault (`~/.unit01/credentials.json`) or macOS Keychain. | **Plaintext `localStorage`**. API keys and service configurations are saved unencrypted in browser `localStorage`. | Use OS Keychain (via Tauri plugin or keyring) or AES-GCM encrypted vault to safeguard API credentials. |
| **Audit Trail** | **Tamper-Proof SQLite Audit Store** (`packages/pro/src/audit/index.ts`). Logs service, operation, payload hashes, execution status, and timing. | **None**. No audit logging of actions or tool executions. | Add audit logging store to record all agent filesystem modifications and external calls. |
| **Hardware Telemetry** | Monitored via CLI status bars and token counters. | **Btop Telemetry Popover UI**, but values are simulated with `Math.random()`. Real `HardwarePoller` exists in `backend/telemetry/` but is unused. | Connect `HardwarePoller` (or Tauri system info) to feed real CPU, RAM, and GPU/VRAM data to `BtopTelemetryPopover`. |
| **User Interface** | Terminal UI built with React + Ink. | **Modern Desktop App** built with React 18, Tailwind CSS, Lucide, and Tauri v2. | Keep the superior UI of `unfuse`, but replace the mock plumbing with real engines. |

---

## 4. Root Cause: Why the Backend is Decoupled

The decoupling in `unfuse` is the result of a classic **runtime impedance mismatch**:

```
┌────────────────────────────────────────────────────────┐
│               UNFUSE VITE FRONTEND (src/)               │
│  Runs in: Webview / Browser DOM (Window, Fetch)        │
│  Cannot access: node:fs, node:child_process, node:os   │
└───────────────────────────┬────────────────────────────┘
                            │
               ⚡ RUNTIME BARRIER (Imports Fail) ⚡
                            │
┌───────────────────────────▼────────────────────────────┐
│                  BACKEND CODE (backend/)                │
│  Runs in: Node.js / Bun Runtime                        │
│  Uses: import('node:fs/promises'), child_process, fdir │
└────────────────────────────────────────────────────────┘
```

When building a Vite frontend for Tauri, importing `backend/tools/terminal.ts` or `backend/tools/file_ops.ts` triggers bundler and runtime errors because the webview sandbox does not provide Node.js standard libraries. 

To keep the UI running without build crashes during initial development, mock timers and canned responses were introduced in `ChatPanel.tsx` and `integrationsManager.ts`, while `backend/` was left detached.

---

## 5. Architectural Solutions & Recommended Pairing Strategy

To pair the backend with the frontend in a robust, cross-platform manner, there are two viable architectural strategies:

### Strategy A: Tauri v2 Native IPC Bridge (Recommended for Native Desktop)
In this pattern, browser-safe TypeScript remains in `src/`, while OS-privileged operations are handled via Tauri Rust commands or plugins:
- **LLM Streaming & Prompts**: Handled directly in `src/` or `backend/llm/` using standard browser `fetch()` to local loopback ports (`127.0.0.1:11434`, `127.0.0.1:1234`), which webviews can do without restrictions.
- **Diff Parsing & Tree-Sitter**: Handled in TypeScript (`diff`, `web-tree-sitter`).
- **Filesystem & Shell Execution**: Handled via Tauri v2 Core plugins (`@tauri-apps/plugin-shell`, `@tauri-apps/plugin-fs`) or custom Rust `tauri::command` handlers in `src-tauri/src/main.rs`.
- **System Telemetry**: Handled via `sysinfo` in Rust and queried via `invoke('get_system_telemetry')`.

*Pros*: Zero external daemon dependencies, single self-contained desktop executable, minimal memory footprint.  
*Cons*: Requires implementing a few Rust command handlers in `src-tauri`.

---

### Strategy B: Localhost Daemon / Sidecar Architecture (Fastest Migration from `unit01pro`)
In this pattern, the entire `backend/` is bundled as a Node.js/Bun background daemon running on `127.0.0.1:PORT` (or spawned as a Tauri sidecar):
- The daemon exposes a local WebSocket / HTTP API.
- `backend/` runs natively in Node/Bun with direct access to `node:fs`, `child_process`, `sqlite`, `@modelcontextprotocol/sdk`, etc.
- The React frontend communicates with `http://127.0.0.1:PORT` for all agent orchestration, tools, and telemetry.

*Pros*: Reuses 100% of the existing `backend/` and `unit01pro` code with zero changes to Node dependencies.  
*Cons*: Requires Node/Bun runtime packaged with the app or installed on the host system.

---

## 6. Component-by-Component Refactoring Blueprint

### 6.1 `src/components/chat/ChatPanel.tsx`
- **Current Issue**: Contains ~650 lines of mock `setTimeout` handlers for `#github`, `#linear`, `#sentry`, `#search`, `#postgres`, clarification questions, and fake file diffs.
- **Required Changes**:
  1. Remove all mock `setTimeout` branches in `handleSendMessage`.
  2. Instantiate and maintain an active `LLMClient` session.
  3. Wire the active model selected from the Model Rack (`chosenModel.endpoint`, `chosenModel.provider`, `chosenModel.name`).
  4. Stream real tokens into `assistantMsg.content` via `onToken` callback.
  5. Intercept tool call tags (e.g. `<tool_call name="...">` or OpenAI format) using `ToolParser`.
  6. Dispatch tool executions through `ToolExecutor` and render live progress in `ToolCallItem`.
  7. Implement real `#` command routing: `#search` queries the configured search engine, `#github` calls GitHub API, `#linear` queries Linear GraphQL.

### 6.2 `src/engine/runtimeAdapter.ts`
- **Current Issue**: `buildProviderPayload` is orphaned; shell builder functions are unused.
- **Required Changes**:
  1. Export clean parameter mapper that turns `LocalModelBlade` into standardized payloads for `LLMClient`.
  2. Connect `buildPlatformShellCommand` to the actual terminal execution engine so command safety checks and environment hydration are applied before execution.
  3. Remove dead functions or connect them to `fileOps`.

### 6.3 `src/components/rack/RackPanel.tsx` & `MountModelView.tsx`
- **Current Issue**: The mounted models are kept in React local state inside `RackPanel`, but the active blade is not properly propagated to `ChatPanel` as the source of truth for LLM calls.
- **Required Changes**:
  1. Elevate the active mounted model state to a shared context/store (e.g. `App.tsx` or React Context).
  2. Pass the active blade (with its endpoint, provider, temperature, context length) directly to `ChatPanel`.
  3. Live-probe running models using `http://localhost:11434/api/tags` and `http://localhost:1234/v1/models` on mount.

### 6.4 `src/components/chat/BtopTelemetryPopover.tsx`
- **Current Issue**: Uses `Math.random()` to generate fluctuating CPU/VRAM usage.
- **Required Changes**:
  1. Replace the `setInterval` simulation with polling from `HardwarePoller` or a Tauri IPC command (`invoke('get_hardware_metrics')`).
  2. For NVIDIA GPUs on Linux/Windows, read `nvidia-smi` metrics.
  3. For Apple Silicon Macs, read unified memory and CPU load from the system.

### 6.5 `src/engine/integrations/integrationsManager.ts` & `McpView.tsx`
- **Current Issue**: Mock connection tests with `setTimeout(220)`. No real MCP client or tool discovery.
- **Required Changes**:
  1. Port `McpClientManager` from `unit01pro/packages/core/src/mcp/client.ts`.
  2. When testing an MCP server in `testMcpServerConnection`, actually attempt a client connection and handshake, returning the true count of discovered tools.
  3. Register connected MCP tools dynamically into the agent prompt so the local LLM can call external MCP tools.
  4. Port real connector implementations from `unit01pro/packages/pro/src/connect/integrations/` for GitHub, Linear, and Sentry.

### 6.6 `backend/database/` & Session Persistence
- **Current Issue**: `session_store.ts` uses volatile `new Map()`. Sessions disappear on browser refresh.
- **Required Changes**:
  1. Implement persistent storage using SQLite (via `tauri-plugin-sql` or embedded SQLite database).
  2. Mirror the schema from `unit01pro/packages/core/src/database/db.ts`:
     - `sessions` (`id`, `title`, `created_at`, `updated_at`, `model_target`)
     - `messages` (`id`, `session_id`, `role`, `content`, `thought`, `tool_calls`, `metrics`)
     - `shadow_backups` (`path_hash`, `original_path`, `content`, `version`)
     - `audit_logs` (`id`, `timestamp`, `service`, `operation`, `status`)

### 6.7 Porting "Autopilot" from `unit01pro`
- **Reference**: `unit01pro/packages/pro/src/autopilot/pipeline.ts`.
- **Feature Overview**: An autonomous loop that applies file edits, executes test commands (`npm test`, `cargo check`, etc.), captures compiler warnings/stack traces, and feeds them back to the LLM for self-correction up to $N$ iterations.
- **Implementation in Unfuse**:
  1. Port `StructuredBuildPipeline` into a new `backend/autopilot` module.
  2. Add an "Autopilot" toggle in `ChatInput.tsx`.
  3. Stream iteration status (`[Iteration 1/8] Compiling...`, `✓ Verification passed`) into the chat timeline as interactive execution cards.

---

## 7. Step-by-Step Implementation Action Plan

```
Phase 1: Cleanup & Environment Setup
├── Remove dead files (make_icon.js, unused assets)
├── Remove legacy "Unit01" naming and branding leftovers
└── Configure tsconfig.json and packages for backend integration

Phase 2: Establish Runtime IPC Bridge
├── Register Tauri command handlers (file_ops, shell execution, telemetry)
└── Create client-side bridge wrapper in src/engine/runtimeBridge.ts

Phase 3: Connect Real Agent Streaming
├── Wire LLMClient directly to ChatPanel.tsx
├── Connect active Model Rack blade to LLMClient configuration
└── Replace ChatPanel mock timeouts with real streaming and tool parser

Phase 4: Port Core Features from unit01pro
├── Port SQLite session persistence & shadow backups (/undo)
├── Port real MCP client (@modelcontextprotocol/sdk)
├── Port GitHub, Linear, and Sentry connectors
├── Port AES-GCM encrypted credentials vault
└── Port StructuredBuildPipeline (Autopilot mode)

Phase 5: Wire Real Hardware Telemetry
├── Hook HardwarePoller / Tauri sysinfo into BtopTelemetryPopover
└── Verify end-to-end local streaming with Ollama & LM Studio
```

### Phase 1: Cleanup & Environment Setup
1. **Delete Dead Files**:
   - Remove `make_icon.js`.
   - Remove `src/assets/iron_octo.png`.
   - Clean up unused exports in `runtimeAdapter.ts`.
2. **Standardize Branding**:
   - Replace legacy `unit01` keys in `localStorage` and system prompts with unified `unfuse` keys.
3. **Type Definitions**:
   - Install `@types/node` in `devDependencies` if running Node-based background tooling, or configure browser-safe types.

### Phase 2: Establish Runtime IPC Bridge
1. If using **Tauri v2 Native Bridge**:
   - Enable `@tauri-apps/plugin-shell` and `@tauri-apps/plugin-fs` in `src-tauri/Cargo.toml` and `tauri.conf.json`.
   - Implement Rust commands for operations requiring elevated OS privileges (e.g. `run_command`, `read_file`, `write_file`, `grep_search`, `get_telemetry`).
2. If using **Local Daemon**:
   - Create a minimal entrypoint `backend/server.ts` that runs via Bun or Node and exposes an HTTP/WebSocket interface for `UnfuseBackend`.

### Phase 3: Connect Real Agent Streaming
1. In `src/components/chat/ChatPanel.tsx`:
   - Replace the simulated `setTimeout` blocks with real streaming calls to `LLMClient.streamChat()`.
   - Pass the active blade from `RackPanel` (e.g., Ollama running `deepseek-r1:14b` on port `11434` or Qwen on `1234`).
   - Listen to `onToken` callbacks to display live token streaming and calculate tokens/sec in real time.
2. In `src/components/chat/ToolCallItem.tsx`:
   - Bind tool execution callbacks to real file diffs and command runs.

### Phase 4: Port Features from `unit01pro`
1. **MCP Client**: Port `unit01pro/packages/core/src/mcp/client.ts` to manage stdio/SSE connections to configured servers and expose real tool schemas.
2. **Connectors**: Replace mock responses for `#github`, `#linear`, and `#sentry` with real API requests using stored personal access tokens.
3. **Autopilot**: Add the iterative self-healing build pipeline with test verification and loop prevention.
4. **Database & Audit**: Replace in-memory Maps with SQLite persistence for chats, diffs, and audit logs.

### Phase 5: Wire Real Hardware Telemetry
1. Connect `HardwarePoller` to `BtopTelemetryPopover.tsx`.
2. Feed real GPU/VRAM metrics and CPU load into the rolling SVG graphs.
3. Verify the complete loop offline with Ollama, LM Studio, or vLLM.

---

## 8. Summary Checklist

- [ ] **Clean Dead Code**: Delete `make_icon.js`, remove `src/assets/iron_octo.png`, eliminate unused functions in `runtimeAdapter.ts`.
- [ ] **Purge Mocks**: Replace all simulated `setTimeout` logic in `ChatPanel.tsx` and `integrationsManager.ts`.
- [ ] **Bridge Frontend & Backend**: Bridge `backend/` execution to `src/` via Tauri IPC or local daemon.
- [ ] **Live Model Streaming**: Stream real tokens from local runners (Ollama, LM Studio, vLLM).
- [ ] **Real MCP Engine**: Replace dummy JSON config with authentic `@modelcontextprotocol/sdk` client.
- [ ] **Persistent Storage**: Implement SQLite storage for session histories, checkpoints, and audit trails.
- [ ] **Real Hardware Telemetry**: Hook real CPU/GPU metrics into `BtopTelemetryPopover`.
- [ ] **Autopilot Mode**: Integrate `unit01pro`'s automated build-test-heal loop into the desktop UI.
