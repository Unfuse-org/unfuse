use std::fs::{self, File, OpenOptions};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::{params, Connection, OpenFlags, OptionalExtension, Transaction};
use sha2::{Digest, Sha256};

use super::{compute_workspace_hash, now_epoch_ms, EventPayload, PersistedEvent, SessionSummary};

const MIGRATION_1: &str = r#"
CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY CHECK(version>0), applied_at INTEGER NOT NULL);
CREATE TABLE workspaces(id TEXT PRIMARY KEY NOT NULL, canonical_path TEXT NOT NULL UNIQUE);
CREATE TABLE sessions(
 id TEXT PRIMARY KEY NOT NULL, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
 title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
 next_seq INTEGER NOT NULL DEFAULT 1 CHECK(next_seq>0), active_leaf_id TEXT,
 FOREIGN KEY(id,active_leaf_id) REFERENCES events(session_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE events(
 id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL REFERENCES sessions(id),
 seq INTEGER NOT NULL CHECK(seq>0), timestamp INTEGER NOT NULL, kind TEXT NOT NULL,
 payload_version INTEGER NOT NULL CHECK(payload_version=1),
 payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), parent_id TEXT,
 UNIQUE(session_id,id), UNIQUE(session_id,seq),
 FOREIGN KEY(session_id,parent_id) REFERENCES events(session_id,id)
);
CREATE TRIGGER parent_precedes_child BEFORE INSERT ON events BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM events WHERE id=NEW.id OR
 (session_id=NEW.session_id AND seq=NEW.seq)) THEN RAISE(ABORT,'event identity and sequence are immutable') END;
 SELECT CASE WHEN NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM events WHERE session_id=NEW.session_id
 AND id=NEW.parent_id AND seq<NEW.seq) THEN RAISE(ABORT,'parent must precede child in same session') END;
END;
CREATE TRIGGER events_no_update BEFORE UPDATE ON events BEGIN
 SELECT RAISE(ABORT,'events are immutable'); END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events BEGIN
 SELECT RAISE(ABORT,'events are immutable'); END;
CREATE TABLE legacy_imports(source_key TEXT PRIMARY KEY NOT NULL, source_sha256 TEXT NOT NULL,
 session_id TEXT NOT NULL REFERENCES sessions(id), imported_at INTEGER NOT NULL);
CREATE INDEX sessions_by_workspace ON sessions(workspace_id,updated_at DESC);
"#;

/// The file handle retains the OS lock until the last StorageManager clone drops.
pub struct SessionDatabase {
    conn: Mutex<Connection>,
    _runtime_lock: File,
    pub path: PathBuf,
}

fn error(e: impl std::fmt::Display) -> String {
    format!("SQLite storage: {e}")
}

pub fn lock_runtime(base_dir: &Path) -> Result<File, String> {
    fs::create_dir_all(base_dir).map_err(error)?;
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(base_dir.join("runtime.lock"))
        .map_err(error)?;
    file.try_lock().map_err(|e| {
        format!("Storage is already owned by another runtime, or cannot be locked: {e}")
    })?;
    Ok(file)
}

fn verify(conn: &Connection) -> Result<(), String> {
    let integrity: String = conn
        .query_row("PRAGMA integrity_check", [], |r| r.get(0))
        .map_err(error)?;
    if integrity != "ok" {
        return Err(format!("Database integrity check failed: {integrity}"));
    }
    let mut stmt = conn.prepare("PRAGMA foreign_key_check").map_err(error)?;
    if stmt
        .query([])
        .map_err(error)?
        .next()
        .map_err(error)?
        .is_some()
    {
        return Err("Database foreign key check failed".into());
    }
    Ok(())
}

pub fn snapshot(conn: &Connection, destination: &Path) -> Result<(), String> {
    // Never overwrite a previous usable backup (VACUUM INTO otherwise accepts an empty file).
    if destination.exists() {
        return Err("Backup destination already exists".into());
    }
    conn.execute(
        "VACUUM INTO ?1",
        params![destination.to_str().ok_or("Backup path is not UTF-8")?],
    )
    .map_err(error)?;
    let backup = Connection::open_with_flags(destination, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(error)?;
    verify(&backup)?;
    OpenOptions::new()
        .write(true)
        .open(destination)
        .map_err(error)?
        .sync_all()
        .map_err(error)?;
    Ok(())
}

impl SessionDatabase {
    pub fn open(base_dir: &Path) -> Result<Self, String> {
        let runtime_lock = lock_runtime(base_dir)?;
        Self::open_locked(base_dir, runtime_lock)
    }

    pub fn open_locked(base_dir: &Path, runtime_lock: File) -> Result<Self, String> {
        let path = base_dir.join("sessions.db");
        let mut conn = Connection::open(&path).map_err(error)?;
        // Read the version before changing any journal settings or schema.
        let has_migrations: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations')",
            [], |r| r.get(0)).map_err(error)?;
        let version: i64 = if has_migrations {
            conn.query_row(
                "SELECT coalesce(max(version),0) FROM schema_migrations",
                [],
                |r| r.get(0),
            )
            .map_err(error)?
        } else {
            0
        };
        if version > 1 {
            return Err(format!("Unsupported storage schema version {version}"));
        }
        if version == 0 {
            let tables: i64 = conn.query_row("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", [], |r| r.get(0)).map_err(error)?;
            if tables != 0 {
                return Err("Unversioned nonempty sessions.db; refusing to migrate".into());
            }
        }
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;").map_err(error)?;
        let mode: String = conn
            .query_row("PRAGMA journal_mode", [], |r| r.get(0))
            .map_err(error)?;
        let foreign_keys: i64 = conn
            .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
            .map_err(error)?;
        let sync: i64 = conn
            .query_row("PRAGMA synchronous", [], |r| r.get(0))
            .map_err(error)?;
        let timeout: i64 = conn
            .query_row("PRAGMA busy_timeout", [], |r| r.get(0))
            .map_err(error)?;
        if mode != "wal" || foreign_keys != 1 || sync != 2 || timeout != 5000 {
            return Err("Required SQLite connection settings were not applied".into());
        }
        if version == 0 {
            let tx = conn.transaction().map_err(error)?;
            tx.execute_batch(MIGRATION_1).map_err(error)?;
            tx.execute(
                "INSERT INTO schema_migrations VALUES(1,?1)",
                params![now_epoch_ms() as i64],
            )
            .map_err(error)?;
            tx.commit().map_err(error)?;
        }
        verify(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
            _runtime_lock: runtime_lock,
            path,
        })
    }

    pub fn create_session(
        &self,
        workspace: &Path,
        id: &str,
        title: Option<&str>,
    ) -> Result<SessionSummary, String> {
        if id.trim().is_empty() {
            return Err("session_id is required".into());
        }
        let mut conn = self.conn.lock().map_err(error)?;
        let tx = conn.transaction().map_err(error)?;
        let ws = workspace
            .canonicalize()
            .unwrap_or_else(|_| workspace.to_path_buf())
            .to_string_lossy()
            .into_owned();
        let hash = compute_workspace_hash(workspace);
        tx.execute(
            "INSERT INTO workspaces VALUES(?1,?2) ON CONFLICT(id) DO NOTHING",
            params![hash, ws],
        )
        .map_err(error)?;
        let stored_path: String = tx
            .query_row(
                "SELECT canonical_path FROM workspaces WHERE id=?1",
                params![hash],
                |r| r.get(0),
            )
            .map_err(error)?;
        if stored_path != ws {
            return Err("Workspace identity collision".into());
        }
        let title = title.unwrap_or("New Session");
        let event = PersistedEvent::new(
            id,
            None,
            EventPayload::SessionMetadata {
                workspace_path: ws.clone(),
                workspace_hash: hash.clone(),
                title: title.into(),
            },
        );
        tx.execute("INSERT INTO sessions(id,workspace_id,title,created_at,updated_at) VALUES(?1,?2,?3,?4,?4)", params![id,hash,title,event.timestamp as i64]).map_err(error)?;
        Self::insert_event(&tx, &event)?;
        tx.commit().map_err(error)?;
        Ok(SessionSummary {
            session_id: id.into(),
            workspace_hash: hash,
            workspace_path: ws,
            title: title.into(),
            created_at: event.timestamp,
            updated_at: event.timestamp,
            turn_count: 0,
            active_leaf_id: Some(event.id),
        })
    }

    fn insert_event(tx: &Transaction<'_>, event: &PersistedEvent) -> Result<(), String> {
        let payload = serde_json::to_value(&event.payload).map_err(error)?;
        let kind = payload["type"].as_str().ok_or("Event kind is missing")?;
        let seq: i64 = tx
            .query_row(
                "SELECT next_seq FROM sessions WHERE id=?1",
                params![event.session_id],
                |r| r.get(0),
            )
            .map_err(error)?;
        if let EventPayload::ActiveLeaf { leaf_id } = &event.payload {
            let exists: bool = tx.query_row("SELECT EXISTS(SELECT 1 FROM events WHERE session_id=?1 AND id=?2 AND kind!='ActiveLeaf')",params![event.session_id,leaf_id],|r|r.get(0)).map_err(error)?;
            if !exists {
                return Err("Branch target does not belong to session".into());
            }
        }
        tx.execute(
            "INSERT INTO events VALUES(?1,?2,?3,?4,?5,1,?6,?7)",
            params![
                event.id,
                event.session_id,
                seq,
                event.timestamp as i64,
                kind,
                serde_json::to_string(&event.payload).map_err(error)?,
                event.parent_id
            ],
        )
        .map_err(error)?;
        let leaf = match &event.payload {
            EventPayload::ActiveLeaf { leaf_id } => leaf_id,
            _ => &event.id,
        };
        tx.execute(
            "UPDATE sessions SET next_seq=next_seq+1, active_leaf_id=?2, updated_at=?3 WHERE id=?1",
            params![event.session_id, leaf, event.timestamp as i64],
        )
        .map_err(error)?;
        if let EventPayload::UserTurn { prompt, .. } = &event.payload {
            if !prompt.trim().is_empty() {
                tx.execute(
                    "UPDATE sessions SET title=?2 WHERE id=?1 AND title IN ('','New Session')",
                    params![
                        event.session_id,
                        prompt.chars().take(40).collect::<String>()
                    ],
                )
                .map_err(error)?;
            }
        }
        Ok(())
    }

    fn check_workspace(conn: &Connection, workspace: &Path, id: &str) -> Result<bool, String> {
        let hash: Option<String> = conn
            .query_row(
                "SELECT workspace_id FROM sessions WHERE id=?1",
                params![id],
                |r| r.get(0),
            )
            .optional()
            .map_err(error)?;
        match hash {
            None => Ok(false),
            Some(hash) if hash == compute_workspace_hash(workspace) => Ok(true),
            _ => Err("Session belongs to a different workspace".into()),
        }
    }

    pub fn append(&self, workspace: &Path, event: &PersistedEvent) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(error)?;
        let tx = conn.transaction().map_err(error)?;
        if !Self::check_workspace(&tx, workspace, &event.session_id)? {
            return Err("Session does not exist".into());
        }
        Self::insert_event(&tx, event)?;
        tx.commit().map_err(error)
    }

    pub fn load(
        &self,
        workspace: &Path,
        id: &str,
    ) -> Result<(Vec<PersistedEvent>, Option<String>), String> {
        let conn = self.conn.lock().map_err(error)?;
        if !Self::check_workspace(&conn, workspace, id)? {
            return Ok((vec![], None));
        }
        let leaf = conn
            .query_row(
                "SELECT active_leaf_id FROM sessions WHERE id=?1",
                params![id],
                |r| r.get(0),
            )
            .map_err(error)?;
        let mut stmt = conn.prepare("SELECT id,parent_id,timestamp,kind,payload_version,payload_json FROM events WHERE session_id=?1 ORDER BY seq").map_err(error)?;
        let mut rows = stmt.query(params![id]).map_err(error)?;
        let mut events = vec![];
        while let Some(row) = rows.next().map_err(error)? {
            let version: i64 = row.get(4).map_err(error)?;
            if version != 1 {
                return Err(format!("Unsupported event payload version {version}"));
            }
            let json: String = row.get(5).map_err(error)?;
            let value: serde_json::Value = serde_json::from_str(&json).map_err(error)?;
            let kind: String = row.get(3).map_err(error)?;
            if value["type"].as_str() != Some(&kind) {
                return Err("Event kind/payload mismatch".into());
            }
            events.push(PersistedEvent {
                id: row.get(0).map_err(error)?,
                parent_id: row.get(1).map_err(error)?,
                session_id: id.into(),
                timestamp: row.get::<_, i64>(2).map_err(error)? as u64,
                payload: serde_json::from_value(value).map_err(error)?,
            });
        }
        Ok((events, leaf))
    }

    pub fn list(
        &self,
        workspace: Option<&Path>,
        query: Option<&str>,
    ) -> Result<Vec<SessionSummary>, String> {
        let conn = self.conn.lock().map_err(error)?;
        let hash = workspace.map(compute_workspace_hash);
        let pattern = query.map(|q| format!("%{}%", q.trim()));
        let mut stmt = conn.prepare("SELECT s.id,w.id,w.canonical_path,s.title,s.created_at,s.updated_at,s.active_leaf_id,
          (SELECT count(*) FROM events e WHERE e.session_id=s.id AND e.kind='UserTurn')
          FROM sessions s JOIN workspaces w ON w.id=s.workspace_id
          WHERE (?1 IS NULL OR w.id=?1) AND (?2 IS NULL OR s.title LIKE ?2 OR EXISTS(
           SELECT 1 FROM events e WHERE e.session_id=s.id AND e.kind='UserTurn' AND json_extract(e.payload_json,'$.data.prompt') LIKE ?2))
          ORDER BY s.updated_at DESC,s.id").map_err(error)?;
        let rows = stmt
            .query_map(params![hash, pattern], |r| {
                Ok(SessionSummary {
                    session_id: r.get(0)?,
                    workspace_hash: r.get(1)?,
                    workspace_path: r.get(2)?,
                    title: r.get(3)?,
                    created_at: r.get::<_, i64>(4)? as u64,
                    updated_at: r.get::<_, i64>(5)? as u64,
                    active_leaf_id: r.get(6)?,
                    turn_count: r.get::<_, i64>(7)? as usize,
                })
            })
            .map_err(error)?;
        rows.collect::<Result<Vec<_>, _>>().map_err(error)
    }

    pub fn backup(&self, destination: &Path) -> Result<(), String> {
        let conn = self.conn.lock().map_err(error)?;
        snapshot(&conn, destination)?;
        Self::verify_backup(destination)
    }

    pub fn verify_backup(path: &Path) -> Result<(), String> {
        let conn =
            Connection::open_with_flags(path, OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(error)?;
        verify(&conn)?;
        let version: i64 = conn
            .query_row("SELECT max(version) FROM schema_migrations", [], |r| {
                r.get(0)
            })
            .map_err(error)?;
        if version != 1 {
            return Err("Unsupported backup schema".into());
        }
        // Preparing the authoritative queries also detects an incomplete/wrong schema.
        conn.prepare("SELECT s.next_seq,s.active_leaf_id,e.seq,e.kind,e.payload_version,e.payload_json,e.parent_id FROM sessions s LEFT JOIN events e ON e.session_id=s.id").map_err(error)?;
        Ok(())
    }

    pub fn needs_import(&self, source_key: &str, contents: &[u8]) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(error)?;
        let previous: Option<String> = conn
            .query_row(
                "SELECT source_sha256 FROM legacy_imports WHERE source_key=?1",
                params![source_key],
                |r| r.get(0),
            )
            .optional()
            .map_err(error)?;
        match previous {
            None => Ok(true),
            Some(hash) if hash == format!("{:x}", Sha256::digest(contents)) => Ok(false),
            Some(_) => Err(format!(
                "Previously imported legacy file {source_key} changed; review required"
            )),
        }
    }

    pub fn import_file(&self, source_key: &str, contents: &[u8]) -> Result<bool, String> {
        let digest = format!("{:x}", Sha256::digest(contents));
        let mut conn = self.conn.lock().map_err(error)?;
        let tx = conn.transaction().map_err(error)?;
        let previous: Option<String> = tx
            .query_row(
                "SELECT source_sha256 FROM legacy_imports WHERE source_key=?1",
                params![source_key],
                |r| r.get(0),
            )
            .optional()
            .map_err(error)?;
        if let Some(previous) = previous {
            return if previous == digest {
                Ok(false)
            } else {
                Err("Previously imported legacy file changed; review required".into())
            };
        }
        // Unlike the historical reader, import never silently discards a malformed trailing line.
        let text = std::str::from_utf8(contents).map_err(error)?;
        let events = text
            .lines()
            .filter(|l| !l.trim().is_empty())
            .map(serde_json::from_str::<PersistedEvent>)
            .collect::<Result<Vec<_>, _>>()
            .map_err(error)?;
        let first = events.first().ok_or("Empty legacy session")?;
        let (workspace_path, title) = match &first.payload {
            EventPayload::SessionMetadata {
                workspace_path,
                title,
                ..
            } => (workspace_path, title),
            _ => return Err("Legacy session has no initial metadata".into()),
        };
        let workspace = Path::new(workspace_path);
        let hash = compute_workspace_hash(workspace);
        tx.execute(
            "INSERT INTO workspaces VALUES(?1,?2) ON CONFLICT(id) DO NOTHING",
            params![hash, workspace_path],
        )
        .map_err(error)?;
        let existing_path: String = tx
            .query_row(
                "SELECT canonical_path FROM workspaces WHERE id=?1",
                params![hash],
                |r| r.get(0),
            )
            .map_err(error)?;
        if existing_path != *workspace_path {
            return Err("Workspace identity collision during import".into());
        }
        tx.execute("INSERT INTO sessions(id,workspace_id,title,created_at,updated_at) VALUES(?1,?2,?3,?4,?4)",params![first.session_id,hash,title,first.timestamp as i64]).map_err(error)?;
        for event in &events {
            if event.session_id != first.session_id {
                return Err("Mixed session identities in legacy file".into());
            }
            Self::insert_event(&tx, event)?;
        }
        if let Some((index, leaf)) =
            events
                .iter()
                .enumerate()
                .rev()
                .find_map(|(i, e)| match &e.payload {
                    EventPayload::ActiveLeaf { leaf_id } => Some((i, leaf_id)),
                    _ => None,
                })
        {
            if index != events.len() - 1 {
                return Err(
                    "Legacy branch selection has later events; active leaf requires review".into(),
                );
            }
            tx.execute(
                "UPDATE sessions SET active_leaf_id=?2 WHERE id=?1",
                params![first.session_id, leaf],
            )
            .map_err(error)?;
        }
        tx.execute(
            "INSERT INTO legacy_imports VALUES(?1,?2,?3,?4)",
            params![source_key, digest, first.session_id, now_epoch_ms() as i64],
        )
        .map_err(error)?;
        tx.commit().map_err(error)?;
        Ok(true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::StorageManager;

    fn directory() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "unfuse_sqlite_{}_{}",
            std::process::id(),
            super::super::event::generate_event_id()
        ));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn user(id: &str, parent: Option<String>) -> PersistedEvent {
        PersistedEvent::new(
            id,
            parent,
            EventPayload::UserTurn {
                prompt: "hello".into(),
                attached_files: vec![],
            },
        )
    }

    #[test]
    fn migration_immutability_and_constraints() {
        let root = directory();
        let db = SessionDatabase::open(&root).unwrap();
        db.create_session(&root, "s", None).unwrap();
        db.create_session(&root, "other", None).unwrap();
        let (events, _) = db.load(&root, "s").unwrap();
        let first = &events[0];
        let conn = db.conn.lock().unwrap();
        let tables: i64 = conn.query_row("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",[],|r|r.get(0)).unwrap();
        assert_eq!(tables, 5);
        assert!(conn
            .execute("UPDATE events SET kind='changed'", [])
            .is_err());
        assert!(conn.execute("DELETE FROM events", []).is_err());
        assert!(conn
            .execute(
                "INSERT OR REPLACE INTO events SELECT * FROM events WHERE id=?1",
                params![first.id]
            )
            .is_err());
        assert!(conn
            .execute(
                "INSERT INTO events VALUES('bad','other',2,0,'UserTurn',1,'{}',?1)",
                params![first.id]
            )
            .is_err());
        assert!(conn
            .execute(
                "INSERT INTO events VALUES('cycle','s',2,0,'UserTurn',1,'{}','cycle')",
                []
            )
            .is_err());
        assert!(conn
            .execute(
                "INSERT INTO events VALUES('version','s',2,0,'UserTurn',2,'{}',NULL)",
                []
            )
            .is_err());
        verify(&conn).unwrap();
        drop(conn);
        drop(db);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn failed_append_rolls_back_event_sequence_leaf_and_title() {
        let root = directory();
        let db = SessionDatabase::open(&root).unwrap();
        let session = db.create_session(&root, "s", None).unwrap();
        db.conn.lock().unwrap().execute_batch("CREATE TEMP TRIGGER fail_state BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT,'injected failure'); END;").unwrap();
        assert!(db
            .append(&root, &user("s", session.active_leaf_id.clone()))
            .is_err());
        let (events, leaf) = db.load(&root, "s").unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(leaf, session.active_leaf_id);
        let conn = db.conn.lock().unwrap();
        let seq: i64 = conn
            .query_row("SELECT next_seq FROM sessions WHERE id='s'", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(seq, 2);
        drop(conn);
        assert_eq!(db.list(Some(&root), None).unwrap()[0].title, "New Session");
        drop(db);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn runtime_lock_child() {
        if let Some(root) = std::env::var_os("UNFUSE_TEST_LOCK_ROOT") {
            assert!(SessionDatabase::open(Path::new(&root)).is_err());
        }
    }

    #[test]
    fn runtime_lock_excludes_other_process_and_releases_on_drop() {
        let root = directory();
        let storage = StorageManager::with_base_dir(root.clone()).unwrap();
        let clone = storage.clone();
        assert!(StorageManager::with_base_dir(root.clone()).is_err());
        let result = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "storage::sqlite::tests::runtime_lock_child",
                "--nocapture",
            ])
            .env("UNFUSE_TEST_LOCK_ROOT", &root)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stdout)
        );
        drop(storage);
        assert!(StorageManager::with_base_dir(root.clone()).is_err());
        drop(clone);
        drop(StorageManager::with_base_dir(root.clone()).unwrap());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn branch_continuation_survives_reopen_without_jsonl() {
        let root = directory();
        let storage = StorageManager::with_base_dir(root.clone()).unwrap();
        let s = storage.create_session(&root, "s", None).unwrap();
        let a = user("s", s.active_leaf_id.clone());
        let b = user("s", s.active_leaf_id);
        storage.append_event(&root, &a).unwrap();
        storage.append_event(&root, &b).unwrap();
        storage.switch_active_leaf(&root, "s", &a.id).unwrap();
        let c = user("s", Some(a.id.clone()));
        storage.append_event_durable(&root, &c).unwrap();
        assert!(!storage.sessions_dir().exists());
        drop(storage);
        let reopened = StorageManager::with_base_dir(root.clone()).unwrap();
        let ctx = reopened
            .reconstruct_active_context(&root, "s", None)
            .unwrap();
        assert_eq!(ctx.active_leaf_id, Some(c.id));
        assert_eq!(ctx.events[1].id, a.id);
        assert!(!ctx.events.iter().any(|e| e.id == b.id));
        assert!(reopened
            .load_session_events(Path::new("other-project"), "s")
            .is_err());
        drop(reopened);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn backup_restore_includes_wal_and_preserves_previous_backup() {
        let root = directory();
        let restored_root = directory();
        let storage = StorageManager::with_base_dir(root.clone()).unwrap();
        let s = storage.create_session(&root, "s", None).unwrap();
        let event = user("s", s.active_leaf_id);
        storage.append_event(&root, &event).unwrap();
        let backup = root.join("backup.db");
        storage.backup(&backup).unwrap();
        let before = fs::read(&backup).unwrap();
        assert!(storage.backup(&backup).is_err());
        assert_eq!(fs::read(&backup).unwrap(), before);
        let restored = StorageManager::restore_backup(&backup, restored_root.clone()).unwrap();
        assert_eq!(
            restored.load_session_events(&root, "s").unwrap(),
            storage.load_session_events(&root, "s").unwrap()
        );
        assert!(StorageManager::restore_backup(&backup, root.clone()).is_err());
        let corrupt = root.join("corrupt.db");
        fs::write(&corrupt, b"not a database").unwrap();
        assert!(SessionDatabase::verify_backup(&corrupt).is_err());
        drop(restored);
        drop(storage);
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(restored_root).unwrap();
    }

    #[test]
    fn import_rejects_malformed_and_changed_logs_without_partial_session() {
        let root = directory();
        let db = SessionDatabase::open(&root).unwrap();
        let meta = PersistedEvent::new(
            "legacy",
            None,
            EventPayload::SessionMetadata {
                workspace_path: root.to_string_lossy().into_owned(),
                workspace_hash: compute_workspace_hash(&root),
                title: "old".into(),
            },
        );
        let valid = serde_json::to_vec(&meta).unwrap();
        let mut malformed = valid.clone();
        malformed.extend_from_slice(b"\n{bad");
        assert!(db.import_file("old.jsonl", &malformed).is_err());
        assert!(db.list(None, None).unwrap().is_empty());
        assert!(db.import_file("old.jsonl", &valid).unwrap());
        assert!(!db.import_file("old.jsonl", &valid).unwrap());
        assert!(db.import_file("old.jsonl", &malformed).is_err());
        drop(db);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn newer_schema_is_rejected_without_rewriting_it() {
        let root = directory();
        let db = SessionDatabase::open(&root).unwrap();
        db.conn
            .lock()
            .unwrap()
            .execute("UPDATE schema_migrations SET version=2", [])
            .unwrap();
        drop(db);
        assert!(SessionDatabase::open(&root)
            .err()
            .unwrap()
            .contains("Unsupported"));
        let conn = Connection::open(root.join("sessions.db")).unwrap();
        assert_eq!(
            conn.query_row("SELECT max(version) FROM schema_migrations", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            2
        );
        drop(conn);
        fs::remove_dir_all(root).unwrap();
    }
}
