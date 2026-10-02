use std::collections::HashMap;
use std::fs::{create_dir_all, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::Path;

use serde_json::Value;

use crate::provider::ChatMessage;
use crate::storage::event::{EventPayload, PersistedEvent};

/// Reconstructed conversation context along the active branch.
#[derive(Debug, Clone)]
pub struct ActiveContext {
    pub active_leaf_id: Option<String>,
    pub events: Vec<PersistedEvent>,
    pub chat_messages: Vec<ChatMessage>,
}

/// Append-only JSONL session log manager.
pub struct JsonlSessionStore;

impl JsonlSessionStore {
    /// Appends an event to the session's JSONL file with standard buffered flush.
    /// Does NOT force fsync on every event, ensuring fast normal execution.
    pub fn append_event(file_path: &Path, event: &PersistedEvent) -> Result<(), String> {
        if let Some(parent) = file_path.parent() {
            create_dir_all(parent).map_err(|e| {
                format!("Failed to create session directory {}: {}", parent.display(), e)
            })?;
        }

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(file_path)
            .map_err(|e| format!("Failed to open session file {}: {}", file_path.display(), e))?;

        let json_line = serde_json::to_string(event)
            .map_err(|e| format!("Failed to serialize event: {}", e))?;

        writeln!(file, "{}", json_line)
            .map_err(|e| format!("Failed to write event to {}: {}", file_path.display(), e))?;

        file.flush()
            .map_err(|e| format!("Failed to flush session file {}: {}", file_path.display(), e))?;

        Ok(())
    }

    /// Appends an event and forces an explicit fsync boundary to disk.
    /// Used for critical durability boundaries (e.g. session creation, turn completion).
    pub fn append_event_durable(file_path: &Path, event: &PersistedEvent) -> Result<(), String> {
        Self::append_event(file_path, event)?;
        let file = File::open(file_path)
            .map_err(|e| format!("Failed to re-open file for sync: {}", e))?;
        file.sync_data()
            .map_err(|e| format!("Failed to sync session file: {}", e))?;
        Ok(())
    }

    /// Reads all valid events from a session JSONL file.
    /// Tolerates an incomplete/truncated trailing line caused by an abnormal crash,
    /// but rejects corruption in earlier lines to maintain historical log integrity.
    pub fn read_events(file_path: &Path) -> Result<Vec<PersistedEvent>, String> {
        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let file = File::open(file_path)
            .map_err(|e| format!("Failed to open session file {}: {}", file_path.display(), e))?;

        let reader = BufReader::new(file);
        let mut lines = Vec::new();

        for line_res in reader.lines() {
            match line_res {
                Ok(l) => lines.push(l),
                Err(_) => {
                    // Encountered incomplete byte sequence at end of file
                    break;
                }
            }
        }

        // Identify the index of the final non-empty line in the file
        let last_non_empty_idx = lines.iter().rposition(|l| !l.trim().is_empty());

        let mut events = Vec::new();

        for (idx, line) in lines.into_iter().enumerate() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            match serde_json::from_str::<PersistedEvent>(trimmed) {
                Ok(evt) => events.push(evt),
                Err(err) => {
                    // Tolerate if it is the final non-empty line (trailing crash fragment)
                    if Some(idx) == last_non_empty_idx {
                        break;
                    } else {
                        return Err(format!(
                            "Corrupted session log at line {} of {}: {}",
                            idx + 1,
                            file_path.display(),
                            err
                        ));
                    }
                }
            }
        }

        Ok(events)
    }

    /// Determines the authoritative active_leaf_id for this session log.
    /// Source of Truth Rule:
    /// - If any `ActiveLeaf` event is recorded, the LAST such event in the log is authoritative.
    /// - Otherwise, the ID of the last event in the file is the active_leaf_id.
    /// - If the file has no events, returns None.
    pub fn resolve_active_leaf_id(events: &[PersistedEvent]) -> Option<String> {
        if events.is_empty() {
            return None;
        }

        // Check for latest explicit ActiveLeaf pointer switch in reverse
        for evt in events.iter().rev() {
            if let EventPayload::ActiveLeaf { leaf_id } = &evt.payload {
                return Some(leaf_id.clone());
            }
        }

        // Default to the last event in the file
        events.last().map(|e| e.id.clone())
    }

    /// Reconstructs the active conversation history by traversing backward:
    /// active_leaf_id -> parent_id -> ... -> root
    ///
    /// Preserves all branches in the raw JSONL log. If target_leaf_id is None,
    /// it resolves the current active_leaf_id automatically.
    pub fn reconstruct_active_context(
        events: &[PersistedEvent],
        target_leaf_id: Option<&str>,
    ) -> Result<ActiveContext, String> {
        if events.is_empty() {
            return Ok(ActiveContext {
                active_leaf_id: None,
                events: Vec::new(),
                chat_messages: Vec::new(),
            });
        }

        let leaf_id = match target_leaf_id {
            Some(id) => id.to_string(),
            None => match Self::resolve_active_leaf_id(events) {
                Some(id) => id,
                None => {
                    return Ok(ActiveContext {
                        active_leaf_id: None,
                        events: Vec::new(),
                        chat_messages: Vec::new(),
                    })
                }
            },
        };

        // Map events by ID for O(1) parent lookup
        let event_map: HashMap<String, &PersistedEvent> =
            events.iter().map(|e| (e.id.clone(), e)).collect();

        // Traverse backward along the parent_id chain
        let mut path = Vec::new();
        let mut curr_id = Some(leaf_id.clone());
        let mut seen_ids = std::collections::HashSet::new();

        while let Some(id) = curr_id {
            if seen_ids.contains(&id) {
                // Prevent infinite loop on circular parent pointers
                break;
            }
            seen_ids.insert(id.clone());

            if let Some(event) = event_map.get(&id) {
                path.push((*event).clone());
                curr_id = event.parent_id.clone();
            } else {
                break;
            }
        }

        // Reverse to restore chronological root -> leaf order
        path.reverse();

        // Convert the traversed path into LLM-compatible ChatMessage items
        let chat_messages = Self::events_to_chat_messages(&path);

        Ok(ActiveContext {
            active_leaf_id: Some(leaf_id),
            events: path,
            chat_messages,
        })
    }

    /// Converts an ordered linear sequence of events into ChatMessages for the LLM.
    fn events_to_chat_messages(events: &[PersistedEvent]) -> Vec<ChatMessage> {
        let mut messages: Vec<ChatMessage> = Vec::new();
        let mut compaction_summary: Option<String> = None;
        let mut first_kept_id: Option<String> = None;

        // Check if any compaction event occurred along this branch
        for evt in events.iter().rev() {
            if let EventPayload::Compaction {
                summary,
                first_kept_event_id,
                ..
            } = &evt.payload
            {
                compaction_summary = Some(summary.clone());
                first_kept_id = Some(first_kept_event_id.clone());
                break;
            }
        }

        let mut start_idx = 0;
        if let Some(kept_id) = first_kept_id {
            if let Some(idx) = events.iter().position(|e| e.id == kept_id) {
                start_idx = idx;
            }
        }

        // If compaction took place, prepend summary as system context
        if let Some(summary) = compaction_summary {
            messages.push(ChatMessage::system(format!("[Prior conversation summary]:\n{}", summary)));
        }

        // Temporary storage for tool calls accumulated during an assistant turn
        let mut pending_tool_calls: Vec<Value> = Vec::new();

        for evt in &events[start_idx..] {
            match &evt.payload {
                EventPayload::UserTurn { prompt, attached_files } => {
                    let msg = if attached_files.is_empty() {
                        ChatMessage::user_text(prompt)
                    } else {
                        ChatMessage::user_multimodal(prompt, attached_files)
                    };
                    messages.push(msg);
                }
                EventPayload::ToolCall {
                    call_id,
                    tool,
                    arguments,
                    ..
                } => {
                    pending_tool_calls.push(serde_json::json!({
                        "id": call_id,
                        "type": "function",
                        "function": {
                            "name": tool,
                            "arguments": arguments,
                        }
                    }));
                }
                EventPayload::AssistantTurn { content, .. } => {
                    let tool_calls = if pending_tool_calls.is_empty() {
                        None
                    } else {
                        Some(std::mem::take(&mut pending_tool_calls))
                    };

                    messages.push(ChatMessage {
                        role: "assistant".to_string(),
                        content: content.as_str().into(),
                        tool_calls,
                        tool_call_id: None,
                    });
                }
                EventPayload::ToolResult {
                    call_id,
                    output,
                    ..
                } => {
                    messages.push(ChatMessage {
                        role: "tool".to_string(),
                        content: output.as_str().into(),
                        tool_calls: None,
                        tool_call_id: Some(call_id.clone()),
                    });
                }
                _ => {}
            }
        }

        messages
    }

    /// Audits a sequence of events for abnormal terminations or dangling tool executions.
    pub fn audit_recovery(events: &[PersistedEvent]) -> RecoveryReport {
        SessionRecoveryScanner::audit_session(events)
    }
}

/// Status of session recovery after application startup or crash.
#[derive(Debug, Clone, PartialEq)]
pub enum RecoveryStatus {
    /// Session concluded normally with no open transactions.
    Clean,
    /// Session was interrupted midway through a turn or tool execution.
    Interrupted {
        reason: String,
        unclosed_tool_calls: Vec<String>,
        last_valid_leaf_id: Option<String>,
    },
}

/// Result of scanning a session's event log for crash resilience.
#[derive(Debug, Clone)]
pub struct RecoveryReport {
    pub status: RecoveryStatus,
    pub total_events: usize,
    pub completed_turns: usize,
    pub active_leaf_id: Option<String>,
    pub ephemeral_notice: Option<String>,
}

/// Scanner that audits session events without mutating or appending to the JSONL log on disk.
pub struct SessionRecoveryScanner;

impl SessionRecoveryScanner {
    /// Inspects the event sequence to detect abnormal terminations.
    /// Does NOT append synthetic ToolResult events to the JSONL file,
    /// preserving the true historical state on disk and representing
    /// interruption purely in recovered runtime state.
    pub fn audit_session(events: &[PersistedEvent]) -> RecoveryReport {
        if events.is_empty() {
            return RecoveryReport {
                status: RecoveryStatus::Clean,
                total_events: 0,
                completed_turns: 0,
                active_leaf_id: None,
                ephemeral_notice: None,
            };
        }

        let mut completed_turns = 0;
        let mut open_tool_calls: HashMap<String, String> = HashMap::new(); // call_id -> tool_name
        let mut in_active_turn = false;
        let mut last_turn_completed_leaf: Option<String> = None;

        for evt in events {
            match &evt.payload {
                EventPayload::UserTurn { .. } => {
                    in_active_turn = true;
                }
                EventPayload::ToolCall { call_id, tool, .. } => {
                    open_tool_calls.insert(call_id.clone(), tool.clone());
                }
                EventPayload::ToolResult { call_id, .. } => {
                    open_tool_calls.remove(call_id);
                }
                EventPayload::AssistantTurn { .. } => {
                    // An assistant turn without open tool calls concludes a step or turn
                    if open_tool_calls.is_empty() {
                        in_active_turn = false;
                        completed_turns += 1;
                        last_turn_completed_leaf = Some(evt.id.clone());
                    }
                }
                EventPayload::Error { .. } | EventPayload::Cancellation { .. } => {
                    in_active_turn = false;
                    last_turn_completed_leaf = Some(evt.id.clone());
                }
                _ => {}
            }
        }

        let active_leaf_id = events.last().map(|e| e.id.clone());

        if !open_tool_calls.is_empty() {
            let tools_list: Vec<String> = open_tool_calls
                .into_iter()
                .map(|(id, tool)| format!("{} ({})", tool, id))
                .collect();
            let reason = format!(
                "Session interrupted while executing tool call(s): {}",
                tools_list.join(", ")
            );

            return RecoveryReport {
                status: RecoveryStatus::Interrupted {
                    reason: reason.clone(),
                    unclosed_tool_calls: tools_list,
                    last_valid_leaf_id: last_turn_completed_leaf,
                },
                total_events: events.len(),
                completed_turns,
                active_leaf_id,
                ephemeral_notice: Some(format!(
                    "[UNFUSE CRASH RECOVERY]: {}",
                    reason
                )),
            };
        }

        if in_active_turn {
            let reason = "Session was interrupted before the assistant completed its response.".to_string();
            return RecoveryReport {
                status: RecoveryStatus::Interrupted {
                    reason: reason.clone(),
                    unclosed_tool_calls: Vec::new(),
                    last_valid_leaf_id: last_turn_completed_leaf,
                },
                total_events: events.len(),
                completed_turns,
                active_leaf_id,
                ephemeral_notice: Some(format!(
                    "[UNFUSE CRASH RECOVERY]: {}",
                    reason
                )),
            };
        }

        RecoveryReport {
            status: RecoveryStatus::Clean,
            total_events: events.len(),
            completed_turns,
            active_leaf_id,
            ephemeral_notice: None,
        }
    }
}
