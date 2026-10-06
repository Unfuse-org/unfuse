pub mod event;
pub mod index;
pub mod jsonl;
mod sqlite;

use std::path::{Path, PathBuf};
use std::sync::Arc;

use sha2::{Digest, Sha256};

pub use event::{now_epoch_ms, truncate_tool_output, EventPayload, PersistedEvent};
pub use index::{SessionSummary, SqliteIndex};
pub use jsonl::{
    ActiveContext, JsonlSessionStore, RecoveryReport, RecoveryStatus, SessionRecoveryScanner,
};

/// Returns home storage or an error; never falls back to /tmp.
pub fn default_storage_dir() -> Result<PathBuf, String> {
    storage_dir_from_home(std::env::var_os("HOME"), std::env::var_os("USERPROFILE"))
}

fn storage_dir_from_home(
    home: Option<std::ffi::OsString>,
    profile: Option<std::ffi::OsString>,
) -> Result<PathBuf, String> {
    let home = home
        .filter(|p| !p.is_empty())
        .or_else(|| profile.filter(|p| !p.is_empty()))
        .ok_or("Cannot locate the home directory for Unfuse storage")?;
    let path = PathBuf::from(home);
    if !path.is_absolute() {
        return Err("Unfuse home storage path must be absolute".into());
    }
    Ok(path.join(".unfuse"))
}

/// Computes a deterministic SHA-256 hash for a workspace path.
pub fn compute_workspace_hash(workspace_path: &Path) -> String {
    let canonical = workspace_path
        .canonicalize()
        .unwrap_or_else(|_| workspace_path.to_path_buf());
    let mut hasher = Sha256::new();
    hasher.update(canonical.to_string_lossy().as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)[..16].to_string()
}

/// SQLite authority; JSONL and index.db are legacy import sources only.
#[derive(Clone)]
pub struct StorageManager {
    base_dir: PathBuf,
    database: Arc<sqlite::SessionDatabase>,
}

impl StorageManager {
    pub fn new() -> Result<Self, String> {
        Self::with_base_dir(default_storage_dir()?)
    }

    pub fn with_base_dir(base_dir: PathBuf) -> Result<Self, String> {
        let database = Arc::new(sqlite::SessionDatabase::open(&base_dir)?);
        let storage = Self { base_dir, database };
        storage.rebuild_index()?;
        Ok(storage)
    }

    pub fn base_dir(&self) -> &Path {
        &self.base_dir
    }
    pub fn database_path(&self) -> &Path {
        &self.database.path
    }
    pub fn sessions_dir(&self) -> PathBuf {
        self.base_dir.join("sessions")
    }

    /// Legacy file location; live history is in sessions.db.
    pub fn session_file_path(&self, workspace_path: &Path, session_id: &str) -> PathBuf {
        self.sessions_dir()
            .join(compute_workspace_hash(workspace_path))
            .join(format!("{}.jsonl", session_id))
    }

    pub fn create_session(
        &self,
        workspace_path: &Path,
        session_id: &str,
        title: Option<&str>,
    ) -> Result<SessionSummary, String> {
        self.database
            .create_session(workspace_path, session_id, title)
    }

    pub fn append_event(
        &self,
        workspace_path: &Path,
        event: &PersistedEvent,
    ) -> Result<(), String> {
        self.database.append(workspace_path, event)
    }

    /// All appends commit with synchronous=FULL, including completion.
    pub fn append_event_durable(
        &self,
        workspace_path: &Path,
        event: &PersistedEvent,
    ) -> Result<(), String> {
        self.append_event(workspace_path, event)
    }

    pub fn load_session_events(
        &self,
        workspace_path: &Path,
        session_id: &str,
    ) -> Result<Vec<PersistedEvent>, String> {
        self.database
            .load(workspace_path, session_id)
            .map(|(events, _)| events)
    }

    pub fn reconstruct_active_context(
        &self,
        workspace_path: &Path,
        session_id: &str,
        target_leaf_id: Option<&str>,
    ) -> Result<ActiveContext, String> {
        let (events, leaf) = self.database.load(workspace_path, session_id)?;
        let target = target_leaf_id.or(leaf.as_deref());
        if let Some(target) = target {
            if !events.iter().any(|e| e.id == target) {
                return Err("Active leaf does not belong to session".into());
            }
        }
        JsonlSessionStore::reconstruct_active_context(&events, target)
    }

    pub fn recover_session(
        &self,
        workspace_path: &Path,
        session_id: &str,
    ) -> Result<RecoveryReport, String> {
        let context = self.reconstruct_active_context(workspace_path, session_id, None)?;
        Ok(SessionRecoveryScanner::audit_session(&context.events))
    }

    pub fn switch_active_leaf(
        &self,
        workspace_path: &Path,
        session_id: &str,
        target_leaf_id: &str,
    ) -> Result<(), String> {
        let event = PersistedEvent::new(
            session_id,
            Some(target_leaf_id.into()),
            EventPayload::ActiveLeaf {
                leaf_id: target_leaf_id.into(),
            },
        );
        self.append_event(workspace_path, &event)
    }

    pub fn list_sessions(
        &self,
        workspace_path: Option<&Path>,
    ) -> Result<Vec<SessionSummary>, String> {
        self.database.list(workspace_path, None)
    }

    pub fn search_sessions(
        &self,
        workspace_path: Option<&Path>,
        query: &str,
    ) -> Result<Vec<SessionSummary>, String> {
        self.database.list(workspace_path, Some(query))
    }

    pub fn backup(&self, destination: &Path) -> Result<(), String> {
        self.database.backup(destination)
    }

    /// Fresh-directory restore only; never overwrites an existing authority.
    pub fn restore_backup(source: &Path, base_dir: PathBuf) -> Result<Self, String> {
        let runtime_lock = sqlite::lock_runtime(&base_dir)?;
        sqlite::SessionDatabase::verify_backup(source)?;
        let destination = base_dir.join("sessions.db");
        let input = rusqlite::Connection::open_with_flags(
            source,
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
        )
        .map_err(|e| e.to_string())?;
        sqlite::snapshot(&input, &destination)?;
        sqlite::SessionDatabase::verify_backup(&destination)?;
        drop(input);
        let database = Arc::new(sqlite::SessionDatabase::open_locked(
            &base_dir,
            runtime_lock,
        )?);
        let storage = Self { base_dir, database };
        storage.rebuild_index()?;
        Ok(storage)
    }

    /// IPC-compatible name: idempotent legacy import, never clears the authority.
    pub fn rebuild_index(&self) -> Result<usize, String> {
        let sessions_dir = self.sessions_dir();
        if !sessions_dir.exists() {
            return Ok(0);
        }
        let mut sources = Vec::new();
        for directory in std::fs::read_dir(&sessions_dir).map_err(|e| e.to_string())? {
            let directory = directory.map_err(|e| e.to_string())?;
            if !directory.file_type().map_err(|e| e.to_string())?.is_dir() {
                continue;
            }
            for entry in std::fs::read_dir(directory.path()).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                if !entry.file_type().map_err(|e| e.to_string())?.is_file()
                    || entry.path().extension().and_then(|e| e.to_str()) != Some("jsonl")
                {
                    continue;
                }
                let path = entry.path();
                let key = path
                    .strip_prefix(&sessions_dir)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .into_owned();
                let contents = std::fs::read(&path)
                    .map_err(|e| format!("Cannot read legacy file {key}: {e}"))?;
                if self.database.needs_import(&key, &contents)? {
                    sources.push((key, contents));
                }
            }
        }
        sources.sort_by(|a, b| a.0.cmp(&b.0));
        if sources.is_empty() {
            return Ok(0);
        }
        let backup_dir = self
            .base_dir
            .join("backups")
            .join(format!("legacy_{}", event::generate_event_id()));
        std::fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
        for (key, contents) in &sources {
            let destination = backup_dir.join("sessions").join(key);
            std::fs::create_dir_all(destination.parent().ok_or("Invalid backup path")?)
                .map_err(|e| e.to_string())?;
            use std::io::Write;
            let mut file = std::fs::File::create_new(&destination).map_err(|e| e.to_string())?;
            file.write_all(contents).map_err(|e| e.to_string())?;
            file.sync_all().map_err(|e| e.to_string())?;
            if std::fs::read(&destination).map_err(|e| e.to_string())? != *contents {
                return Err("Legacy backup verification failed".into());
            }
        }
        let old_index = self.base_dir.join("index.db");
        if old_index.exists() {
            let conn = rusqlite::Connection::open_with_flags(
                &old_index,
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            )
            .map_err(|e| e.to_string())?;
            sqlite::snapshot(&conn, &backup_dir.join("index.db"))?;
        }
        let mut imported = 0;
        let mut errors = Vec::new();
        for (key, contents) in sources {
            match self.database.import_file(&key, &contents) {
                Ok(true) => imported += 1,
                Ok(false) => {}
                Err(e) => errors.push(format!("{key}: {e}")),
            }
        }
        if !errors.is_empty() {
            return Err(format!(
                "Legacy import requires review (originals preserved):\n{}",
                errors.join("\n")
            ));
        }
        Ok(imported)
    }
}

// ---------------------------------------------------------------------------
// Global Storage Manager Instance for Tauri
// ---------------------------------------------------------------------------

use std::sync::OnceLock;

static GLOBAL_STORAGE: OnceLock<Result<StorageManager, String>> = OnceLock::new();

pub fn get_storage() -> Result<&'static StorageManager, String> {
    GLOBAL_STORAGE
        .get_or_init(|| {
            #[cfg(test)]
            {
                StorageManager::with_base_dir(std::env::temp_dir().join(format!(
                    "unfuse_agent_storage_{}_{}",
                    std::process::id(),
                    now_epoch_ms()
                )))
            }
            #[cfg(not(test))]
            {
                StorageManager::new()
            }
        })
        .as_ref()
        .map_err(Clone::clone)
}

// ---------------------------------------------------------------------------
// Tauri IPC Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn create_session(
    workspace_root: String,
    session_id: String,
    title: Option<String>,
) -> Result<SessionSummary, String> {
    let storage = get_storage()?;
    storage.create_session(Path::new(&workspace_root), &session_id, title.as_deref())
}

#[tauri::command]
pub fn load_session(
    workspace_root: String,
    session_id: String,
    target_leaf_id: Option<String>,
) -> Result<ActiveContextPayload, String> {
    let storage = get_storage()?;
    let ctx = storage.reconstruct_active_context(
        Path::new(&workspace_root),
        &session_id,
        target_leaf_id.as_deref(),
    )?;

    let recovery = storage.recover_session(Path::new(&workspace_root), &session_id)?;

    Ok(ActiveContextPayload {
        active_leaf_id: ctx.active_leaf_id,
        total_events: ctx.events.len(),
        events: ctx.events,
        is_interrupted: matches!(recovery.status, RecoveryStatus::Interrupted { .. }),
        interruption_notice: recovery.ephemeral_notice,
    })
}

#[tauri::command]
pub fn list_sessions(workspace_root: Option<String>) -> Result<Vec<SessionSummary>, String> {
    let storage = get_storage()?;
    let path = workspace_root.as_ref().map(Path::new);
    storage.list_sessions(path)
}

#[tauri::command]
pub fn search_sessions(
    query: String,
    workspace_root: Option<String>,
) -> Result<Vec<SessionSummary>, String> {
    let storage = get_storage()?;
    let path = workspace_root.as_ref().map(Path::new);
    storage.search_sessions(path, &query)
}

#[tauri::command]
pub fn rebuild_index() -> Result<usize, String> {
    let storage = get_storage()?;
    storage.rebuild_index()
}

/// DTO returned over Tauri IPC when loading a session.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct ActiveContextPayload {
    pub active_leaf_id: Option<String>,
    pub total_events: usize,
    pub events: Vec<PersistedEvent>,
    pub is_interrupted: bool,
    pub interruption_notice: Option<String>,
}

// ---------------------------------------------------------------------------
// Comprehensive Unit & Integration Tests
#[cfg(test)]
mod tests {
    use super::*;

    struct TestDir {
        path: PathBuf,
    }

    impl TestDir {
        fn new(prefix: &str) -> Self {
            use std::sync::atomic::{AtomicU64, Ordering};
            static COUNTER: AtomicU64 = AtomicU64::new(0);
            let id = COUNTER.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir().join(format!("{}_{}_{}", prefix, now_epoch_ms(), id));
            std::fs::create_dir_all(&path).unwrap();
            Self { path }
        }
    }

    impl Drop for TestDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.path);
        }
    }

    fn test_storage() -> (StorageManager, TestDir) {
        let dir = TestDir::new("unfuse_test_storage");
        let storage = StorageManager::with_base_dir(dir.path.clone())
            .expect("Failed to initialize test storage");
        (storage, dir)
    }

    #[test]
    fn test_home_storage_requires_an_absolute_available_home() {
        assert!(storage_dir_from_home(None,None).is_err());
        assert!(storage_dir_from_home(Some("".into()),Some("".into())).is_err());
        assert!(storage_dir_from_home(Some("relative".into()),None).is_err());
        let home = std::env::temp_dir();
        assert_eq!(storage_dir_from_home(None,Some(home.clone().into_os_string())).unwrap(),home.join(".unfuse"));
    }

    #[test]
    fn test_session_creation_and_index_listing() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");

        let summary = storage
            .create_session(ws, "sess-1", Some("My Test Session"))
            .expect("create_session failed");

        assert_eq!(summary.session_id, "sess-1");
        assert_eq!(summary.title, "My Test Session");

        let list = storage.list_sessions(Some(ws)).expect("list failed");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].session_id, "sess-1");
    }

    #[test]
    fn test_append_read_round_trip() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");
        storage.create_session(ws, "sess-roundtrip", None).unwrap();

        let evt1 = PersistedEvent::new(
            "sess-roundtrip",
            None,
            EventPayload::UserTurn {
                prompt: "Hello Unfuse".to_string(),
                attached_files: vec![],
            },
        );
        let evt1_id = evt1.id.clone();
        storage.append_event(ws, &evt1).unwrap();

        let evt2 = PersistedEvent::new(
            "sess-roundtrip",
            Some(evt1_id.clone()),
            EventPayload::AssistantTurn {
                content: "Hello! How can I assist you?".to_string(),
                model: "test-model".to_string(),
            },
        );
        storage.append_event(ws, &evt2).unwrap();

        let loaded = storage.load_session_events(ws, "sess-roundtrip").unwrap();
        // SessionMetadata + 2 events = 3 events total
        assert_eq!(loaded.len(), 3);
        assert_eq!(loaded[1].id, evt1_id);
        assert_eq!(loaded[2].parent_id, Some(evt1_id));
    }

    #[test]
    fn test_parent_id_traversal_and_branching() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");
        let meta = storage.create_session(ws, "sess-branch", None).unwrap();
        let meta_id = meta.active_leaf_id.unwrap();

        // Turn 1
        let u1 = PersistedEvent::new(
            "sess-branch",
            Some(meta_id),
            EventPayload::UserTurn {
                prompt: "Initial prompt".to_string(),
                attached_files: vec![],
            },
        );
        let u1_id = u1.id.clone();
        storage.append_event(ws, &u1).unwrap();

        // Branch A: Turn 2a
        let a2 = PersistedEvent::new(
            "sess-branch",
            Some(u1_id.clone()),
            EventPayload::AssistantTurn {
                content: "Answer from Model A".to_string(),
                model: "model-a".to_string(),
            },
        );
        let a2_id = a2.id.clone();
        storage.append_event(ws, &a2).unwrap();

        // Branch B: Turn 2b (forking from u1_id without deleting Branch A)
        let b2 = PersistedEvent::new(
            "sess-branch",
            Some(u1_id.clone()),
            EventPayload::AssistantTurn {
                content: "Alternative answer from Model B".to_string(),
                model: "model-b".to_string(),
            },
        );
        let b2_id = b2.id.clone();
        storage.append_event(ws, &b2).unwrap();

        // Verify that raw log retains all events across both branches
        let all_events = storage.load_session_events(ws, "sess-branch").unwrap();
        assert_eq!(all_events.len(), 4); // Meta + U1 + A2 + B2

        // Context reconstructed for Branch A
        let ctx_a = storage
            .reconstruct_active_context(ws, "sess-branch", Some(&a2_id))
            .unwrap();
        assert_eq!(ctx_a.chat_messages.len(), 2);
        assert_eq!(ctx_a.chat_messages[0].content, "Initial prompt");
        assert_eq!(ctx_a.chat_messages[1].content, "Answer from Model A");

        // Context reconstructed for Branch B
        let ctx_b = storage
            .reconstruct_active_context(ws, "sess-branch", Some(&b2_id))
            .unwrap();
        assert_eq!(ctx_b.chat_messages.len(), 2);
        assert_eq!(ctx_b.chat_messages[0].content, "Initial prompt");
        assert_eq!(
            ctx_b.chat_messages[1].content,
            "Alternative answer from Model B"
        );
    }

    #[test]
    fn test_tool_call_and_result_persistence() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");
        storage.create_session(ws, "sess-tools", None).unwrap();

        let call_evt = PersistedEvent::new(
            "sess-tools",
            None,
            EventPayload::ToolCall {
                call_id: "call-1".to_string(),
                tool: "read_file".to_string(),
                arguments: "{\"path\":\"Cargo.toml\"}".to_string(),
                stage_index: None,
            },
        );
        storage.append_event(ws, &call_evt).unwrap();

        let result_evt = PersistedEvent::new(
            "sess-tools",
            Some(call_evt.id.clone()),
            EventPayload::ToolResult {
                call_id: "call-1".to_string(),
                tool: "read_file".to_string(),
                is_error: false,
                output: "[package]\nname = \"unfuse-desktop\"".to_string(),
                stage_index: None,
            },
        );
        storage.append_event(ws, &result_evt).unwrap();

        let events = storage.load_session_events(ws, "sess-tools").unwrap();
        assert_eq!(events.len(), 3); // Meta + Call + Result
    }

    #[test]
    fn test_interrupted_session_recovery_without_mutating_jsonl() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");
        storage.create_session(ws, "sess-crash", None).unwrap();

        // User initiates turn
        let user_evt = PersistedEvent::new(
            "sess-crash",
            None,
            EventPayload::UserTurn {
                prompt: "Write a file".to_string(),
                attached_files: vec![],
            },
        );
        storage.append_event(ws, &user_evt).unwrap();

        // Model emits tool call
        let call_evt = PersistedEvent::new(
            "sess-crash",
            Some(user_evt.id.clone()),
            EventPayload::ToolCall {
                call_id: "call-99".to_string(),
                tool: "write_file".to_string(),
                arguments: "{\"path\":\"a.txt\"}".to_string(),
                stage_index: None,
            },
        );
        storage.append_event(ws, &call_evt).unwrap();

        // Application abruptly crashes here: no ToolResult was appended!
        let report = storage.recover_session(ws, "sess-crash").unwrap();
        assert!(matches!(report.status, RecoveryStatus::Interrupted { .. }));
        assert!(report.ephemeral_notice.is_some());

        // Verify JSONL is completely unmutated (original 3 events, no synthetic events written)
        let loaded = storage.load_session_events(ws, "sess-crash").unwrap();
        assert_eq!(loaded.len(), 3);
    }

    #[test]
    fn test_legacy_import_is_idempotent_and_preserves_originals() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_ws");
        let path = storage.session_file_path(ws,"legacy-1");
        let metadata = PersistedEvent::new("legacy-1",None,EventPayload::SessionMetadata {
            workspace_path:ws.to_string_lossy().into_owned(),workspace_hash:compute_workspace_hash(ws),title:"Legacy".into()
        });
        let user = PersistedEvent::new("legacy-1",Some(metadata.id.clone()),EventPayload::UserTurn { prompt:"hello".into(),attached_files:vec![] });
        JsonlSessionStore::append_event(&path,&metadata).unwrap();
        JsonlSessionStore::append_event(&path,&user).unwrap();
        let original = std::fs::read(&path).unwrap();
        assert_eq!(storage.rebuild_index().unwrap(),1);
        assert_eq!(storage.rebuild_index().unwrap(),0);
        assert_eq!(storage.load_session_events(ws,"legacy-1").unwrap(),vec![metadata,user]);
        assert_eq!(std::fs::read(&path).unwrap(),original);
        assert!(storage.base_dir().join("backups").is_dir());
    }

    #[test]
    fn test_workspace_isolation() {
        let (storage, _dir) = test_storage();
        let ws1 = Path::new("/tmp/ws_alpha");
        let ws2 = Path::new("/tmp/ws_beta");

        storage
            .create_session(ws1, "sess-alpha", Some("Alpha Task"))
            .unwrap();
        storage
            .create_session(ws2, "sess-beta", Some("Beta Task"))
            .unwrap();

        let list1 = storage.list_sessions(Some(ws1)).unwrap();
        assert_eq!(list1.len(), 1);
        assert_eq!(list1[0].session_id, "sess-alpha");

        let list2 = storage.list_sessions(Some(ws2)).unwrap();
        assert_eq!(list2.len(), 1);
        assert_eq!(list2[0].session_id, "sess-beta");
    }

    #[test]
    fn test_search_sessions_by_title_and_prompt() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_search");

        storage
            .create_session(ws, "s-search-1", Some("Refactor authentication"))
            .unwrap();
        let s2 = storage
            .create_session(ws, "s-search-2", Some("Bug triage"))
            .unwrap();

        // Append a user prompt with a searchable keyword into session 2
        let user_evt = PersistedEvent::new(
            "s-search-2",
            s2.active_leaf_id,
            EventPayload::UserTurn {
                prompt: "Please investigate postgres connection timeout".to_string(),
                attached_files: vec![],
            },
        );
        storage.append_event(ws, &user_evt).unwrap();

        // Search by title
        let search_title = storage.search_sessions(Some(ws), "authentication").unwrap();
        assert_eq!(search_title.len(), 1);
        assert_eq!(search_title[0].session_id, "s-search-1");

        // Search by user prompt snippet
        let search_prompt = storage.search_sessions(Some(ws), "postgres").unwrap();
        assert_eq!(search_prompt.len(), 1);
        assert_eq!(search_prompt[0].session_id, "s-search-2");
    }

    #[test]
    fn test_turn_count_accumulation_and_title_retention() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_accumulation");

        // Create session with an explicit title
        let s = storage
            .create_session(ws, "sess-accum", Some("Explicit Feature Plan"))
            .unwrap();
        let initial_created_at = s.created_at;

        // Turn 1: user prompt
        let u1 = PersistedEvent::new(
            "sess-accum",
            s.active_leaf_id,
            EventPayload::UserTurn {
                prompt: "First user request".to_string(),
                attached_files: vec![],
            },
        );
        let u1_id = u1.id.clone();
        storage.append_event(ws, &u1).unwrap();

        // Turn 1: assistant response (turn_count should NOT increment on assistant turn)
        let a1 = PersistedEvent::new(
            "sess-accum",
            Some(u1_id),
            EventPayload::AssistantTurn {
                content: "First assistant response".to_string(),
                model: "test-model".to_string(),
            },
        );
        let a1_id = a1.id.clone();
        storage.append_event(ws, &a1).unwrap();

        let list1 = storage.list_sessions(Some(ws)).unwrap();
        assert_eq!(list1.len(), 1);
        assert_eq!(list1[0].turn_count, 1);
        assert_eq!(list1[0].title, "Explicit Feature Plan"); // Explicit title never destroyed
        assert_eq!(list1[0].created_at, initial_created_at); // created_at never overwritten

        // Turn 2: second user prompt
        let u2 = PersistedEvent::new(
            "sess-accum",
            Some(a1_id),
            EventPayload::UserTurn {
                prompt: "Second user request".to_string(),
                attached_files: vec![],
            },
        );
        storage.append_event(ws, &u2).unwrap();

        let list2 = storage.list_sessions(Some(ws)).unwrap();
        assert_eq!(list2.len(), 1);
        assert_eq!(list2[0].turn_count, 2); // turn_count accumulated 1 + 1 = 2
        assert_eq!(list2[0].title, "Explicit Feature Plan"); // Title preserved
        assert_eq!(list2[0].created_at, initial_created_at); // created_at preserved
    }

    #[test]
    fn test_truncate_tool_output_utf8_multibyte_safety() {
        // Multi-byte Unicode characters: Marathi / Hindi (3 bytes), Chinese (3 bytes), Emojis (4 bytes)
        let sample = "नमस्कार 世界 🚀 ";
        // Replicate until well beyond MAX_TOOL_OUTPUT_CHARS
        let mut large_multibyte = String::new();
        while large_multibyte.chars().count() < 100_050 {
            large_multibyte.push_str(sample);
        }

        // Must not panic on character boundary
        let truncated = truncate_tool_output(&large_multibyte);
        assert!(truncated.contains("[UNFUSE STORAGE: Output truncated at 100000 chars"));
    }

    #[test]
    fn test_read_events_corrupted_middle_line_rejected() {
        let (storage, _dir) = test_storage();
        let ws = Path::new("/tmp/test_middle_corruption");
        let file_path = storage.session_file_path(ws, "sess-corrupt");

        // Create session
        let initial = PersistedEvent::new("sess-corrupt",None,EventPayload::SessionMetadata { workspace_path:ws.to_string_lossy().into_owned(), workspace_hash:compute_workspace_hash(ws),title:"New Session".into() });
        JsonlSessionStore::append_event(&file_path,&initial).unwrap();

        // Append valid event
        let u1 = PersistedEvent::new(
            "sess-corrupt",
            None,
            EventPayload::UserTurn {
                prompt: "Valid user turn".to_string(),
                attached_files: vec![],
            },
        );
        JsonlSessionStore::append_event(&file_path,&u1).unwrap();

        // Intentionally inject corrupted JSON in the middle
        {
            use std::fs::OpenOptions;
            use std::io::Write;
            let mut f = OpenOptions::new().append(true).open(&file_path).unwrap();
            writeln!(f, "{{\"invalid_json_middle\": true,").unwrap(); // Corrupted middle line
        }

        // Append another valid event AFTER the corrupted line
        {
            let u2 = PersistedEvent::new(
                "sess-corrupt",
                Some(u1.id.clone()),
                EventPayload::UserTurn {
                    prompt: "Turn after corruption".to_string(),
                    attached_files: vec![],
                },
            );
            use std::fs::OpenOptions;
            use std::io::Write;
            let mut f = OpenOptions::new().append(true).open(&file_path).unwrap();
            writeln!(f, "{}", serde_json::to_string(&u2).unwrap()).unwrap();
        }

        // Reading must fail with corruption error rather than silently swallowing
        let res = JsonlSessionStore::read_events(&file_path);
        assert!(res.is_err(), "Expected error for corrupted middle line");
        let err_msg = res.unwrap_err();
        assert!(err_msg.contains("Corrupted session log at line 3"));
    }
}
