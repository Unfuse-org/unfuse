use std::fs::create_dir_all;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::storage::event::EventPayload;
use crate::storage::jsonl::JsonlSessionStore;

/// Summary metadata for a session displayed in sidebars and search results.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SessionSummary {
    pub session_id: String,
    pub workspace_hash: String,
    pub workspace_path: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub turn_count: usize,
    pub active_leaf_id: Option<String>,
}

/// SQLite index manager for fast querying, sorting, and workspace filtering.
/// SQLite is strictly a secondary read-cache and is NOT the source of truth.
pub struct SqliteIndex {
    db_path: PathBuf,
    conn: Mutex<Connection>,
}

impl SqliteIndex {
    /// Opens or creates the SQLite index database at the specified path.
    pub fn open(db_path: &Path) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            create_dir_all(parent).map_err(|e| {
                format!("Failed to create database directory {}: {}", parent.display(), e)
            })?;
        }

        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open SQLite database at {}: {}", db_path.display(), e))?;

        // Initialize schema
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;

            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                workspace_hash TEXT NOT NULL,
                workspace_path TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                turn_count INTEGER NOT NULL DEFAULT 0,
                active_leaf_id TEXT,
                prompt_snippets TEXT NOT NULL DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_workspace 
            ON sessions (workspace_hash, updated_at DESC);
            ",
        )
        .map_err(|e| format!("Failed to initialize index schema: {}", e))?;

        Ok(Self {
            db_path: db_path.to_path_buf(),
            conn: Mutex::new(conn),
        })
    }

    /// Returns the database file path.
    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    /// Upserts a session summary record into the index.
    pub fn upsert_session(
        &self,
        summary: &SessionSummary,
        prompt_snippet: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();

        let snippet = prompt_snippet.unwrap_or("");

        conn.execute(
            "
            INSERT INTO sessions (
                session_id, workspace_hash, workspace_path, title,
                created_at, updated_at, turn_count, active_leaf_id, prompt_snippets
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(session_id) DO UPDATE SET
                workspace_hash = excluded.workspace_hash,
                workspace_path = excluded.workspace_path,
                title = CASE 
                    WHEN sessions.title != '' AND sessions.title != 'New Session' THEN sessions.title
                    WHEN excluded.title != '' AND excluded.title != 'New Session' THEN excluded.title
                    WHEN sessions.title != '' THEN sessions.title
                    ELSE excluded.title
                END,
                updated_at = excluded.updated_at,
                turn_count = sessions.turn_count + excluded.turn_count,
                active_leaf_id = excluded.active_leaf_id,
                prompt_snippets = CASE 
                    WHEN excluded.prompt_snippets != '' 
                    THEN CASE 
                        WHEN sessions.prompt_snippets != '' 
                        THEN sessions.prompt_snippets || ' ' || excluded.prompt_snippets
                        ELSE excluded.prompt_snippets
                    END
                    ELSE sessions.prompt_snippets 
                END;
            ",
            params![
                summary.session_id,
                summary.workspace_hash,
                summary.workspace_path,
                summary.title,
                summary.created_at as i64,
                summary.updated_at as i64,
                summary.turn_count as i64,
                summary.active_leaf_id,
                snippet,
            ],
        )
        .map_err(|e| format!("Failed to upsert session in index: {}", e))?;

        Ok(())
    }

    /// Clears all session rows from the index (for test isolation and rebuild).
    pub fn clear_all_for_test(&self) -> Result<(), String> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM sessions;", [])
            .map_err(|e| format!("Failed to clear index: {}", e))?;
        Ok(())
    }

    /// Lists sessions sorted by updated_at descending, optionally filtered by workspace hash.
    pub fn list_sessions(
        &self,
        workspace_hash: Option<&str>,
    ) -> Result<Vec<SessionSummary>, String> {
        let conn = self.conn.lock().unwrap();

        let mut stmt = if let Some(_hash) = workspace_hash {
            conn.prepare(
                "
                SELECT session_id, workspace_hash, workspace_path, title,
                       created_at, updated_at, turn_count, active_leaf_id
                FROM sessions
                WHERE workspace_hash = ?1
                ORDER BY updated_at DESC;
                ",
            )
            .map_err(|e| format!("Query prepare failed: {}", e))?
        } else {
            conn.prepare(
                "
                SELECT session_id, workspace_hash, workspace_path, title,
                       created_at, updated_at, turn_count, active_leaf_id
                FROM sessions
                ORDER BY updated_at DESC;
                ",
            )
            .map_err(|e| format!("Query prepare failed: {}", e))?
        };

        let map_row = |row: &rusqlite::Row| -> rusqlite::Result<SessionSummary> {
            let created_at: i64 = row.get(4)?;
            let updated_at: i64 = row.get(5)?;
            let turn_count: i64 = row.get(6)?;

            Ok(SessionSummary {
                session_id: row.get(0)?,
                workspace_hash: row.get(1)?,
                workspace_path: row.get(2)?,
                title: row.get(3)?,
                created_at: created_at as u64,
                updated_at: updated_at as u64,
                turn_count: turn_count as usize,
                active_leaf_id: row.get(7)?,
            })
        };

        let rows = if let Some(hash) = workspace_hash {
            stmt.query_map(params![hash], map_row)
        } else {
            stmt.query_map([], map_row)
        }
        .map_err(|e| format!("Query failed: {}", e))?;

        let mut results = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                results.push(item);
            }
        }

        Ok(results)
    }

    /// Performs search across session titles and user prompt snippets.
    pub fn search_sessions(
        &self,
        workspace_hash: Option<&str>,
        query: &str,
    ) -> Result<Vec<SessionSummary>, String> {
        let conn = self.conn.lock().unwrap();
        let search_pattern = format!("%{}%", query.trim());

        let mut stmt = if let Some(_hash) = workspace_hash {
            conn.prepare(
                "
                SELECT session_id, workspace_hash, workspace_path, title,
                       created_at, updated_at, turn_count, active_leaf_id
                FROM sessions
                WHERE workspace_hash = ?1
                  AND (title LIKE ?2 OR prompt_snippets LIKE ?2)
                ORDER BY updated_at DESC;
                ",
            )
            .map_err(|e| format!("Search prepare failed: {}", e))?
        } else {
            conn.prepare(
                "
                SELECT session_id, workspace_hash, workspace_path, title,
                       created_at, updated_at, turn_count, active_leaf_id
                FROM sessions
                WHERE (title LIKE ?1 OR prompt_snippets LIKE ?1)
                ORDER BY updated_at DESC;
                ",
            )
            .map_err(|e| format!("Search prepare failed: {}", e))?
        };

        let map_row = |row: &rusqlite::Row| -> rusqlite::Result<SessionSummary> {
            let created_at: i64 = row.get(4)?;
            let updated_at: i64 = row.get(5)?;
            let turn_count: i64 = row.get(6)?;

            Ok(SessionSummary {
                session_id: row.get(0)?,
                workspace_hash: row.get(1)?,
                workspace_path: row.get(2)?,
                title: row.get(3)?,
                created_at: created_at as u64,
                updated_at: updated_at as u64,
                turn_count: turn_count as usize,
                active_leaf_id: row.get(7)?,
            })
        };

        let rows = if let Some(hash) = workspace_hash {
            stmt.query_map(params![hash, search_pattern], map_row)
        } else {
            stmt.query_map(params![search_pattern], map_row)
        }
        .map_err(|e| format!("Search failed: {}", e))?;

        let mut results = Vec::new();
        for r in rows {
            if let Ok(item) = r {
                results.push(item);
            }
        }

        Ok(results)
    }

    /// Rebuilds the entire SQLite index from scratch by scanning all JSONL files under sessions_dir.
    /// Guarantees that if index.db disappears or is corrupted, it can be 100% reconstructed.
    pub fn rebuild_from_jsonl(&self, sessions_dir: &Path) -> Result<usize, String> {
        if !sessions_dir.exists() {
            return Ok(0);
        }

        let mut rebuilt_count = 0;

        // Clear existing cache
        {
            let conn = self.conn.lock().unwrap();
            conn.execute("DELETE FROM sessions;", [])
                .map_err(|e| format!("Failed to clear index: {}", e))?;
        }

        // Walk sessions_dir: ~/.unfuse/sessions/<workspace_hash>/<session_id>.jsonl
        let ws_dirs = std::fs::read_dir(sessions_dir)
            .map_err(|e| format!("Failed to read sessions dir: {}", e))?;

        for ws_entry in ws_dirs.flatten() {
            let ws_path = ws_entry.path();
            if !ws_path.is_dir() {
                continue;
            }

            let session_files = std::fs::read_dir(&ws_path)
                .map_err(|e| format!("Failed to read workspace dir: {}", e))?;

            for file_entry in session_files.flatten() {
                let file_path = file_entry.path();
                if file_path.extension().and_then(|ext| ext.to_str()) != Some("jsonl") {
                    continue;
                }

                let events = match JsonlSessionStore::read_events(&file_path) {
                    Ok(evts) => evts,
                    Err(_) => continue,
                };

                if events.is_empty() {
                    continue;
                }

                // Extract metadata from SessionMetadata or default from first event
                let mut ws_path_str = String::new();
                let mut ws_hash_str = ws_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                let mut title = "New Session".to_string();
                let created_at = events.first().map(|e| e.timestamp).unwrap_or(0);
                let updated_at = events.last().map(|e| e.timestamp).unwrap_or(0);
                let mut turn_count = 0;
                let mut prompt_snippets = Vec::new();

                for evt in &events {
                    match &evt.payload {
                        EventPayload::SessionMetadata {
                            workspace_path,
                            workspace_hash,
                            title: t,
                        } => {
                            ws_path_str = workspace_path.clone();
                            ws_hash_str = workspace_hash.clone();
                            if !t.is_empty() {
                                title = t.clone();
                            }
                        }
                        EventPayload::UserTurn { prompt, .. } => {
                            turn_count += 1;
                            if prompt_snippets.len() < 5 {
                                prompt_snippets.push(prompt.clone());
                            }
                            if title == "New Session" && !prompt.trim().is_empty() {
                                let excerpt: String = prompt.chars().take(40).collect();
                                title = excerpt;
                            }
                        }
                        _ => {}
                    }
                }

                let active_leaf_id = JsonlSessionStore::resolve_active_leaf_id(&events);
                let session_id = file_path
                    .file_stem()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();

                let summary = SessionSummary {
                    session_id,
                    workspace_hash: ws_hash_str,
                    workspace_path: ws_path_str,
                    title,
                    created_at,
                    updated_at,
                    turn_count,
                    active_leaf_id,
                };

                let snippet = prompt_snippets.join(" ");
                self.upsert_session(&summary, Some(&snippet))?;
                rebuilt_count += 1;
            }
        }

        Ok(rebuilt_count)
    }
}
