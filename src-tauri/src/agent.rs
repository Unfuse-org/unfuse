use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::provider::{self, AssembledToolCall, ChatMessage, ProviderConfig, StreamChunk};
use crate::tools;

/// Hard ceiling for agent iterations within a single user prompt turn to prevent runaway loops.
/// Industry standard typically ranges from 10 to 30 for standard dev tasks.
pub const MAX_TURNS: usize = 25;

/// Maximum character budget for an individual tool output in the active LLM context.
/// 30,000 characters (~7,500 tokens) safely prevents context window blowouts on local & API models,
/// while the full output is preserved in UI events and durable JSONL storage.
pub const MAX_CONTEXT_TOOL_OUTPUT_CHARS: usize = 30_000;

pub fn truncate_context_tool_output(output: &str) -> String {
    let char_count = output.chars().count();
    if char_count <= MAX_CONTEXT_TOOL_OUTPUT_CHARS {
        output.to_string()
    } else {
        let truncated: String = output.chars().take(MAX_CONTEXT_TOOL_OUTPUT_CHARS).collect();
        format!(
            "{}\n\n[UNFUSE: Tool output truncated for model context (showing {} of {} chars). Full output preserved in session log.]",
            truncated,
            MAX_CONTEXT_TOOL_OUTPUT_CHARS,
            char_count
        )
    }
}

/// Tool approval policies for a session.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionPolicy {
    pub write_requires_approval: bool,
    pub edit_requires_approval: bool,
    pub bash_requires_approval: bool,
}

impl Default for SessionPolicy {
    fn default() -> Self {
        Self {
            write_requires_approval: true,
            edit_requires_approval: true,
            bash_requires_approval: true,
        }
    }
}

/// Decisions from the user / UI permission gate.
#[derive(Debug, Clone)]
pub enum PermissionDecision {
    Allow,
    AutoAllow,
    Modify(String),
    Reject(String),
}

/// State maintained for an active agent session.
pub(crate) struct SessionState {
    pub(crate) cancelled: Arc<AtomicBool>,
    pub(crate) policy: SessionPolicy,
    pub(crate) pending_permissions: HashMap<String, mpsc::Sender<PermissionDecision>>,
    pub(crate) active_pid: Option<u32>,
    pub(crate) integrations: HashMap<String, crate::integrations::ServiceConfig>,
    pub(crate) blackboard: HashMap<String, String>,
}

static REGISTRY: Mutex<Option<HashMap<String, Arc<Mutex<SessionState>>>>> = Mutex::new(None);

pub(crate) fn get_or_create_session(session_id: &str) -> Arc<Mutex<SessionState>> {
    let mut guard = REGISTRY.lock().unwrap();
    let map = guard.get_or_insert_with(HashMap::new);
    map.entry(session_id.to_string())
        .or_insert_with(|| {
            Arc::new(Mutex::new(SessionState {
                cancelled: Arc::new(AtomicBool::new(false)),
                policy: SessionPolicy::default(),
                pending_permissions: HashMap::new(),
                active_pid: None,
                integrations: HashMap::new(),
                blackboard: HashMap::new(),
            }))
        })
        .clone()
}

pub(crate) fn remove_session(session_id: &str) {
    let mut guard = REGISTRY.lock().unwrap();
    if let Some(map) = guard.as_mut() {
        map.remove(session_id);
    }
}

#[allow(dead_code)]
pub(crate) fn is_session_cancelled(session_id: &str) -> bool {
    let session = get_or_create_session(session_id);
    let guard = session.lock().unwrap();
    guard.cancelled.load(Ordering::Relaxed)
}

/// Payload format received from frontend Tauri `invoke('run_agent_turn')`.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LlmConfigPayload {
    pub provider: Option<String>,
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub timeout_secs: Option<u64>,
}

impl From<LlmConfigPayload> for ProviderConfig {
    fn from(p: LlmConfigPayload) -> Self {
        Self {
            base_url: p.base_url,
            api_key: p.api_key,
            model: p.model,
            temperature: p.temperature,
            max_tokens: p.max_tokens,
            timeout_secs: p.timeout_secs,
        }
    }
}

/// Abstract streaming provider function signature to allow clean test mocking.
pub type StreamFn = Box<
    dyn Fn(
            &ProviderConfig,
            &[ChatMessage],
            Option<&[Value]>,
            &mut dyn FnMut(StreamChunk),
        ) -> Result<Vec<AssembledToolCall>, String>
        + Send
        + Sync,
>;

/// Event sink closure signature for emitting Tauri events.
pub type EventSink = Arc<dyn Fn(&str, Value) + Send + Sync>;

/// Runs the multi-turn agent loop for a prompt turn (unrestricted tools, default prompt).
pub fn run_agent_loop(
    workspace_root: &Path,
    session_id: &str,
    prompt: &str,
    config: &ProviderConfig,
    stream_fn: StreamFn,
    emit_event: EventSink,
) -> Result<Vec<ChatMessage>, String> {
    run_agent_loop_multimodal(
        workspace_root,
        session_id,
        prompt,
        None,
        config,
        None,
        None,
        stream_fn,
        emit_event,
    )
}

/// Runs the multi-turn agent loop with optional tool restrictions and custom system instructions.
#[allow(clippy::too_many_arguments)]
pub fn run_agent_loop_scoped(
    workspace_root: &Path,
    session_id: &str,
    prompt: &str,
    config: &ProviderConfig,
    allowed_tools: Option<&[String]>,
    custom_system_prompt: Option<&str>,
    stream_fn: StreamFn,
    emit_event: EventSink,
) -> Result<Vec<ChatMessage>, String> {
    run_agent_loop_multimodal(
        workspace_root,
        session_id,
        prompt,
        None,
        config,
        allowed_tools,
        custom_system_prompt,
        stream_fn,
        emit_event,
    )
}

/// Runs the multi-turn agent loop with optional image attachments, tool restrictions, and custom system prompt.
#[allow(clippy::too_many_arguments)]
pub fn run_agent_loop_multimodal(
    workspace_root: &Path,
    session_id: &str,
    prompt: &str,
    media_refs: Option<&[String]>,
    config: &ProviderConfig,
    allowed_tools: Option<&[String]>,
    custom_system_prompt: Option<&str>,
    stream_fn: StreamFn,
    emit_event: EventSink,
) -> Result<Vec<ChatMessage>, String> {
    let session = get_or_create_session(session_id);
    let cancelled = {
        let guard = session.lock().unwrap();
        guard.cancelled.clone()
    };
    cancelled.store(false, Ordering::SeqCst);

    emit_event(
        "agent_event",
        json!({
            "type": "turn_started",
            "payload": { "session_id": session_id }
        }),
    );

    // Assemble system prompt using the PromptIngestor
    let system_prompt = crate::prompt::PromptIngestor::assemble_system_prompt(
        workspace_root,
        custom_system_prompt,
    );

    // Initialize persistence and reconstruct prior conversation history
    let storage = crate::storage::get_storage();
    let active_ctx = storage
        .reconstruct_active_context(workspace_root, session_id, None)
        .ok();

    let mut active_leaf = active_ctx
        .as_ref()
        .and_then(|ctx| ctx.active_leaf_id.clone());

    let prior_messages = active_ctx
        .map(|ctx| ctx.chat_messages)
        .unwrap_or_default();

    if active_leaf.is_none() {
        let summary = storage.create_session(workspace_root, session_id, None).ok();
        active_leaf = summary.and_then(|s| s.active_leaf_id);
    }

    let attached_refs: Vec<String> = media_refs.unwrap_or_default().to_vec();

    let user_evt = crate::storage::PersistedEvent::new(
        session_id,
        active_leaf.clone(),
        crate::storage::EventPayload::UserTurn {
            prompt: prompt.to_string(),
            attached_files: attached_refs.clone(),
        },
    );
    active_leaf = Some(user_evt.id.clone());
    let _ = storage.append_event(workspace_root, &user_evt);

    let user_msg = if attached_refs.is_empty() {
        ChatMessage::user_text(prompt)
    } else {
        ChatMessage::user_multimodal(prompt, &attached_refs)
    };

    let mut messages: Vec<ChatMessage> = Vec::with_capacity(prior_messages.len() + 2);
    messages.push(ChatMessage::system(system_prompt));
    messages.extend(prior_messages);
    messages.push(user_msg);

    let filtered_tools = tools::get_filtered_tool_definitions(allowed_tools);
    let tool_defs = if filtered_tools.is_empty() {
        None
    } else {
        Some(filtered_tools)
    };
    let mut turn_count = 0;

    while turn_count < MAX_TURNS {
        turn_count += 1;

        if cancelled.load(Ordering::Relaxed) {
            let cancel_evt = crate::storage::PersistedEvent::new(
                session_id,
                active_leaf.clone(),
                crate::storage::EventPayload::Cancellation {
                    reason: "Turn cancelled by user".to_string(),
                    stage_index: None,
                },
            );
            let _ = storage.append_event_durable(workspace_root, &cancel_evt);

            emit_event(
                "agent_event",
                json!({
                    "type": "turn_cancelled",
                    "payload": { "reason": "Turn cancelled by user" }
                }),
            );
            return Ok(messages);
        }

        let mut turn_content = String::new();
        let mut on_chunk = |chunk: StreamChunk| match chunk {
            StreamChunk::Thinking(delta) => {
                emit_event(
                    "agent_event",
                    json!({
                        "type": "thinking_delta",
                        "payload": { "delta": delta }
                    }),
                );
            }
            StreamChunk::Text(delta) => {
                turn_content.push_str(&delta);
                emit_event(
                    "agent_event",
                    json!({
                        "type": "content_delta",
                        "payload": { "delta": delta }
                    }),
                );
            }
            _ => {}
        };

        let tool_calls = match stream_fn(config, &messages, tool_defs.as_deref(), &mut on_chunk) {
            Ok(calls) => calls,
            Err(e) => {
                let err_evt = crate::storage::PersistedEvent::new(
                    session_id,
                    active_leaf.clone(),
                    crate::storage::EventPayload::Error {
                        message: e.clone(),
                        stage_index: None,
                    },
                );
                let _ = storage.append_event_durable(workspace_root, &err_evt);

                emit_event(
                    "agent_event",
                    json!({
                        "type": "turn_error",
                        "payload": { "error": e }
                    }),
                );
                return Err(e);
            }
        };

        if cancelled.load(Ordering::Relaxed) {
            let cancel_evt = crate::storage::PersistedEvent::new(
                session_id,
                active_leaf.clone(),
                crate::storage::EventPayload::Cancellation {
                    reason: "Turn cancelled by user".to_string(),
                    stage_index: None,
                },
            );
            let _ = storage.append_event_durable(workspace_root, &cancel_evt);

            emit_event(
                "agent_event",
                json!({
                    "type": "turn_cancelled",
                    "payload": { "reason": "Turn cancelled by user" }
                }),
            );
            return Ok(messages);
        }

        // If no tool calls were requested, the model finished its response
        if tool_calls.is_empty() {
            let asst_evt = crate::storage::PersistedEvent::new(
                session_id,
                active_leaf.clone(),
                crate::storage::EventPayload::AssistantTurn {
                    content: turn_content.clone(),
                    model: config.model.clone(),
                },
            );
            let _ = storage.append_event_durable(workspace_root, &asst_evt);

            messages.push(ChatMessage {
                role: "assistant".to_string(),
                content: turn_content.into(),
                tool_calls: None,
                tool_call_id: None,
            });
            emit_event("agent_event", json!({ "type": "turn_completed", "payload": {} }));
            return Ok(messages);
        }

        // Preserve assistant message with tool calls in conversation history
        let tool_calls_json: Vec<Value> = tool_calls
            .iter()
            .map(|tc| {
                json!({
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.name,
                        "arguments": tc.arguments,
                    }
                })
            })
            .collect();

        messages.push(ChatMessage {
            role: "assistant".to_string(),
            content: turn_content.into(),
            tool_calls: Some(tool_calls_json),
            tool_call_id: None,
        });

        // Execute each tool call through permission gate and tools/ implementations
        for tc in tool_calls {
            let tc_evt = crate::storage::PersistedEvent::new(
                session_id,
                active_leaf.clone(),
                crate::storage::EventPayload::ToolCall {
                    call_id: tc.id.clone(),
                    tool: tc.name.clone(),
                    arguments: tc.arguments.clone(),
                    stage_index: None,
                },
            );
            active_leaf = Some(tc_evt.id.clone());
            let _ = storage.append_event(workspace_root, &tc_evt);

            if cancelled.load(Ordering::Relaxed) {
                let cancel_evt = crate::storage::PersistedEvent::new(
                    session_id,
                    active_leaf.clone(),
                    crate::storage::EventPayload::Cancellation {
                        reason: "Turn cancelled by user".to_string(),
                        stage_index: None,
                    },
                );
                let _ = storage.append_event_durable(workspace_root, &cancel_evt);

                emit_event(
                    "agent_event",
                    json!({
                        "type": "turn_cancelled",
                        "payload": { "reason": "Turn cancelled by user" }
                    }),
                );
                return Ok(messages);
            }

            // Physical enforcement of allowed_tools at execution boundary:
            if let Some(allowed) = allowed_tools {
                if !tools::is_tool_allowed(&tc.name, allowed) {
                    let err_output = format!("Tool '{}' is not permitted for this stage", tc.name);
                    let res_evt = crate::storage::PersistedEvent::new(
                        session_id,
                        active_leaf.clone(),
                        crate::storage::EventPayload::ToolResult {
                            call_id: tc.id.clone(),
                            tool: tc.name.clone(),
                            is_error: true,
                            output: err_output.clone(),
                            stage_index: None,
                        },
                    );
                    active_leaf = Some(res_evt.id.clone());
                    let _ = storage.append_event(workspace_root, &res_evt);

                    emit_event(
                        "agent_event",
                        json!({
                            "type": "tool_call_completed",
                            "payload": {
                                "id": tc.id,
                                "tool": tc.name,
                                "is_error": true,
                                "output": err_output.clone(),
                            }
                        }),
                    );
                    messages.push(ChatMessage {
                        role: "tool".to_string(),
                        content: err_output.into(),
                        tool_calls: None,
                        tool_call_id: Some(tc.id),
                    });
                    continue;
                }
            }

            let (action_type, tool_class) = tools::get_tool_action_type(&tc.name, &tc.arguments);
            let needs_approval = {
                let guard = session.lock().unwrap();
                match action_type {
                    tools::ToolActionType::ReadOnly => false,
                    tools::ToolActionType::WriteFile => guard.policy.write_requires_approval,
                    tools::ToolActionType::EditFile => guard.policy.edit_requires_approval,
                    tools::ToolActionType::ExecuteBash => guard.policy.bash_requires_approval,
                    tools::ToolActionType::MutateExternal => true,
                }
            };

            let mut effective_args = tc.arguments.clone();
            let mut rejected = false;
            let mut reject_reason = String::new();

            if needs_approval {
                let (perm_tx, perm_rx) = mpsc::channel();
                {
                    let mut guard = session.lock().unwrap();
                    guard.pending_permissions.insert(tc.id.clone(), perm_tx);
                }

                emit_event(
                    "agent_event",
                    json!({
                        "type": "tool_call_pending",
                        "payload": {
                            "id": tc.id,
                            "tool": tc.name,
                            "tool_class": tool_class,
                            "arguments": tc.arguments,
                        }
                    }),
                );

                let perm_decision_record: Option<(String, Option<String>, Option<String>)>;

                // Wait for user approval decision from resolve_tool_permission
                loop {
                    if cancelled.load(Ordering::Relaxed) {
                        rejected = true;
                        reject_reason = "Turn cancelled by user".to_string();
                        perm_decision_record = Some(("reject".to_string(), None, Some(reject_reason.clone())));
                        break;
                    }

                    match perm_rx.recv_timeout(Duration::from_millis(100)) {
                        Ok(PermissionDecision::Allow) => {
                            perm_decision_record = Some(("allow".to_string(), None, None));
                            break;
                        }
                        Ok(PermissionDecision::AutoAllow) => {
                            let mut guard = session.lock().unwrap();
                            match action_type {
                                tools::ToolActionType::WriteFile => guard.policy.write_requires_approval = false,
                                tools::ToolActionType::EditFile => guard.policy.edit_requires_approval = false,
                                tools::ToolActionType::ExecuteBash => guard.policy.bash_requires_approval = false,
                                _ => {}
                            }
                            perm_decision_record = Some(("auto_allow".to_string(), None, None));
                            break;
                        }
                        Ok(PermissionDecision::Modify(new_args)) => {
                            perm_decision_record = Some(("modify".to_string(), Some(new_args.clone()), None));
                            effective_args = new_args;
                            break;
                        }
                        Ok(PermissionDecision::Reject(reason)) => {
                            rejected = true;
                            reject_reason = reason.clone();
                            perm_decision_record = Some(("reject".to_string(), None, Some(reason)));
                            break;
                        }
                        Err(mpsc::RecvTimeoutError::Timeout) => continue,
                        Err(mpsc::RecvTimeoutError::Disconnected) => {
                            rejected = true;
                            reject_reason = "Permission gate closed".to_string();
                            perm_decision_record = Some(("reject".to_string(), None, Some(reject_reason.clone())));
                            break;
                        }
                    }
                }

                // Cleanup pending entry
                {
                    let mut guard = session.lock().unwrap();
                    guard.pending_permissions.remove(&tc.id);
                }

                if let Some((dec, mod_args, rej_reason)) = perm_decision_record {
                    let perm_evt = crate::storage::PersistedEvent::new(
                        session_id,
                        active_leaf.clone(),
                        crate::storage::EventPayload::PermissionDecision {
                            call_id: tc.id.clone(),
                            tool: tc.name.clone(),
                            decision: dec,
                            modified_arguments: mod_args,
                            reject_reason: rej_reason,
                        },
                    );
                    active_leaf = Some(perm_evt.id.clone());
                    let _ = storage.append_event(workspace_root, &perm_evt);
                }
            }

            if rejected {
                let output = format!("Tool execution rejected by user: {}", reject_reason);
                let res_evt = crate::storage::PersistedEvent::new(
                    session_id,
                    active_leaf.clone(),
                    crate::storage::EventPayload::ToolResult {
                        call_id: tc.id.clone(),
                        tool: tc.name.clone(),
                        is_error: true,
                        output: output.clone(),
                        stage_index: None,
                    },
                );
                active_leaf = Some(res_evt.id.clone());
                let _ = storage.append_event(workspace_root, &res_evt);

                emit_event(
                    "agent_event",
                    json!({
                        "type": "tool_call_completed",
                        "payload": {
                            "id": tc.id,
                            "tool": tc.name,
                            "is_error": true,
                            "output": output,
                        }
                    }),
                );
                messages.push(ChatMessage {
                    role: "tool".to_string(),
                    content: output.into(),
                    tool_calls: None,
                    tool_call_id: Some(tc.id),
                });
                continue;
            }

            emit_event(
                "agent_event",
                json!({
                    "type": "tool_call_started",
                    "payload": {
                        "id": tc.id,
                        "tool": tc.name,
                        "arguments": effective_args,
                    }
                }),
            );

            // Execute tool through tools layer with active PID tracking for bash
            let session_clone = session.clone();
            let exec_res = if tc.name == "bash" || tc.name == "execute_bash" {
                let on_pid = move |pid: u32| {
                    let mut guard = session_clone.lock().unwrap();
                    if guard.cancelled.load(Ordering::SeqCst) {
                        #[cfg(unix)]
                        unsafe {
                            libc::kill(-(pid as i32), libc::SIGKILL);
                        }
                        #[cfg(target_os = "windows")]
                        {
                            let _ = std::process::Command::new("taskkill")
                                .args(["/PID", &pid.to_string(), "/T", "/F"])
                                .output();
                        }
                    } else {
                        guard.active_pid = Some(pid);
                    }
                };
                tools::execute_tool_with_context(
                    workspace_root,
                    Some(session_id),
                    &tc.name,
                    &effective_args,
                    Some(on_pid),
                )
            } else {
                tools::execute_tool_with_context(
                    workspace_root,
                    Some(session_id),
                    &tc.name,
                    &effective_args,
                    None::<fn(u32)>,
                )
            };

            // Ensure active_pid is cleared after bash execution completes, including errors/timeouts
            {
                let mut guard = session.lock().unwrap();
                guard.active_pid = None;
            }

            let (is_error, output) = match exec_res {
                Ok(out) => (false, out),
                Err(err) => (true, err),
            };

            let res_evt = crate::storage::PersistedEvent::new(
                session_id,
                active_leaf.clone(),
                crate::storage::EventPayload::ToolResult {
                    call_id: tc.id.clone(),
                    tool: tc.name.clone(),
                    is_error,
                    output: crate::storage::truncate_tool_output(&output),
                    stage_index: None,
                },
            );
            active_leaf = Some(res_evt.id.clone());
            let _ = storage.append_event(workspace_root, &res_evt);

            emit_event(
                "agent_event",
                json!({
                    "type": "tool_call_completed",
                    "payload": {
                        "id": tc.id,
                        "tool": tc.name,
                        "is_error": is_error,
                        "output": output,
                    }
                }),
            );

            let context_output = truncate_context_tool_output(&output);
            messages.push(ChatMessage {
                role: "tool".to_string(),
                content: context_output.into(),
                tool_calls: None,
                tool_call_id: Some(tc.id),
            });
        }
    }

    // If the loop finished normally because tool_calls was empty, it already returned Ok(messages) with turn_completed inside the loop.
    // If execution reached here, MAX_TURNS was exhausted while the model was still requesting tools.
    let err_msg = format!("Maximum agent iterations reached ({})", MAX_TURNS);
    let err_evt = crate::storage::PersistedEvent::new(
        session_id,
        active_leaf.clone(),
        crate::storage::EventPayload::Error {
            message: err_msg.clone(),
            stage_index: None,
        },
    );
    let _ = storage.append_event_durable(workspace_root, &err_evt);

    emit_event(
        "agent_event",
        json!({
            "type": "turn_error",
            "payload": { "error": err_msg }
        }),
    );
    Err(err_msg)
}

// ---------------------------------------------------------------------------
// Tauri IPC Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn run_agent_turn(
    app: tauri::AppHandle,
    workspace_root: String,
    session_id: String,
    prompt: String,
    media: Option<Vec<String>>,
    llm_config: LlmConfigPayload,
) -> Result<(), String> {
    use tauri::Emitter;

    let path = PathBuf::from(workspace_root);
    let config = ProviderConfig::from(llm_config);

    let app_clone = app.clone();
    let emit_event: EventSink = Arc::new(move |event, payload| {
        let _ = app_clone.emit(event, payload);
    });

    let stream_fn: StreamFn = Box::new(
        |cfg: &ProviderConfig, msgs: &[ChatMessage], tools: Option<&[Value]>, on_chunk| {
            provider::stream_chat_completion(cfg, msgs, tools, on_chunk)
        },
    );

    tauri::async_runtime::spawn_blocking(move || {
        let _ = run_agent_loop_multimodal(
            &path,
            &session_id,
            &prompt,
            media.as_deref(),
            &config,
            None,
            None,
            stream_fn,
            emit_event,
        );
        remove_session(&session_id);
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))
}

#[tauri::command]
pub fn cancel_agent_turn(session_id: String) -> Result<(), String> {
    let session = get_or_create_session(&session_id);
    let mut guard = session.lock().unwrap();
    guard.cancelled.store(true, Ordering::SeqCst);

    // Cancel all pending permissions
    for (_, sender) in guard.pending_permissions.drain() {
        let _ = sender.send(PermissionDecision::Reject("Turn cancelled".to_string()));
    }

    // Terminate running bash process group if present
    if let Some(pid) = guard.active_pid.take() {
        #[cfg(unix)]
        unsafe {
            libc::kill(-(pid as i32), libc::SIGKILL);
        }
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("taskkill")
                .args(["/PID", &pid.to_string(), "/T", "/F"])
                .output();
        }
    }

    Ok(())
}

#[tauri::command]
pub fn resolve_tool_permission(
    session_id: Option<String>,
    call_id: String,
    decision: String,
    tool_class: Option<String>,
    modified_args: Option<String>,
    reject_reason: Option<String>,
) -> Result<bool, String> {
    let sess_id = session_id.unwrap_or_else(|| "default".to_string());
    let session = get_or_create_session(&sess_id);
    let mut guard = session.lock().unwrap();

    if let Some(sender) = guard.pending_permissions.remove(&call_id) {
        let perm_decision = match decision.as_str() {
            "allow" => PermissionDecision::Allow,
            "auto_allow" => {
                if let Some(tc) = tool_class {
                    match tc.as_str() {
                        "write" => guard.policy.write_requires_approval = false,
                        "edit" => guard.policy.edit_requires_approval = false,
                        "bash" => guard.policy.bash_requires_approval = false,
                        _ => {}
                    }
                }
                PermissionDecision::AutoAllow
            }
            "modify" => PermissionDecision::Modify(modified_args.unwrap_or_default()),
            "reject" => PermissionDecision::Reject(
                reject_reason.unwrap_or_else(|| "User rejected action".to_string()),
            ),
            _ => PermissionDecision::Reject("Unknown decision".to_string()),
        };

        let _ = sender.send(perm_decision);
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn update_session_policy(
    session_id: String,
    write_requires_approval: bool,
    edit_requires_approval: bool,
    bash_requires_approval: bool,
) -> Result<(), String> {
    let session = get_or_create_session(&session_id);
    let mut guard = session.lock().unwrap();
    guard.policy.write_requires_approval = write_requires_approval;
    guard.policy.edit_requires_approval = edit_requires_approval;
    guard.policy.bash_requires_approval = bash_requires_approval;
    Ok(())
}

// ---------------------------------------------------------------------------
// Unit & Integration Tests for agent.rs
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;

    fn make_test_config() -> ProviderConfig {
        ProviderConfig {
            base_url: "http://localhost:11434".to_string(),
            api_key: None,
            model: "test-model".to_string(),
            temperature: None,
            max_tokens: None,
            timeout_secs: Some(10),
        }
    }

    // Helper to capture all emitted events in memory
    fn make_capturing_sink() -> (EventSink, Arc<Mutex<Vec<(String, Value)>>>) {
        let events = Arc::new(Mutex::new(Vec::new()));
        let events_clone = events.clone();
        let sink: EventSink = Arc::new(move |event: &str, payload: Value| {
            events_clone
                .lock()
                .unwrap()
                .push((event.to_string(), payload));
        });
        (sink, events)
    }

    fn cleanup_test_session(workspace_dir: &Path, session_id: &str) {
        let storage = crate::storage::get_storage();
        let file = storage.session_file_path(workspace_dir, session_id);
        let _ = fs::remove_file(file);
    }

    #[test]
    fn test_normal_text_only_turn() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_text");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_text";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();
        let stream_mock: StreamFn = Box::new(|_, _, _, on_chunk| {
            on_chunk(StreamChunk::Thinking("Analyzing question...".to_string()));
            on_chunk(StreamChunk::Text("Hello! How can I help you?".to_string()));
            Ok(vec![])
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Hi",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let messages = res.unwrap();
        assert_eq!(messages.len(), 3); // system, user, assistant
        assert_eq!(messages[2].role, "assistant");
        assert_eq!(messages[2].content, "Hello! How can I help you?");

        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "turn_started"));
        assert!(evs.iter().any(|(_, v)| v["type"] == "thinking_delta"));
        assert!(evs.iter().any(|(_, v)| v["type"] == "content_delta"));
        assert!(evs.iter().any(|(_, v)| v["type"] == "turn_completed"));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_single_tool_call() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_single_tool");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_single_tool";
        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::write(temp_dir.join("sample.txt"), "File content hello");

        let (sink, events) = make_capturing_sink();
        let calls_count = Arc::new(Mutex::new(0));
        let calls_clone = calls_count.clone();

        let stream_mock: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            let mut c = calls_clone.lock().unwrap();
            *c += 1;
            if *c == 1 {
                Ok(vec![AssembledToolCall {
                    id: "call_1".to_string(),
                    name: "read_file".to_string(),
                    arguments: json!({ "path": "sample.txt" }).to_string(),
                }])
            } else {
                // Verify tool response was provided
                assert_eq!(msgs.last().unwrap().role, "tool");
                assert_eq!(msgs.last().unwrap().content, "File content hello");
                on_chunk(StreamChunk::Text("I read the file.".to_string()));
                Ok(vec![])
            }
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Read sample.txt",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();
        // system, user, assistant (with tool_calls), tool result, assistant (final answer)
        assert_eq!(msgs.len(), 5);
        assert_eq!(msgs[2].role, "assistant");
        assert!(msgs[2].tool_calls.is_some());
        assert_eq!(msgs[3].role, "tool");
        assert_eq!(msgs[3].content, "File content hello");
        assert_eq!(msgs[4].role, "assistant");
        assert_eq!(msgs[4].content, "I read the file.");

        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "tool_call_started"));
        assert!(evs.iter().any(|(_, v)| v["type"] == "tool_call_completed" && v["payload"]["is_error"] == false));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_multi_step_tool_calls() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_multistep");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_multistep";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, _) = make_capturing_sink();
        let step = Arc::new(Mutex::new(0));
        let step_clone = step.clone();

        // Turn 1: write_file. Turn 2: read_file. Turn 3: finish text.
        let stream_mock: StreamFn = Box::new(move |_, _, _, on_chunk| {
            let mut s = step_clone.lock().unwrap();
            *s += 1;
            match *s {
                1 => Ok(vec![AssembledToolCall {
                    id: "c1".to_string(),
                    name: "write_file".to_string(),
                    arguments: json!({ "path": "a.txt", "content": "data_a" }).to_string(),
                }]),
                2 => Ok(vec![AssembledToolCall {
                    id: "c2".to_string(),
                    name: "read_file".to_string(),
                    arguments: json!({ "path": "a.txt" }).to_string(),
                }]),
                _ => {
                    on_chunk(StreamChunk::Text("Finished workflow".to_string()));
                    Ok(vec![])
                }
            }
        });

        // Set policy to auto-allow write so it runs without interactive gate in test
        let sess = get_or_create_session(session_id);
        sess.lock().unwrap().policy.write_requires_approval = false;

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Write then read",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();
        // system, user, assistant(tc1), tool1, assistant(tc2), tool2, assistant(final)
        assert_eq!(msgs.len(), 7);
        assert_eq!(msgs[3].role, "tool");
        assert!(msgs[3].content.contains("Successfully wrote"));
        assert_eq!(msgs[5].role, "tool");
        assert_eq!(msgs[5].content, "data_a");

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_tool_failure_returned_to_model() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_fail");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_fail";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();
        let turn = Arc::new(Mutex::new(0));
        let turn_clone = turn.clone();

        let stream_mock: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            let mut t = turn_clone.lock().unwrap();
            *t += 1;
            if *t == 1 {
                Ok(vec![AssembledToolCall {
                    id: "c_fail".to_string(),
                    name: "read_file".to_string(),
                    arguments: json!({ "path": "non_existent.txt" }).to_string(),
                }])
            } else {
                // Ensure tool error was injected into conversation history
                let last = msgs.last().unwrap();
                assert_eq!(last.role, "tool");
                assert!(last.content.contains("File not found"));
                on_chunk(StreamChunk::Text("I saw the file does not exist.".to_string()));
                Ok(vec![])
            }
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Read missing file",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "tool_call_completed" && v["payload"]["is_error"] == true));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_permission_rejection() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_perm_reject");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_reject";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();
        let turn = Arc::new(Mutex::new(0));
        let turn_clone = turn.clone();

        let stream_mock: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            let mut t = turn_clone.lock().unwrap();
            *t += 1;
            if *t == 1 {
                Ok(vec![AssembledToolCall {
                    id: "c_bash".to_string(),
                    name: "bash".to_string(),
                    arguments: json!({ "command": "rm -rf /" }).to_string(),
                }])
            } else {
                let last = msgs.last().unwrap();
                assert_eq!(last.role, "tool");
                assert!(last.content.contains("rejected by user"));
                on_chunk(StreamChunk::Text("Understood, skipping command.".to_string()));
                Ok(vec![])
            }
        });

        // Spawn rejection handler in background thread
        std::thread::spawn(|| {
            std::thread::sleep(Duration::from_millis(50));
            let _ = resolve_tool_permission(
                Some("test_sess_reject".to_string()),
                "c_bash".to_string(),
                "reject".to_string(),
                Some("bash".to_string()),
                None,
                Some("Forbidden command".to_string()),
            );
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Run bad command",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "tool_call_pending"));
        assert!(evs.iter().any(|(_, v)| v["type"] == "tool_call_completed" && v["payload"]["is_error"] == true));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_cancellation() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_cancel");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_cancel";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();
        let stream_mock: StreamFn = Box::new(|_, _, _, _| {
            // Cancel session right during streaming
            let _ = cancel_agent_turn("test_sess_cancel".to_string());
            Ok(vec![AssembledToolCall {
                id: "c_canc".to_string(),
                name: "read_file".to_string(),
                arguments: json!({ "path": "a.txt" }).to_string(),
            }])
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Cancelled prompt",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "turn_cancelled"));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_maximum_iteration_limit() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_max_iter");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_max_iter";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();
        let loop_count = Arc::new(Mutex::new(0));
        let loop_clone = loop_count.clone();

        // Model stubbornly returns tool calls forever
        let stream_mock: StreamFn = Box::new(move |_, _, _, _| {
            let mut c = loop_clone.lock().unwrap();
            *c += 1;
            Ok(vec![AssembledToolCall {
                id: format!("c_{}", *c),
                name: "read_file".to_string(),
                arguments: json!({ "path": "any.txt" }).to_string(),
            }])
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Endless loop",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_err(), "MAX_TURNS exhaustion must return an error state");
        assert_eq!(*loop_count.lock().unwrap(), MAX_TURNS);

        let evs = events.lock().unwrap();
        let turn_error_ev = evs.iter().find(|(_, v)| v["type"] == "turn_error");
        assert!(turn_error_ev.is_some(), "Must emit turn_error on MAX_TURNS exhaustion");
        let error_msg = turn_error_ev.unwrap().1["payload"]["error"].as_str().unwrap();
        assert!(error_msg.contains("Maximum agent iterations reached"));

        assert!(!evs.iter().any(|(_, v)| v["type"] == "turn_completed"), "Must not emit turn_completed on MAX_TURNS exhaustion");

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_multiple_tool_calls_in_one_response() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_multi_tools");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_multi_tools";
        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::write(temp_dir.join("f1.txt"), "content_1");
        let _ = fs::write(temp_dir.join("f2.txt"), "content_2");

        let (sink, _) = make_capturing_sink();
        let turn = Arc::new(Mutex::new(0));
        let turn_clone = turn.clone();

        let stream_mock: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            let mut t = turn_clone.lock().unwrap();
            *t += 1;
            if *t == 1 {
                // Return TWO tool calls in one single turn
                Ok(vec![
                    AssembledToolCall {
                        id: "c_f1".to_string(),
                        name: "read_file".to_string(),
                        arguments: json!({ "path": "f1.txt" }).to_string(),
                    },
                    AssembledToolCall {
                        id: "c_f2".to_string(),
                        name: "read_file".to_string(),
                        arguments: json!({ "path": "f2.txt" }).to_string(),
                    },
                ])
            } else {
                // Check both tool responses are in history
                let len = msgs.len();
                assert_eq!(msgs[len - 2].role, "tool");
                assert_eq!(msgs[len - 2].content, "content_1");
                assert_eq!(msgs[len - 1].role, "tool");
                assert_eq!(msgs[len - 1].content, "content_2");
                on_chunk(StreamChunk::Text("Read both files.".to_string()));
                Ok(vec![])
            }
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Read both files",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();
        // system, user, assistant(2 tool calls), tool1, tool2, assistant(final)
        assert_eq!(msgs.len(), 6);
        assert_eq!(msgs[2].tool_calls.as_ref().unwrap().len(), 2);
        assert_eq!(msgs[3].tool_call_id.as_deref(), Some("c_f1"));
        assert_eq!(msgs[4].tool_call_id.as_deref(), Some("c_f2"));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_conversation_history_ordering() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_history");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_history";
        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::write(temp_dir.join("test.txt"), "hello history");

        let (sink, _) = make_capturing_sink();
        let turn = Arc::new(Mutex::new(0));
        let turn_clone = turn.clone();

        let stream_mock: StreamFn = Box::new(move |_, _, _, on_chunk| {
            let mut t = turn_clone.lock().unwrap();
            *t += 1;
            if *t == 1 {
                on_chunk(StreamChunk::Thinking("Let me check the file".to_string()));
                on_chunk(StreamChunk::Text("Reading the file now:".to_string()));
                Ok(vec![AssembledToolCall {
                    id: "c_hist".to_string(),
                    name: "read_file".to_string(),
                    arguments: json!({ "path": "test.txt" }).to_string(),
                }])
            } else {
                on_chunk(StreamChunk::Text("The file has hello history.".to_string()));
                Ok(vec![])
            }
        });

        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Inspect test.txt",
            &make_test_config(),
            stream_mock,
            sink,
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();
        assert_eq!(msgs.len(), 5);
        assert_eq!(msgs[0].role, "system");
        assert_eq!(msgs[1].role, "user");
        assert_eq!(msgs[1].content, "Inspect test.txt");
        assert_eq!(msgs[2].role, "assistant");
        assert_eq!(msgs[2].content, "Reading the file now:");
        assert_eq!(msgs[2].tool_calls.as_ref().unwrap().len(), 1);
        assert_eq!(msgs[3].role, "tool");
        assert_eq!(msgs[3].content, "hello history");
        assert_eq!(msgs[3].tool_call_id.as_deref(), Some("c_hist"));
        assert_eq!(msgs[4].role, "assistant");
        assert_eq!(msgs[4].content, "The file has hello history.");

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_cancellation_terminates_in_flight_bash() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_cancel_bash");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_cancel_bash";
        cleanup_test_session(&temp_dir, session_id);

        let (sink, events) = make_capturing_sink();

        // Auto-allow bash for this test session
        let sess = get_or_create_session(session_id);
        sess.lock().unwrap().policy.bash_requires_approval = false;

        let stream_mock: StreamFn = Box::new(|_, _, _, _| {
            Ok(vec![AssembledToolCall {
                id: "c_sleep".to_string(),
                name: "bash".to_string(),
                arguments: json!({ "command": "sleep 10" }).to_string(),
            }])
        });

        // Spawn a background thread that cancels the session once the bash PID is registered
        let sess_clone = sess.clone();
        let cancel_thread = std::thread::spawn(move || {
            for _ in 0..100 {
                std::thread::sleep(Duration::from_millis(20));
                let pid_opt = {
                    let guard = sess_clone.lock().unwrap();
                    guard.active_pid
                };
                if pid_opt.is_some() {
                    let _ = cancel_agent_turn(session_id.to_string());
                    return;
                }
            }
        });

        let start = std::time::Instant::now();
        let res = run_agent_loop(
            &temp_dir,
            session_id,
            "Run long sleep",
            &make_test_config(),
            stream_mock,
            sink,
        );

        let elapsed = start.elapsed();
        cancel_thread.join().unwrap();

        assert!(res.is_ok());
        // 10s sleep should have been killed early by cancel_agent_turn (<3s elapsed)
        assert!(elapsed < Duration::from_secs(3), "In-flight bash command must be killed promptly on cancellation");

        // active_pid must be reset to None after execution completes
        {
            let guard = sess.lock().unwrap();
            assert_eq!(guard.active_pid, None, "active_pid must be reset to None after execution");
        }

        // turn_cancelled must be emitted
        let evs = events.lock().unwrap();
        assert!(evs.iter().any(|(_, v)| v["type"] == "turn_cancelled"));

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_multi_turn_history_reconstruction() {
        let temp_dir = std::env::temp_dir().join("unfuse_agent_test_multiturn");
        let _ = fs::create_dir_all(&temp_dir);
        let session_id = "test_sess_multiturn";
        cleanup_test_session(&temp_dir, session_id);

        let (sink1, _) = make_capturing_sink();
        let stream_mock1: StreamFn = Box::new(|_, _, _, on_chunk| {
            on_chunk(StreamChunk::Text("Hello Alice!".to_string()));
            Ok(vec![])
        });

        // Turn 1
        let res1 = run_agent_loop(
            &temp_dir,
            session_id,
            "My name is Alice",
            &make_test_config(),
            stream_mock1,
            sink1,
        );
        assert!(res1.is_ok());
        let msgs1 = res1.unwrap();
        assert_eq!(msgs1.len(), 3); // system, user, assistant

        // Turn 2
        let (sink2, _) = make_capturing_sink();
        let seen_msgs_turn2 = Arc::new(Mutex::new(Vec::new()));
        let seen_msgs_clone = seen_msgs_turn2.clone();

        let stream_mock2: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            *seen_msgs_clone.lock().unwrap() = msgs.to_vec();
            on_chunk(StreamChunk::Text("Your name is Alice.".to_string()));
            Ok(vec![])
        });

        let res2 = run_agent_loop(
            &temp_dir,
            session_id,
            "What is my name?",
            &make_test_config(),
            stream_mock2,
            sink2,
        );
        assert!(res2.is_ok());
        let msgs2 = res2.unwrap();
        // Turn 2 must contain: system, user1, assistant1, user2, assistant2
        assert_eq!(msgs2.len(), 5);
        assert_eq!(msgs2[1].content, "My name is Alice");
        assert_eq!(msgs2[2].content, "Hello Alice!");
        assert_eq!(msgs2[3].content, "What is my name?");
        assert_eq!(msgs2[4].content, "Your name is Alice.");

        // And the model received the prior turn in its stream call!
        let streamed = seen_msgs_turn2.lock().unwrap();
        assert_eq!(streamed.len(), 4); // system, user1, assistant1, user2

        cleanup_test_session(&temp_dir, session_id);
        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_truncate_context_tool_output() {
        let short = "Hello world";
        assert_eq!(truncate_context_tool_output(short), short);

        let huge = "x".repeat(35_000);
        let truncated = truncate_context_tool_output(&huge);
        assert!(truncated.contains("[UNFUSE: Tool output truncated for model context"));
        assert!(truncated.contains("showing 30000 of 35000 chars"));
        assert_eq!(truncated.chars().take(30_000).collect::<String>(), "x".repeat(30_000));
    }
}
