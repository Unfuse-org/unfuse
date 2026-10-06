# Backend first deliverable: history baseline and contract proposal

Date: 6 October 2026. Base commit: `9572c8f1c49cfa23c60ebbc25d71cf14b7ea5bf1`, plus existing local changes (including agent permission handling and the frontend bridge).

Status: the initial proposal below is historical. **The approved minimal storage implementation is recorded at the end of this document.** The full pipeline schema and IPC proposal remain unapproved and unimplemented.

Sources: [backend checklist](https://app.notion.com/p/3f1773d80b118178ae04f2b3b8370d08), [storage direction](https://app.notion.com/p/3ef773d80b1181e49cc5d714135b9b5f), [pipeline design](https://app.notion.com/p/3ef773d80b1181f19b96f11847f4c446). These describe the target; source inspection and checks below describe this checkout.

## History baseline

The existing `agent::tests::test_multi_turn_history_reconstruction` uses a mock provider. Its expectation is correct: the second request must receive system, first user, first assistant, second user; the returned history additionally contains the second assistant. Do not reduce the expected count from five to three.

Reproduction command from `src-tauri`:

```powershell
$env:RUSTFLAGS = '-D warnings'
cargo test agent::tests::test_multi_turn_history_reconstruction -- --exact --nocapture
```

The sandboxed run reproduces actual **3** versus expected **5** at `agent.rs:1508` before adding diagnostic assertions. The strengthened test then reports **zero saved events** after turn 1. Running the same strengthened test with approved filesystem access passes, including reload/reconstruction assertions. The reported count failure is therefore blocked writes silently ignored by the agent in this environment, not evidence that the expected count or the ordinary no-switch reconstruction algorithm is wrong. This is a mock-provider persistence test, not evidence of native desktop or runner compatibility.

There is also a real Windows durability defect independent of the sandbox: all ten storage tests that create sessions fail, even with approved filesystem access, with `Failed to sync session file: Access is denied. (os error 5)`. `append_event_durable` reopens the already-written log using read-only `File::open`, then calls `sync_data`. Windows requires a writable handle for `FlushFileBuffers` ([Microsoft documentation](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-flushfilebuffers)); Rust documents `File::open` as read-only ([Rust documentation](https://doc.rust-lang.org/std/fs/struct.File.html#method.open)). The agent history test passes outside the sandbox because written records are readable despite this discarded durability error. Passing that test does **not** establish durable completion.

Disposition: retain the five-message expectation; add diagnostic persistence assertions only. Do not change production behavior in this diagnosis deliverable. The storage step must surface errors and fix the Windows durability boundary or replace it with the approved SQLite commit boundary. Existing JSONL data must remain protected during cutover.

Source trace:

- `agent.rs` loads the active branch with `.ok()`, creates a session with `.ok()`, and ignores both normal and durable append results. A load/save failure can become an apparently successful turn with empty prior history.
- `storage/mod.rs` uses global storage under `~/.unfuse`; the agent test's temporary directory is its workspace, not its storage root.
- `storage/jsonl.rs:52–59` writes a line before its durability call; `append_event_durable` then reopens the file read-only and calls `sync_data`. A successful append is not proof of a successful durability boundary.
- With no branch switch, reconstruction selects the last event and follows parent pointers. A correct two-turn log contains metadata, user 1, assistant 1, user 2, assistant 2.
- `resolve_active_leaf_id` selects the last explicit `ActiveLeaf` forever, even after subsequent appends. The existing branch test only loads explicit leaves; it does not test switch followed by continuation. This is a separate confirmed source-level defect to cover in the storage implementation, not an explanation for the no-switch history test.
- Durable append bypasses the SQLite index update. Even a valid conversation log can have a stale sidebar index. The target transaction must replace this split update.

## Proposed operating decisions

| Area | Proposed contract |
| --- | --- |
| Authority | One SQLite database for all workspaces; JSONL only for explicit export and legacy import. Reuse `StorageManager`, rusqlite 0.31 bundled, and typed serde payloads. |
| Location | `<default_storage_dir()>/sessions.db`, beside the existing `index.db` and `sessions/`. Keep explicit base-directory injection for tests. Fail visibly if the home/application storage location is unavailable; do not fall back to `/tmp`. |
| Connections | Verify WAL, foreign keys ON, synchronous FULL, busy timeout 5000 ms. Short serialized writes; no database transaction across inference, tools, or approval waits. |
| Versioning | Migration 1 below, transactional migrations with completion timestamps; event and plan payload version 1. Reject newer unsupported versions before writes. |
| Runtime ownership | Initial implementation permits one native runtime to own this database for execution. Acquire and retain an OS-backed exclusive ownership lock before recovery/execution; a second runtime must fail visibly. Do not use PID existence alone as proof of ownership. |
| Streaming | Deltas transient. Persist submissions, complete assistant messages, tool intents/results, approval decisions, and lifecycle transitions. No claim of per-token crash durability. |
| Branches | Session stores one active leaf. Appending a conversation message updates it in the same transaction; administrative execution events do not advance it. Branch selection validates membership. |
| Permissions | Preserve current defaults: reads without approval; file writes, edits, shell and external mutations require approval. Unknown external classification requires approval. All permitted tools remain available. `auto_allow` applies only to the current run and action class; future runs use explicit session defaults. |
| Denial/failure | Denied required approval stops the attempt and run as failed with a recorded reason. Cancelled work stops as cancelled. Neither starts the next stage. |
| Retry/recovery | No automatic retries or resume. Interrupted external calls become unknown. An explicit retry creates a new attempt after user review; it cannot reuse a cancelled run or replay completed mutations silently. |
| Backup | Verified pre-import snapshot of legacy files and old index; explicit on-demand `VACUUM INTO` backup to a new file, integrity/FK check and restore rehearsal. Keep previous good backups and legacy originals. No automatic retention/deletion schedule. |
| Delete | No session-delete command in the first storage implementation until deletion semantics are separately agreed. Title/pin/list/load/search may proceed after contract approval. |
| Attachments | First storage step retains existing file-reference metadata and text/JSON. Binary ingestion and its lifecycle are not introduced by this contract. |

`VACUUM INTO` produces a consistent snapshot but its output must be checked before being offered for restore. Foreign keys must be enabled on each connection before transactions. See [SQLite backup SQL](https://www.sqlite.org/lang_vacuum.html), [foreign keys](https://www.sqlite.org/foreignkeys.html), and [transactions](https://www.sqlite.org/lang_transaction.html).

## Original proposed DDL (superseded by the approved minimal migration)

This block is a reviewable schema, not code invoked by the application. Times are UTC epoch milliseconds; `seq` is session-local append order. IDs are backend-generated, opaque, collision-resistant across runtimes. Existing event IDs are preserved during import. Do not continue using the current process-local timestamp/counter generator for new global identities without collision handling.

```sql
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY CHECK (version > 0),
    applied_at INTEGER NOT NULL
);
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    canonical_path TEXT NOT NULL UNIQUE
);
CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    title TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    next_seq INTEGER NOT NULL DEFAULT 1 CHECK (next_seq > 0),
    active_leaf_id TEXT,
    FOREIGN KEY (id, active_leaf_id) REFERENCES events(session_id,id)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE runs (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    request TEXT NOT NULL,
    plan_version INTEGER NOT NULL CHECK (plan_version = 1),
    plan_json TEXT NOT NULL CHECK (json_valid(plan_json)),
    owner_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN
        ('queued','running','waiting_approval','completed','failed','cancelled','interrupted')),
    cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK (cancel_requested IN (0,1)),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (session_id,id)
);
CREATE UNIQUE INDEX one_active_run_per_session ON runs(session_id)
    WHERE status IN ('queued','running','waiting_approval');
CREATE TABLE stages (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    connection_id TEXT NOT NULL,
    model TEXT NOT NULL,
    instruction TEXT NOT NULL CHECK (length(trim(instruction)) > 0),
    config_json TEXT NOT NULL CHECK (json_valid(config_json)),
    UNIQUE (run_id,position),
    UNIQUE (session_id,run_id,id),
    FOREIGN KEY (session_id,run_id) REFERENCES runs(session_id,id)
);
CREATE TABLE stage_attempts (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    status TEXT NOT NULL CHECK (status IN
        ('queued','running','waiting_approval','completed','failed','cancelled','interrupted')),
    result_event_id TEXT,
    started_at INTEGER,
    finished_at INTEGER,
    UNIQUE (stage_id,attempt_number),
    UNIQUE (session_id,run_id,id),
    FOREIGN KEY (session_id,run_id,stage_id) REFERENCES stages(session_id,run_id,id),
    FOREIGN KEY (session_id,result_event_id) REFERENCES events(session_id,id)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX one_active_attempt_per_stage ON stage_attempts(stage_id)
    WHERE status IN ('queued','running','waiting_approval');
CREATE TABLE events (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    seq INTEGER NOT NULL CHECK (seq > 0),
    timestamp INTEGER NOT NULL,
    kind TEXT NOT NULL,
    payload_version INTEGER NOT NULL CHECK (payload_version > 0),
    payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
    parent_id TEXT,
    run_id TEXT,
    attempt_id TEXT,
    CHECK (attempt_id IS NULL OR run_id IS NOT NULL),
    UNIQUE (session_id,id),
    UNIQUE (session_id,seq),
    FOREIGN KEY (session_id,parent_id) REFERENCES events(session_id,id),
    FOREIGN KEY (session_id,run_id) REFERENCES runs(session_id,id),
    FOREIGN KEY (session_id,run_id,attempt_id) REFERENCES stage_attempts(session_id,run_id,id)
);
CREATE TRIGGER parent_precedes_child BEFORE INSERT ON events
WHEN NEW.parent_id IS NOT NULL
BEGIN
    SELECT CASE WHEN NOT EXISTS (
        SELECT 1 FROM events WHERE session_id = NEW.session_id
        AND id = NEW.parent_id AND seq < NEW.seq
    ) THEN RAISE(ABORT,'parent must precede child in same session') END;
END;
CREATE TABLE tool_executions (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    attempt_id TEXT NOT NULL,
    response_event_id TEXT NOT NULL,
    provider_call_id TEXT NOT NULL,
    tool TEXT NOT NULL,
    arguments_json TEXT NOT NULL CHECK (json_valid(arguments_json)),
    executed_arguments_json TEXT CHECK
        (executed_arguments_json IS NULL OR json_valid(executed_arguments_json)),
    status TEXT NOT NULL CHECK (status IN
        ('proposed','waiting_approval','running','completed','failed','denied','cancelled','unknown')),
    result_event_id TEXT,
    started_at INTEGER,
    finished_at INTEGER,
    UNIQUE (attempt_id,response_event_id,provider_call_id),
    FOREIGN KEY (session_id,run_id,attempt_id) REFERENCES stage_attempts(session_id,run_id,id),
    FOREIGN KEY (session_id,response_event_id) REFERENCES events(session_id,id),
    FOREIGN KEY (session_id,result_event_id) REFERENCES events(session_id,id)
);
CREATE TABLE summary_sources (
    session_id TEXT NOT NULL,
    summary_event_id TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    PRIMARY KEY (summary_event_id,source_event_id),
    FOREIGN KEY (session_id,summary_event_id) REFERENCES events(session_id,id),
    FOREIGN KEY (session_id,source_event_id) REFERENCES events(session_id,id)
);
CREATE TABLE legacy_imports (
    source_key TEXT PRIMARY KEY NOT NULL,
    source_sha256 TEXT NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    imported_at INTEGER NOT NULL
);
CREATE INDEX sessions_by_workspace ON sessions(workspace_id,pinned DESC,updated_at DESC);
CREATE INDEX events_by_attempt ON events(attempt_id,seq);
```

Storage methods enforce the remaining semantic constraints: events and submitted plans/stages are immutable; leaf points to a conversation event; result events belong to the referenced attempt/tool; `kind` matches its typed versioned payload; a summary references only earlier events on its branch. SQL foreign keys alone do not prove these properties. Validate within the same transaction and test rollback. The parent trigger and event immutability prevent cycles.

Append transaction: validate session/run ownership and expected state; allocate/increment `next_seq`; insert events; update related attempt/tool/run state, active leaf and session timestamps; commit; acknowledge. Completion uses conditional updates requiring current ownership, running status, and no cancellation. Zero affected rows rejects stale completion and rolls back its events. Cancellation is latched once per run and is checked before every subsequent stage.

Import: validate each complete legacy session before committing it. Preserve append order, IDs, payloads and parents. `source_key` is the relative legacy file identity; unchanged digest is a no-op, changed digest requires reconciliation rather than blind append. Duplicate/cross-session IDs, invalid parents and ambiguous active leaves are reported; no silent skipped rows. Store the import marker in the transaction. Preserve the last legacy explicit branch selection and report later unreflected continuation for user review. Keep source files unchanged. Cut reads and writes over together only after import checks pass.

## Proposed pipeline and event contract

Proposed new command `run_pipeline` accepts the following version 1 payload through Tauri (outer command argument casing follows existing Tauri conventions). Keep the current single-model command until the frontend migration is separately implemented; both ultimately create a run, with a single-model turn represented by one stage.

```json
{
  "version": 1,
  "session_id": "session-opaque-id",
  "workspace_id": "workspace-opaque-id",
  "request": "Fix the broken login",
  "stages": [
    {"connection_id": "rack-a", "instruction": "Investigate and provide evidence"},
    {"connection_id": "rack-b", "instruction": "Verify the findings and implement the fix"}
  ]
}
```

The submitted array determines order; no raw `@` parsing. The backend resolves selected connections, verifies workspace/session membership, validates the whole plan before creating a run, and snapshots only non-secret execution configuration. Repeated `connection_id` values are legal. Backend-generated run, stage and attempt IDs remain distinct. API keys are runtime configuration and never enter snapshots/events/exports.

Admission response: `{version, session_id, run_id, stages: [{stage_id, attempt_id, position}]}` after durable creation. Validation/storage errors reject admission. Execution proceeds on a blocking worker using existing synchronous provider/tool boundaries; returning an unpolled future from `spawn_blocking` is insufficient.

Event envelope:

```json
{
  "version": 1,
  "event_id": "event-opaque-id-or-null-for-transient-delta",
  "seq": 12,
  "session_id": "session-opaque-id",
  "run_id": "run-opaque-id",
  "stage_id": "stage-opaque-id-or-null-for-run-event",
  "attempt_id": "attempt-opaque-id-or-null-for-run-event",
  "type": "stage_completed",
  "payload": {"result_event_id": "assistant-message-event-id"}
}
```

For transient deltas, `event_id` and `seq` are null. Persisted lifecycle events carry both. Types: `run_started`, `stage_started`, `content_delta`, `thinking_delta`, `tool_proposed`, `approval_required`, `approval_decided`, `tool_started`, `tool_finished`, `stage_completed`, `stage_failed`, `stage_cancelled`, `run_completed`, `run_failed`, `run_cancelled`, `run_interrupted`, and `persistence_error`. Persisted conversation messages have separate typed payloads. A persistence error may be transient because saving it can fail; it must never imply a durable terminal transition.

Assistant message payloads preserve text, the complete ordered tool-call array, and a response identity; results reference internal tool-execution IDs and provider call IDs. Do not infer response grouping from interleaved legacy tool calls/results when the evidence is ambiguous. Legacy records stay available even where their model-visible reconstruction needs review. Permission events preserve original/modified arguments and the decision's scope.

Successful stage: save final message, result reference and completion transition atomically; publish confirmed completion; recheck cancellation/ownership; then start the next stage. A completed generation and a passed check are separate evidence. Handoffs contain overall user request, current instruction and relevant prior results/tool evidence in stage order, labelled as evidence subordinate to user instructions. Never key results by model name.

Context contract: each resolved connection must specify verified usable context tokens and reserved output tokens. Count the complete request (system, tool definitions, history, handoffs, attachments and results), not individual outputs. Prefer the runner's verified tokenizer/count facility; unsupported counting needs a documented conservative method validated for that exact tokenizer before admission. Retain current instruction and required tool-call/result groups; trim older optional evidence with explicit truncation metadata. Fail with a visible context-limit error if required content cannot fit. Context compaction is not silently added in the first implementation.

## Approval items and implementation gate

Approve or amend the operating decisions, DDL and payload/event contract above before implementation. In particular, this proposes a new schema and command, a single-runtime ownership policy, run-scoped auto-allow, stop-on-denial, transient partial streams, and explicit backups. Those are behavior/contract decisions, not incidental refactors.

Two numerical decisions remain: maximum submitted stages (independent of the proposed five rack connections) and per-connection context/output budgets. Do not silently use five stages or infer capacity from model names. Record runner name/version, model identifier/quantization, endpoint, tool/stream support and tokenizer method for each validation setup. **No real runner/model combination has been validated by this deliverable.**

Next scoped implementation after approval: authoritative storage and its transaction/reconstruction/import checks. Provider reliability, pipeline execution and frontend wiring remain subsequent work.

## Baseline verification before storage migration

- Host: Windows, rustc/cargo 1.94.1, Node 25.7.0; rusqlite 0.31.0 resolved in the Rust build. Current suite has 71 tests; the Notion report's 79-test count is not this host's baseline.
- Original focused history test under sandbox: fails 3 versus 5. Strengthened test under sandbox: fails because zero events were saved. Same strengthened test with approved access: passes, including history loaded from disk after turn 1.
- Full baseline, approved access, `cargo test -- --test-threads=1`: **60 passed, 11 failed**. Ten storage tests fail at session creation with the Windows sync error above. The other failure is `tools::bash::tests::test_timeout_kills_process` (`out.timed_out` false); it is outside this deliverable and unchanged.
- `RUSTFLAGS='-D warnings'` focused test and `cargo clippy -- -D warnings`: both blocked by the existing unused `tauri::Manager` import at `src-tauri/src/main.rs:12`. No strict test suite is claimed to pass. The ordinary test build emits that warning.
- Frontend build: passes (`tsc` and Vite). The default npm launcher reports missing `C:/Users/rautk/AppData/Roaming/npm/node_modules/npm/bin/npm-cli.js`; invoking the existing CLI with `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run build` passes without installing packages or changing configuration.
- Proposed DDL executed in Python SQLite 3.49.1 memory database: valid linked workspace/session/run/stage/attempt/event/tool records; cross-session parent, non-preceding parent, duplicate sequence, wrong attempt membership and second active run rejected; event/state rollback, foreign-key check and integrity check pass. This checks the proposal, not the future rusqlite implementation or disk durability.
- `git diff --check`: passes. Task edits: this document and 20 diagnostic lines in the existing history test in `src-tauri/src/agent.rs`. Existing local changes retained; no production source, dependency, configuration, migration or IPC behavior changed by this task.

The test additions deliberately fail at the persistence boundary when writes are blocked. They leave the original history expectation intact and distinguish saved evidence from the in-memory reply. Follow-up storage tests must additionally verify surfaced save errors, rollback, branch continuation, response-level tool grouping, import idempotency, restart and backup/restore.

## Approved minimal storage implementation

User approval limits migration 1 to `schema_migrations`, `workspaces`, `sessions`, `events`, and `legacy_imports`. Sessions have `next_seq` and `active_leaf_id`; events retain typed payload version 1 and relational append order/parents. The exact implemented SQL is in `src-tauri/src/storage/sqlite.rs`. No run, stage, attempt, tool-execution or summary tables were introduced.

The parent `BEFORE INSERT` trigger requires an existing earlier parent in the same session. `BEFORE UPDATE` and `BEFORE DELETE` triggers abort event mutations. The insert trigger also rejects an existing event identity or sequence before conflict replacement can bypass delete triggers. These checks are tested directly against the bundled SQLite through rusqlite.

Live reads/writes now use `<default_storage_dir()>/sessions.db`. Event inserts, sequence increments, leaf changes, title changes and timestamps share one transaction. Normal and completion appends both use verified WAL / foreign keys ON / synchronous FULL / 5000 ms busy timeout settings. Branch continuation uses the transactional session leaf, rather than the legacy last-explicit-switch resolver.

An OS file lock on `runtime.lock` remains held until the last storage clone drops. A second process fails before opening the database; the OS releases the lock on process exit. Home storage initialization fails visibly for missing/empty/relative paths; no production `/tmp` fallback remains. Agent tests use isolated temporary storage by explicit test-only setup.

Legacy logs are backed up and byte-verified before import; an existing old index is snapshotted with `VACUUM INTO` and checked. Originals remain unchanged. Each complete session plus its digest marker commits atomically. Unchanged imports are no-ops; changed files, malformed JSON (including trailing fragments), invalid IDs/parents, and ambiguous branch continuation require review. Failed files are reported, and startup refuses to expose partial migration as a completed cutover. Previously imported valid sessions remain committed for a safe repeat run.

On-demand backend `StorageManager::backup` uses `VACUUM INTO`, integrity and foreign-key checks, schema verification and file synchronization. It refuses existing destinations. `restore_backup` verifies the source and creates a new authority under a retained runtime lock, refusing to overwrite an existing database. Snapshot restore is tested while the source has live WAL writes. These are storage methods; no backup UI, new Tauri commands, retention policy or automatic legacy deletion was added.

Agent storage initialization/load/append errors now emit `turn_error` and propagate through IPC. A result-save failure after a tool action explicitly reports that the tool may have acted. Durable completion is published only after its append commits. Existing provider transport, tool execution and pipeline behavior are otherwise retained.

Validation: all 20 storage tests pass, including SQL immutability/constraints, injected transaction rollback, branch continuation/reopen, second-process exclusion, import idempotency/malformed-input rollback, unsupported-version rejection, backup integrity and restore. Full ordinary Rust suite: **80 passed / 1 failed**, with the pre-existing shell-timeout assertion still failing. Strict Clippy remains blocked by the pre-existing `tauri::Manager` import; Clippy with only unused imports allowed passes. No native model/desktop workflow or actual user-data migration was performed during these checks.

Changed implementation files: `storage/sqlite.rs`, `storage/mod.rs`, and the storage integration and tests in `agent.rs`. Existing user edits are retained. The original `index.rs`/JSONL utilities remain available for legacy compatibility; live `StorageManager` operations never use them as a second authoritative store.

## Publication snapshot verification

On 7 October 2026, the session changes were isolated from pre-existing local edits before publication. The four published files are this document, storage/sqlite.rs, storage/mod.rs and only the storage-related agent.rs changes. Existing permission/cancellation/frontend/package/generated-schema/skill changes remain local.

An isolated copy of HEAD plus these exact code changes compiled and ran the Rust suite: **78 passed / 1 failed / 79 total**. All 20 storage tests and 13 agent tests passed. The only failure remains tools::bash::tests::test_timeout_kills_process; the existing tauri::Manager warning remains. The earlier 80/81 and 15-agent-test counts describe the combined local working tree, which includes two pre-existing agent tests not included in this storage commit.
