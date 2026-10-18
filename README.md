# Unfuse

A desktop AI coding workspace for working on local projects with the models you choose.

Unfuse brings a project, a model rack, and an agent conversation into one workspace. Start with one local model to investigate code, make changes, and run checks. The broader product direction is optional collaboration between multiple models, with each task and its order defined by the user.

**Status:** actively developing. The native single-model agent path is implemented; sequential multi-model collaboration is incomplete. Provider options in the interface do not imply that every runner has been verified end to end.

## Goals

- Bring your own local models and work on the same local project.
- Make single-model operation a complete, useful workflow.
- Let users assign sequential tasks to multiple models through model mentions.
- Use existing hardware efficiently, with model choice and workload under the user's control.

The model rack includes options for Ollama, LM Studio, llama.cpp, vLLM, MLX, and Unsloth. Compatibility depends on the runner's API, configuration, and the model's support for the requested operations. Hardware requirements depend on model size, quantization, context length, and runner behavior; there is no verified promise of a specific model count or memory saving.

## Workflow

To explore the current native workflow:

1. Start a local model server and load a model.
2. Launch the desktop app. The project launcher is present, but opening a project or creating a scratchpad currently only closes the launcher; selecting a project is not fully wired into the workspace.
3. Mount and select a model in the rack, using the server's actual endpoint and model identifier.
4. Describe a task in chat, review the agent's tool requests and proposed changes, and inspect the results.

### Optional collaboration: product direction

A user-defined sequence could look like this:

```text
@model-a Investigate why the test fails.
@model-b Review the previous findings against the code.
@model-c Develop a solution using the reviewed findings.
@model-a Verify the changes and run the relevant checks.
```

These are assignments for this request, not permanent model roles. One model can perform every step; multiple models are optional.

This example describes the intended workflow. The current normal chat path does not dispatch such a sequence automatically, and the collaboration implementation should not yet be treated as a reliable pipeline.

## Current implementation

| Area | Current state |
| --- | --- |
| Desktop workspace | React interface with a project launcher, model rack, chat, tool results, and integration settings, hosted by Tauri. Project and scratchpad selection currently only close the launcher; workspace selection is not fully wired. |
| Native agent | Normal chat invokes `run_agent_turn` for one selected model. The Rust loop handles streamed responses and tool execution. |
| Model connections | Runner selection and discovery code plus a shared OpenAI-compatible chat transport. All six runner options have not been verified as complete integrations. |
| Tools | File reading, writing, editing, shell execution, and external integration tools. Permission and guardrail code exists; shell execution is not an OS sandbox. |
| Persistence | JSONL session event logs and a SQLite index, stored by default under `~/.unfuse`. |
| Integrations | Web-service adapters and MCP server/tool plumbing are present. Availability depends on configuration and the external service or server. |
| Collaboration | A registered orchestrator parses mentions and reuses the agent loop sequentially. UI dispatch, durable stage tracking, cancellation between stages, context budgeting, and routing/configuration plumbing remain incomplete. |
| Browser preview | Chat turns are simulated when the frontend runs outside Tauri. This mode does not exercise the native agent or its tools. |

## Getting started

### Prerequisites

- Node.js and npm compatible with the project's Vite 5 toolchain.
- Rust and Cargo for the native backend.
- Platform-specific Tauri 2 build prerequisites, including native compiler and webview dependencies.
- A running local model server for real model execution. Unfuse is the workspace; inference runs in the configured model server.

The repository does not pin Node.js or Rust toolchain versions. Native prerequisites vary by operating system.

### Install dependencies

From the repository root:

```sh
npm ci
```

### Run the desktop app

```sh
npm run tauri -- dev
```

Tauri starts the Vite development server at `http://localhost:1420` and launches the native application. Use this mode to exercise Rust IPC, model requests, persistence, and tools.

### Preview the interface in a browser

```sh
npm run dev
```

Open `http://localhost:1420`. This is useful for interface development; chat uses simulated turns in this mode.

### Build

```sh
# Type-check and build the frontend into dist/
npm run build

# Build the native app and configured platform bundles
npm run tauri -- build
```

The native build runs the frontend build automatically. Bundle formats and native build requirements depend on the host platform.

## Commands and checks

Run npm commands from the repository root and Cargo commands from `src-tauri/`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite browser preview. |
| `npm run build` | Run TypeScript checking and create the frontend production build. |
| `npm run tauri -- dev` | Launch native desktop development. |
| `npm run tauri -- build` | Build the native application and bundles. |
| `cargo clippy -- -D warnings` | Check the Rust backend with warnings treated as errors. |
| `RUSTFLAGS="-D warnings" cargo test` | Run Rust tests with compiler warnings treated as errors. |

## Repository map

```text
src/
  App.tsx                 Application composition
  components/
    workspace/            Project launcher
    rack/                 Model discovery, mounting, and configuration
    chat/                 Conversation, tool requests, and result views
    integrations/         Service and MCP settings
    sidebar/              Workspace navigation
  services/               Backend client and Tauri bridge
src-tauri/
  src/
    main.rs               Native application and IPC registration
    agent.rs              Agent loop and session execution
    provider.rs           Chat transport and response handling
    provider/             Capability handling
    prompt.rs             Agent prompt construction
    tools/                File operations, shell execution, and guardrails
    storage/              JSONL events and SQLite session index
    mcp/                  MCP process and tool communication
    integrations/         External service adapters
    orchestrator.rs       Sequential collaboration implementation
  tauri.conf.json         Desktop and bundle configuration
```

## How it fits together

The frontend uses **React, TypeScript, Vite, and Tailwind CSS**. **Tauri 2 and Rust** host the native application and execute agent work.

For normal native chat, the backend client sends the selected model configuration, workspace, prompt, and integration settings through Tauri IPC to `run_agent_turn`. The agent loop requests a completion from the configured server, executes requested tools through the tool layer, and streams events back to the interface. The storage layer records session events in JSONL and maintains a SQLite index.

The collaboration orchestrator is a separate native entry point that reuses the shared agent loop and passes previous outputs to subsequent model tasks. It is an implementation in progress, with the limitations described above.

Before contributing, read [AGENTS.md](AGENTS.md) for the repository's scope, change-preservation, and verification requirements.
