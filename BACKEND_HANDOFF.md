# Backend handoff: steps 1–4

Updated: 17 October 2026. Repository: `Unfuse-org/unfuse`.

## Read this first

Steps 1–3 were implemented and tested earlier in this session. Step 4 is **in progress**, and the current working tree is **not a verified baseline**. Do not treat the earlier green results as verification of the current code.

No backend changes from steps 2–4 have been committed or pushed. The last push request was paused because unfinished step 4 code is mixed into the backend diff. The user requested a **backend-only push**; frontend changes must not be included without authorization.

Current local HEAD is `36b3488` on `main`, four commits ahead of the locally recorded `origin/main` (`870f0ac`). This is local Git information, not a fresh remote fetch.

## 1. Verify the baseline

Changes already committed locally:

- `59f134e`: permission-test race fix. Shared retry helper waits for actual approval delivery, with a 5-second deadline; approval tests use a reusable 30-second loop deadline, unique session IDs, and session cleanup guards.
- `edf9024`: scope the `tauri::Manager` import to macOS.
- `e7cbdcf`: fix the Windows timeout fixture; make the flood test check output-cap termination against a deliberately long workload; serialize process tests with a poison-tolerant mutex.
- `36b3488`: synchronize generated ACL and Windows schemas.

The baseline failures were addressed before steps 2–3. A timed-out loop helper can still leave a detached thread: Rust cannot forcibly terminate it. Unique session IDs and cleanup limit interference; the timeout is not proof of thread termination.

Remaining: establish a fresh baseline after completing or separating the unfinished step 4 changes. macOS compilation has not been verified on this Windows host.

## 2. Connect workspace sessions and history to SQLite

Implemented locally:

- Register `select_workspace` in the Tauri command handler. Validate that the selected path is an existing absolute directory and return its canonical path.
- Replace preview conversations with real workspace-scoped session creation, listing, and history loading through the existing SQLite storage commands.
- Remember workspace selection and active conversation in local storage; SQLite remains the session/history authority.
- Reconstruct user messages, assistant messages, tool calls/results, and interruption notices for reopened conversations. Historical approval records do not become live approval gates.
- Disable sidebar metadata/deletion actions while their persistence semantics remain undecided.
- Add tests for workspace validation, history surviving storage reopen, workspace isolation, and frontend history reconstruction.

Main files: `src-tauri/src/storage/mod.rs`, `src-tauri/src/main.rs`, `src/services/sessionHistory.ts`, `src/App.tsx`, `src/components/sidebar/SidebarPanel.tsx`, and chat components.

Remaining: agree on rename/archive/delete semantics before enabling those sidebar actions. No new database schema was introduced for this wiring.

## 3. Connect single-model execution and approvals

Implemented locally:

- Connect the selected model to native agent execution, streaming chat state, tool approval controls, stop requests, and SQLite history reload after a turn.
- Prevent workspace/conversation navigation during execution.
- Attribute agent events to their session and filter frontend events by the active session.
- Require the real session ID in frontend `resolvePermission` and Rust `resolve_tool_permission`; remove the approval resolver's `default` fallback and reject blank IDs.
- Display approval-delivery errors and log call/session identifiers instead of silently leaving the approval pending. Use a type-only `UnlistenFn` import.
- Add tests for blank IDs, session isolation, successful delivery, frontend invoke payloads, and streamed chat state.

Real-model investigation and fix:

- Local Ollama/Qwen returned complete tool JSON as ordinary content instead of native tool-call frames.
- Add an explicit `qwen_json` compatibility mode, restricted to Ollama with `qwen2.5-coder`. Native tool calling remains the default.
- Convert only complete tool-response JSON matching offered tools and argument schemas; preserve native-call priority and reject truncated completion before dispatch. Prose containing JSON stays prose.
- The ignored real-model test performs read → approved edit → approved shell check across three turns, verifies session-attributed events and file contents, and compares history after verified backup restoration. It does not replace inference with hardcoded production responses.

Main files: `src-tauri/src/agent.rs`, `src-tauri/src/provider.rs`, `src/services/backendClient.ts`, `src/services/chatTurn.ts`, and chat components. Tests are in the Rust modules and `test/`.

Remaining: current changes need fresh verification after step 4. The automated workflow checks storage restoration; a complete interactive app restart/reopen walkthrough is not established by that test alone. Other installed models/providers were not proved by the Qwen run.

## 4. Finish execution reliability — incomplete

Work already present in the local diff:

- Session attribution from step 3 remains in place.
- Add `StreamCancellation`, an active-turn guard, and a session `running` flag as scaffolding for interruptible inference and same-session turn exclusion.
- Add provider endpoint/configuration validation and an input-size check, plus optional `top_p`, `repetition_penalty`, and `max_request_bytes` fields.
- Add schema-based tool argument validation before approval and at execution, including required fields, types, supported tools, and relevant bounds.
- Treat unsuccessful shell exit codes as tool errors.

**Known incomplete wiring / blockers:**

1. `ProviderConfig` gained fields, but `agent::tests::make_test_config` and `provider::tests::sse_fixture` still omit them. These initializers must be updated before the test target can compile. This is established by source inspection; no fresh compiler result was obtained for this snapshot.
2. `begin_turn` / `ActiveTurnGuard` are not yet used by the execution entry points. Existing turn registration/reset/removal behavior is still active.
3. Provider inference still uses synchronous `ureq`; the new cancellation waiter does not interrupt the live HTTP request. Cancellation during a blocked provider request remains unfinished.
4. Endpoint validation, provider configuration validation, and the context-limit helper are not wired into live inference. New settings are not fully connected through frontend configuration and request construction.
5. The context helper currently proposes a 120,000-byte application input budget. That is scaffolding, not an enforced limit or an exact model token-window calculation. The user approved **stopping with a clear error**, preserving history, rather than dropping older turns; the numeric budget has not been agreed.
6. Strict provider stream/error/truncation handling and reliability regression tests remain to be completed. The Qwen-specific truncation check does not establish reliability for every native provider response.

Resume by fixing the compile blockers, then finish cancellation/turn ownership, provider settings/protocol handling, validation coverage, and context enforcement in the existing architecture. Inspect collaborative execution before changing the streaming transport so it remains compatible with its runtime.

Do not claim step 4 is complete or publish this mixed snapshot as a verified release.

## Verification record and how to reproduce

Earlier session results **before the partial step 4 edits**:

- Full Rust suite: three runs, each **91 passed, 0 failed, 1 ignored**.
- Ignored real-model workflow: three successful individual runs with local Ollama `qwen2.5-coder:3b`.
- Frontend Node tests: **7 passed**. Frontend production build and Rust Clippy passed at that earlier point.

These are historical session results, not commands rerun while writing this handoff. Their build-folder logs are no longer available: at the user's request, `src-tauri/target` and `dist` were deleted to recover approximately 12.36 GiB. Source files and dependencies were preserved. A subsequent build will regenerate those outputs and may take longer.

Run from the repository root after addressing the incomplete work:

```powershell
node --test --experimental-strip-types test/resolvePermission.test.ts test/sessionHistory.test.ts test/chatTurn.test.ts
node node_modules/typescript/bin/tsc --noEmit
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run build
```

Run from `src-tauri`:

```powershell
cargo test --no-run
cargo test -- --nocapture
cargo clippy -- -D warnings
cargo test agent::tests::test_real_model_read_approved_edit_check_and_reopened_history -- --exact --ignored --nocapture
```

Repeat the full Rust suite three times for the reliability verification. The ignored model test requires local Ollama and the named model; it is not part of the ordinary suite. Do not add dependencies or package scripts without approval.

## Local changes and publication boundary

Backend files currently modified:

- `src-tauri/src/agent.rs`
- `src-tauri/src/main.rs`
- `src-tauri/src/provider.rs`
- `src-tauri/src/storage/mod.rs`
- `src-tauri/src/tools/mod.rs`

Frontend files currently modified:

- `src/App.tsx`
- `src/components/chat/ChatPanel.tsx`
- `src/components/chat/MainChatPanel.tsx`
- `src/components/chat/MessageItem.tsx`
- `src/components/chat/ToolCallItem.tsx`
- `src/components/chat/types.ts`
- `src/components/sidebar/SidebarPanel.tsx`
- `src/services/backendClient.ts`

Untracked implementation/test files: `src/services/chatTurn.ts`, `src/services/sessionHistory.ts`, and `test/` containing `chatTurn.test.ts`, `resolvePermission.test.ts`, and `sessionHistory.test.ts`.

The frontend and Rust approval interface changes depend on each other. A backend-only push will not deliver the complete end-to-end UI fix. Preserve the frontend work locally and make that limitation explicit when publishing only backend files. This handoff is documentation, not permission to include additional files in the backend push.

## After steps 1–4

The sequential pipeline contract is step 5, not implemented by this reliability work: ordered stages, distinct results, durable transitions, and stop on failure/cancellation. History export/forks, memory/live logs, and durable attachments remain later work. Do not expand into those tasks without authorization.
