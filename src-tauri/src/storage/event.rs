use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::pipeline::StageDeliverable;

/// Maximum character length for a persisted tool output in the JSONL log (100,000 chars).
/// Outputs exceeding this are safely truncated with a trailing notice.
pub const MAX_TOOL_OUTPUT_CHARS: usize = 100_000;

/// Returns current UTC timestamp in milliseconds.
pub fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Generates a unique, monotonically sortable event ID.
pub fn generate_event_id() -> String {
    use std::sync::atomic::{AtomicU64, Ordering};
    static COUNTER: AtomicU64 = AtomicU64::new(0);

    let ts = now_epoch_ms();
    let seq = COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("evt_{:x}_{:x}", ts, seq)
}

/// Bounded truncation helper for tool outputs to prevent runaway log bloat.
/// Safely truncates by UTF-8 characters without splitting multibyte code points.
pub fn truncate_tool_output(output: &str) -> String {
    let char_count = output.chars().count();
    if char_count <= MAX_TOOL_OUTPUT_CHARS {
        output.to_string()
    } else {
        let truncated: String = output.chars().take(MAX_TOOL_OUTPUT_CHARS).collect();
        format!(
            "{}\n\n[UNFUSE STORAGE: Output truncated at {} chars. Original length: {} chars]",
            truncated,
            MAX_TOOL_OUTPUT_CHARS,
            char_count
        )
    }
}

/// Strongly typed envelope for all persisted events in the append-only JSONL log.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PersistedEvent {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    pub session_id: String,
    pub timestamp: u64,
    #[serde(flatten)]
    pub payload: EventPayload,
}

impl PersistedEvent {
    pub fn new(session_id: &str, parent_id: Option<String>, payload: EventPayload) -> Self {
        Self {
            id: generate_event_id(),
            parent_id,
            session_id: session_id.to_string(),
            timestamp: now_epoch_ms(),
            payload,
        }
    }
}

/// Strongly typed event payloads representing all backend state transitions.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", content = "data")]
pub enum EventPayload {
    /// Initial session metadata recorded at session creation
    SessionMetadata {
        workspace_path: String,
        workspace_hash: String,
        title: String,
    },
    /// User input prompt turn
    UserTurn {
        prompt: String,
        #[serde(default)]
        attached_files: Vec<String>,
    },
    /// Completed assistant final text response
    AssistantTurn {
        content: String,
        model: String,
    },
    /// Tool invocation request emitted by the model
    ToolCall {
        call_id: String,
        tool: String,
        arguments: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        stage_index: Option<usize>,
    },
    /// Permission decision recorded from the user / permission gate
    PermissionDecision {
        call_id: String,
        tool: String,
        decision: String, // "allow" | "auto_allow" | "modify" | "reject"
        #[serde(skip_serializing_if = "Option::is_none")]
        modified_arguments: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        reject_reason: Option<String>,
    },
    /// Tool execution result
    ToolResult {
        call_id: String,
        tool: String,
        is_error: bool,
        output: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        stage_index: Option<usize>,
    },
    /// Multi-stage pipeline stage execution started
    PipelineStageStart {
        plan_id: String,
        stage_index: usize,
        stage_name: String,
        model: String,
        allowed_tools: Vec<String>,
    },
    /// Multi-stage pipeline stage finished with deliverable
    PipelineStageComplete {
        plan_id: String,
        stage_index: usize,
        deliverable: StageDeliverable,
    },
    /// Explicit pointer update / branch switch in Pi-style tree
    ActiveLeaf {
        leaf_id: String,
    },
    /// Context compaction marker
    Compaction {
        summary: String,
        first_kept_event_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        tokens_before: Option<usize>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tokens_after: Option<usize>,
    },
    /// Turn or stage execution error
    Error {
        message: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        stage_index: Option<usize>,
    },
    /// User or system cancellation
    Cancellation {
        reason: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        stage_index: Option<usize>,
    },
}
