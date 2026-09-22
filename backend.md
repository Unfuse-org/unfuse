# Unfuse Backend — Product & Architecture Document

> This is the single source of truth for the Unfuse backend.
> Nothing gets built without being defined here first.
> No roles, no automatic routing, no over-engineering.

---

## What the Backend Is

A TypeScript Node.js sidecar process that runs alongside the Tauri app.
It receives prompts from the UI, calls a local LLM, executes tools with user permission, and streams results back. That's it.

The backend is a **harness**. The model does the thinking. The harness does the executing, gating, and safety checking.

---

## Guiding Principles

- **One job per file.** No file does two things.
- **No hardcodings anywhere.** All values come from `config/defaults.ts` or from the UI via IPC.
- **No automatic decisions.** The backend never decides which model to use, which tool to run, or what's safe. The user decides.
- **Permission gate before everything.** No tool fires without the user seeing it in the UI first.
- **Git is the undo system.** No custom backup. Git snapshots before every file write.
- **Comments on every function.** Why it exists, what it does, what it does NOT do.

---

## Model Selection

The user sets a **Primary Model** in the Rack — one active blade.
Every agent loop call goes to that model's `baseUrl`, `port`, and `model` name.

If the user types `@modelname` in the chat, that specific turn uses that blade instead.
After that turn, the loop goes back to the Primary model.

The backend receives `{ model, baseUrl, port }` from the UI on session start.
It does not make any model selection decisions itself. Ever.

---

## Supported Providers

All providers expose an OpenAI-compatible `/v1/chat/completions` endpoint.
The backend uses one universal streaming client for all of them.

| Provider | Default Port |
|---|---|
| Ollama | 11434 |
| LM Studio | 1234 |
| Jan.ai | 1337 |
| Unsloth | 8888 |
| vLLM | 8000 |
| llama.cpp | 8080 |

No provider-specific code. Just `baseUrl + /v1/chat/completions` with streaming fetch.

---

## The Agent Loop

Single-threaded. Plan → Act → Observe. Runs until the model returns no more tool calls.

```
1. Build system prompt (workspace context + AGENTS.md + repo map)
2. Append user message to session history
3. Stream LLM call → tokens go to UI in real-time
4. Parse response:
   ├── Plain text → stream to UI, done
   └── Tool call detected →
         a. Check path guard (if file tool)
         b. Emit tool_pending to UI → wait for user Allow/Reject/Modify
         c. If allowed → execute tool → capture result
         d. Append tool result to session history
         e. Loop back to step 3
5. Model returns end_turn (no tool call) → loop exits
```

User can hit Stop at any time. Loop is killed, no partial state left behind.

---

## Tools — Phase 1

Only 4 tools in Phase 1. Nothing else until these are solid.

### `read`
Read a file or a line range from a file.
- Input: `{ path, startLine?, endLine? }`
- Passes through path guard before reading
- Truncates output if over `MAX_OUTPUT_CHARS`

### `write`
Create or fully overwrite a file.
- Input: `{ path, content }`
- Passes through path guard
- **Git snapshot fires BEFORE writing**
- Creates parent directories if needed

### `edit`
Replace a specific line range in an existing file.
- Input: `{ path, startLine, endLine, newContent }`
- Passes through path guard
- **Git snapshot fires BEFORE editing**
- Does not diff — replaces the target lines exactly

### `bash`
Execute a shell command inside the workspace directory.
- Input: `{ command, timeoutMs?, background? }`
- Always runs with `cwd = workspaceRoot` — never anywhere else
- `timeoutMs` defaults to `BASH_DEFAULT_TIMEOUT_MS`, capped at `BASH_MAX_TIMEOUT_MS`
- If `background: true` → spawns detached, loop continues, result read later
- Returns `{ stdout, stderr, exitCode }`
- Output truncated at `MAX_OUTPUT_CHARS`

### Why Only 4 Tools? (No redundant `grep` or `find`)
`bash` already executes `grep`, `rg`, `find`, `fd`, `git`, `cat`, and `ls` natively on the system.
Adding separate `grep` and `find` tool definitions wastes valuable system prompt tokens without adding any new capability. **4 tools (`read`, `write`, `edit`, `bash`) provide 100% of required file and execution capabilities with minimal prompt overhead.**

---

## Security

### Layer 1 — Permission Gate (UI-driven)
Every single tool call pauses the loop and shows in the UI as pending.
User sees the exact command/path/content and clicks:
- **Allow** — run once
- **Auto-Allow** — allow this tool type for the rest of the session
- **Modify** — user edits the args before it runs
- **Reject** — agent gets told the action was rejected, loop continues

No tool fires without passing this gate. No exceptions.

### Layer 2 — Path Guard (server-side, runs before every file tool)
```
Is the path a sensitive file?       → Hard reject. Never reaches permission gate.
Is the path inside workspace root?  → Proceed to permission gate.
Is the path outside workspace root? → requiresPermission = true → goes to permission gate.
```

### Layer 3 — Comprehensive Sensitive File Hard Block
These paths and patterns are **always hard-blocked** on read/write/edit attempts. They never reach the permission gate and cannot be overridden:

1. **Environment & Secrets:**
   - `**/.env`, `**/.env.*`, `**/.envrc`
   - `**/secrets/**`, `**/credentials/**`

2. **SSH & Cryptographic Keys:**
   - `~/.ssh/**`, `~/.gnupg/**`
   - `**/id_rsa*`, `**/id_ed25519*`, `**/id_ecdsa*`, `**/id_dsa*`
   - `**/*.pem`, `**/*.key`, `**/*.p12`, `**/*.pfx`, `**/*.pkcs12`

3. **Cloud & Developer CLI Auth:**
   - `~/.aws/**`, `~/.azure/**`, `~/.gcp/**`, `~/.config/gcloud/**`
   - `~/.kube/config`, `~/.kube/**`
   - `~/.docker/config.json`
   - `~/.npmrc` (contains publish auth tokens)
   - `~/.pypirc`, `~/.netrc`, `~/.git-credentials`
   - `~/.config/gh/**` (GitHub CLI auth)

4. **Service Accounts & Token Files:**
   - `**/*serviceAccountKey*.json`, `**/*service-account*.json`
   - `**/*firebase-adminsdk*.json`, `**/*google-credentials*.json`

5. **Shell History & Keychains:**
   - `~/.bash_history`, `~/.zsh_history`, `~/.node_repl_history`, `~/.python_history`, `~/.psql_history`
   - `~/Library/Keychains/**`

6. **System Internals (OS Boundaries):**
   - `/etc/**`, `/private/**`, `/System/**`, `/usr/**`, `/bin/**`, `/sbin/**`, `/var/**`

### No bash blocklist
`sudo`, `rm -rf`, `curl`, `wget` — all allowed through the **UI permission gate**.
The human reads the command and decides. The backend does not second-guess valid developer commands.

---

## Git Backup & Undo

Instead of creating spam commits on every single tool call, Unfuse creates **ONE atomic Git commit at the end of each completed prompt turn**:
```bash
git add -A
git commit -m "unfuse: {promptSummary}" --no-verify
```

### Undo Command (`/undo`)
When the user clicks "Undo" in the UI or types `/undo`:
```bash
git reset --hard HEAD~1
```
This cleanly rolls back all changes made during the last prompt turn, keeping `git log` clean and professional.

Silent no-op if:
- Workspace is not a git repo
- No changes to commit

---

## Context & Memory

### Session Context
Each session maintains an in-memory message history — the full conversation including tool calls and results. Passed to the LLM on every turn.

Token budget is tracked. When approaching the limit, oldest non-system messages are dropped (compaction). System prompt and recent messages are always preserved.

### Session Persistence
Sessions are saved as **JSONL files on disk** — one file per session, stored in the app data directory. User can resume a past session from the sidebar. Message history is reloaded from the JSONL file.

Format: one JSON object per line, each representing one message or tool result.

### Project Instructions — `AGENTS.md`
If the workspace root contains an `AGENTS.md` file, it is read at session start and injected into the system prompt.
Also checks for `CLAUDE.md` as a fallback (for users migrating from Claude Code).

Only load from workspace root. No subdirectory scanning for now.

What goes in `AGENTS.md`:
- Build commands (`bun run dev`, `cargo build`)
- Coding standards and conventions
- Architecture notes and constraints
- Directories the agent should stay out of

---

## Repo Map

### Phase 1 — Simple Directory Map
At session start, the backend scans the workspace and generates a compact file tree:
- Directory structure (respects `.gitignore`)
- File names, extensions, sizes
- Injected as a ~200 token block into the system prompt

### Phase 2 — Full Aider-Style Repo Map
Upgrade to tree-sitter based repo map:
- Parse every file into an AST
- Extract function names, class names, exports, imports
- Build a reference graph across files
- PageRank ranking by relevance to the current task
- Cache in SQLite, invalidate by file mtime
- Inject ~500-1000 token ranked summary per prompt

Phase 2 only. Not in Phase 1.

---

## Autopilot Mode

Triggered by `/autopilot [verify command]` in the chat.

User provides a verify command — e.g., `npm test`, `cargo check`, `bun run build`.

The agent loop runs with one extra step:
```
After every set of tool calls →
  Run the verify command →
  If it passes (exit code 0) → done, report success
  If it fails → feed stderr back into the loop → agent tries again
```

Stops when:
- Verify command passes
- User hits Stop
- Max turns reached (configurable, default unlimited)

The permission gate still fires on every tool call even in autopilot.
The agent does not run unchecked. User still sees and approves every action.

---

## Background Bash Tasks

When `bash` is called with `background: true`:
- Process is spawned detached from the loop
- Loop continues immediately — agent can keep working
- A background task ID is returned
- UI shows a running process indicator
- Agent can call `bash` with `{ check_background: taskId }` to read output so far
- User can kill background tasks manually from the UI

Use case: `npm run dev`, `cargo watch`, long test suites.

---

## Timeouts

All values live in `config/defaults.ts`. Nothing hardcoded elsewhere.

| Setting | Default | Max |
|---|---|---|
| `BASH_DEFAULT_TIMEOUT_MS` | 120,000 (2 min) | — |
| `BASH_MAX_TIMEOUT_MS` | 600,000 (10 min) | Cannot be exceeded |
| `MAX_OUTPUT_CHARS` | 32,000 chars | — |
| `CONTEXT_TOKEN_BUDGET` | 100,000 tokens | — |
| `PERMISSION_GATE_TIMEOUT_MS` | 300,000 (5 min) | Auto-reject if no response |

---

## Integrations

See `integrations_reference.md` for full connection details and permissions.

The backend exposes integration tools that the agent can call (through the permission gate):

| Integration | What the agent can do |
|---|---|
| Web Search (DDG / Brave / Tavily / Exa / Google) | Read-only search. User picks one as default. |
| GitHub | Read repos/issues/PRs, create issues/PRs (branch only) |
| Linear | Read + create/update issues and comments |
| Sentry | Read error events and stack traces |
| Slack | Post to invited channels only |
| MCP | Whatever the server exposes — always through permission gate |

---

## IPC — How Backend Talks to UI

Backend runs as a Tauri sidecar. Communication is via Tauri IPC events.

Events the backend **emits to UI**:
- `token_chunk` — a streamed token from the LLM
- `tool_pending` — a tool needs user permission (shows in ToolCallItem)
- `tool_result` — tool execution completed, result returned
- `agent_done` — loop finished, session over
- `agent_error` — something went wrong

Events the backend **receives from UI**:
- `start_session` — new session, contains `{ sessionId, workspaceRoot, model, baseUrl, port }`
- `send_message` — user message, contains `{ sessionId, content, model? }` (model only if @mention)
- `permission_decision` — user's Allow/Reject/Modify decision for a pending tool
- `stop_agent` — user hit Stop
- `resume_session` — resume from a saved JSONL session file

---

## What Is NOT in Phase 1

| Feature | Phase |
|---|---|
| `grep` and `find` tools | Phase 2 |
| Full tree-sitter repo map | Phase 2 |
| Sub-agents | Phase 2 |
| MCP server runtime | Phase 2 |
| Integration tools (GitHub, Slack, etc.) | Phase 2 |
| Background task UI panel | Phase 2 |
| Vector memory / semantic session search | Phase 3 |

Phase 1 goal: **real LLM → real tool call → real permission gate → real file read/write/bash → real streaming output.** End-to-end working, nothing fake.

---

## Folder Structure

```
src-backend/
├── index.ts                    # Entry point. Starts IPC listener. Wires everything.
├── config/
│   └── defaults.ts             # ALL configurable values. Zero hardcodings anywhere else.
├── ipc/
│   └── bridge.ts               # Only file that talks to Tauri. Emits/receives all events.
├── agent/
│   ├── loop.ts                 # Plan→Act→Observe loop. The core.
│   ├── prompt.ts               # Builds system prompt + AGENTS.md + repo map injection.
│   └── context.ts              # Token budget tracking + message compaction.
├── llm/
│   ├── client.ts               # Universal streaming fetch to any OpenAI-compat endpoint.
│   ├── parser.ts               # Extracts tool_call blocks from streamed LLM response.
│   └── types.ts                # LLMMessage, LLMConfig, StreamChunk, ToolCallBlock types.
├── tools/
│   ├── registry.ts             # Maps tool name → { schema, execute }. Single registry.
│   ├── read.ts                 # Read file (with optional line range).
│   ├── write.ts                # Create/overwrite file. Git snapshot first.
│   ├── edit.ts                 # Replace line range. Git snapshot first.
│   └── bash.ts                 # Shell command. Timeout + cwd enforcement.
├── security/
│   ├── path-guard.ts           # Three-level path check: sensitive / workspace / outside.
│   └── sensitive-patterns.ts   # The hard-block list. (.env, ~/.ssh, etc.)
├── permissions/
│   └── gate.ts                 # Pauses loop. Emits tool_pending. Waits for UI decision.
├── git/
│   └── snapshot.ts             # git add -A + git commit before every write/edit.
├── session/
│   └── store.ts                # In-memory session state + JSONL persistence to disk.
├── repomap/
│   └── scanner.ts              # Phase 1: directory tree scan. Phase 2: tree-sitter map.
└── types/
    └── index.ts                # Shared types: AgentConfig, ToolContext, ToolResult, etc.
```
