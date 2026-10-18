use super::{get_or_create_session, EventSink, PermissionDecision};
use crate::provider::{AssembledToolCall, ChatMessage, ProviderConfig};
use crate::storage::{EventPayload, PersistedEvent};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc,
};
use std::time::Duration;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PauseReason {
    StageBudget,
    PipelineBudget,
    RepeatedToolCall,
}

impl PauseReason {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::StageBudget => "stage_budget",
            Self::PipelineBudget => "pipeline_budget",
            Self::RepeatedToolCall => "repeated_tool_call",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct RunCheckpoint {
    pub run_id: String,
    pub reason: PauseReason,
    pub provider_fingerprint: String,
    pub messages: Vec<ChatMessage>,
    pub tools: Option<Vec<Value>>,
    pub pending_tools: Vec<AssembledToolCall>,
    pub stage_iterations: usize,
    pub pipeline_remaining: Option<usize>,
    pub recent_calls: Vec<(String, Value)>,
    pub allowed_tools: Option<Vec<String>>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum RunStatus {
    Running,
    Completed,
    Failed,
    Cancelled,
}

pub(crate) fn fingerprint(config: &ProviderConfig) -> String {
    format!(
        "{:x}",
        Sha256::digest(format!(
            "{}\n{}\n{}",
            config.provider.as_str(),
            config.base_url.trim_end_matches('/'),
            config.model
        ))
    )
}

pub(super) fn record_status(
    root: &Path,
    session: &str,
    run_id: &str,
    status: RunStatus,
) -> Result<(), String> {
    let storage = crate::storage::get_storage()?;
    let leaf = storage.active_leaf(root, session)?;
    storage.append_event_durable(
        root,
        &PersistedEvent::new(
            session,
            leaf,
            EventPayload::RunStatus {
                run_id: run_id.into(),
                status,
            },
        ),
    )
}

pub(super) fn load_checkpoint(
    root: &Path,
    session: &str,
    config: &ProviderConfig,
) -> Result<RunCheckpoint, String> {
    super::context::capacity(config.context_window, config.max_tokens)?;
    let context = crate::storage::get_storage()?.reconstruct_active_context(root, session, None)?;
    let checkpoint = match context.events.last().map(|e| &e.payload) {
        Some(EventPayload::RunCheckpoint { checkpoint }) => checkpoint.as_ref().clone(),
        _ => return Err("Session has no paused checkpoint to resume".into()),
    };
    if checkpoint.provider_fingerprint != fingerprint(config) {
        return Err("Resume requires the same model and runner endpoint; credentials must be supplied again".into());
    }
    Ok(checkpoint)
}

pub(super) fn pause(
    root: &Path,
    session_id: &str,
    checkpoint: RunCheckpoint,
    leaf: &mut Option<String>,
    sink: &EventSink,
    cancelled: &AtomicBool,
) -> Result<(), String> {
    let session = get_or_create_session(session_id);
    let id = format!("{}-{}", checkpoint.run_id, checkpoint.reason.as_str());
    let (tx, rx) = mpsc::channel();
    session
        .lock()
        .unwrap()
        .pending_permissions
        .insert(id.clone(), tx);
    let event = PersistedEvent::new(
        session_id,
        leaf.clone(),
        EventPayload::RunCheckpoint {
            checkpoint: Box::new(checkpoint.clone()),
        },
    );
    let result = (|| {
        crate::storage::get_storage()?.append_event_durable(root, &event)?;
        *leaf = Some(event.id.clone());
        sink(
            "agent_event",
            json!({"type":"run_paused", "payload":{
            "session_id":session_id,"run_id":checkpoint.run_id,"id":id,"reason":checkpoint.reason,
            "iterations":checkpoint.stage_iterations,"can_continue":true}}),
        );
        loop {
            if cancelled.load(Ordering::SeqCst) {
                return Err("Run cancelled while paused".into());
            }
            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(PermissionDecision::Allow | PermissionDecision::AutoAllow) => {
                    record_status(root, session_id, &checkpoint.run_id, RunStatus::Running)?;
                    *leaf = crate::storage::get_storage()?.active_leaf(root, session_id)?;
                    sink(
                        "agent_event",
                        json!({"type":"run_resumed","payload":{"session_id":session_id,"run_id":checkpoint.run_id}}),
                    );
                    return Ok(());
                }
                Ok(_) => {
                    cancelled.store(true, Ordering::SeqCst);
                    return Err("Run stopped while paused".into());
                }
                Err(mpsc::RecvTimeoutError::Timeout) => continue,
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return Err("Run continuation channel closed".into())
                }
            }
        }
    })();
    session.lock().unwrap().pending_permissions.remove(&id);
    result
}

pub(super) fn settle_interrupted_tools(
    root: &Path,
    session: &str,
    sink: &EventSink,
) -> Result<(), String> {
    let storage = crate::storage::get_storage()?;
    let context = storage.reconstruct_active_context(root, session, None)?;
    let mut pending = std::collections::BTreeMap::new();
    for message in &context.chat_messages {
        if let Some(calls) = &message.tool_calls {
            for call in calls {
                if let (Some(id), Some(name)) =
                    (call["id"].as_str(), call["function"]["name"].as_str())
                {
                    pending.insert(id.to_owned(), name.to_owned());
                }
            }
        }
        if let Some(id) = message.tool_call_id.as_deref() {
            pending.remove(id);
        }
    }
    let mut leaf = context.active_leaf_id;
    for (id, name) in pending {
        let output = "Execution was interrupted and no confirmed result was saved. The action may or may not have happened. Inspect the current state before retrying; do not assume success.";
        let event = PersistedEvent::new(
            session,
            leaf,
            EventPayload::ToolResult {
                call_id: id.clone(),
                tool: name.clone(),
                is_error: true,
                output: output.into(),
                stage_index: None,
            },
        );
        leaf = Some(event.id.clone());
        storage.append_event_durable(root, &event)?;
        sink(
            "agent_event",
            json!({"type":"tool_call_completed","payload":{
            "session_id":session,"id":id,"tool":name,"is_error":true,"output":output}}),
        );
    }
    Ok(())
}
