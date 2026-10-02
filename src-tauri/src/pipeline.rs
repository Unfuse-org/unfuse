use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::agent::{self, EventSink, LlmConfigPayload, StreamFn};
use crate::provider::{ChatMessage, ProviderConfig};
use crate::tools;

/// Configuration payload for a single stage in the pipeline received over IPC.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStagePayload {
    pub name: String,
    pub model: LlmConfigPayload,
    pub allowed_tools: Vec<String>,
    pub system_instruction: Option<String>,
}

/// A validated stage ready for execution in the sequential pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStage {
    pub name: String,
    pub model: ProviderConfig,
    pub allowed_tools: Vec<String>,
    pub system_instruction: Option<String>,
}

impl From<PipelineStagePayload> for PipelineStage {
    fn from(p: PipelineStagePayload) -> Self {
        Self {
            name: p.name,
            model: ProviderConfig::from(p.model),
            allowed_tools: p.allowed_tools,
            system_instruction: p.system_instruction,
        }
    }
}

/// Structured deliverable produced by a completed stage and handed off downstream.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct StageDeliverable {
    pub stage_index: usize,
    pub stage_name: String,
    pub model_name: String,
    pub output_text: String,
    pub files_modified: Vec<String>,
    pub tool_calls_count: usize,
    pub success: bool,
    pub duration_ms: u64,
}

fn default_true() -> bool {
    true
}

/// Incoming IPC payload describing the entire multi-stage pipeline plan.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelinePlanPayload {
    pub plan_id: String,
    pub session_id: String,
    pub workspace_root: String,
    pub user_prompt: String,
    pub stages: Vec<PipelineStagePayload>,
    #[serde(default = "default_true")]
    pub stop_on_stage_error: bool,
}

/// Internal pipeline plan with resolved paths and domain configs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelinePlan {
    pub plan_id: String,
    pub session_id: String,
    pub workspace_root: PathBuf,
    pub user_prompt: String,
    pub stages: Vec<PipelineStage>,
    pub stop_on_stage_error: bool,
}

impl From<PipelinePlanPayload> for PipelinePlan {
    fn from(p: PipelinePlanPayload) -> Self {
        Self {
            plan_id: p.plan_id,
            session_id: p.session_id,
            workspace_root: PathBuf::from(p.workspace_root),
            user_prompt: p.user_prompt,
            stages: p.stages.into_iter().map(PipelineStage::from).collect(),
            stop_on_stage_error: p.stop_on_stage_error,
        }
    }
}

/// Formulates the prompt for the current stage, preserving complete prior deliverables.
pub fn build_stage_prompt(
    original_prompt: &str,
    current_stage: &PipelineStage,
    prior_deliverables: &[StageDeliverable],
) -> String {
    if prior_deliverables.is_empty() {
        return original_prompt.to_string();
    }

    let mut prompt = format!(
        "Original User Request:\n{}\n\n--- Prior Stage Deliverables ---\n",
        original_prompt
    );

    for d in prior_deliverables {
        prompt.push_str(&format!(
            "Stage {} [{}] (model: {}):\n{}\n",
            d.stage_index + 1,
            d.stage_name,
            d.model_name,
            d.output_text.trim()
        ));
        if !d.files_modified.is_empty() {
            prompt.push_str(&format!("Files Modified: {}\n", d.files_modified.join(", ")));
        }
        prompt.push_str("\n");
    }

    prompt.push_str(&format!(
        "--- Current Directive ---\nYou are executing Stage {}: '{}'. Use the deliverables above to complete your phase.",
        prior_deliverables.len() + 1,
        current_stage.name
    ));

    prompt
}

/// Validates a pipeline plan prior to execution.
/// Rejects empty stages, empty model names, and unrecognized tool names.
pub fn validate_pipeline_plan(plan: &PipelinePlan) -> Result<(), String> {
    if plan.stages.is_empty() {
        return Err("Pipeline validation error: stages array cannot be empty".to_string());
    }

    if plan.session_id.trim().is_empty() {
        return Err("Pipeline validation error: session_id cannot be empty".to_string());
    }

    for (idx, stage) in plan.stages.iter().enumerate() {
        if stage.name.trim().is_empty() {
            return Err(format!(
                "Pipeline validation error: stage {} name cannot be empty",
                idx + 1
            ));
        }

        if stage.model.model.trim().is_empty() {
            return Err(format!(
                "Pipeline validation error: stage {} ('{}') has an empty model name",
                idx + 1,
                stage.name
            ));
        }

        for tool in &stage.allowed_tools {
            let canon = tools::canonical_tool_name(tool);
            if !matches!(canon, "read_file" | "write_file" | "edit_file" | "bash") {
                return Err(format!(
                    "Pipeline validation error: stage {} ('{}') specifies unrecognized tool '{}'",
                    idx + 1,
                    stage.name,
                    tool
                ));
            }
        }
    }

    Ok(())
}

/// Determines if a tool call was successfully executed by inspecting its output response.
pub fn is_tool_call_successful(tool_name: &str, output: &str) -> bool {
    if output.contains("is not permitted for this stage")
        || output.starts_with("Tool execution rejected")
        || output.starts_with("Invalid JSON")
        || output.starts_with("Unrecognized tool:")
        || output.starts_with("Missing required parameter")
    {
        return false;
    }

    match tools::canonical_tool_name(tool_name) {
        "write_file" => output.starts_with("Successfully wrote "),
        "edit_file" => output.starts_with("Successfully edited "),
        "read_file" => {
            !output.starts_with("File not found:")
                && !output.starts_with("Failed to open file")
                && !output.starts_with("Failed to read file")
                && !output.starts_with("Error reading line")
                && !output.contains("is a directory, not a file")
                && !output.starts_with("Offset line ")
        }
        "bash" => {
            !output.starts_with("Failed to spawn")
                && !output.contains("Execution timed out")
        }
        _ => false,
    }
}

/// Extracts file paths touched by successfully executed write_file or edit_file calls.
/// Files from rejected or failed tool calls are never included.
pub fn extract_modified_files(messages: &[ChatMessage]) -> Vec<String> {
    let mut files = Vec::new();
    for msg in messages {
        if let Some(tool_calls) = &msg.tool_calls {
            for tc in tool_calls {
                if let Some(func) = tc.get("function") {
                    let name = func.get("name").and_then(|n| n.as_str()).unwrap_or("");
                    let canon = tools::canonical_tool_name(name);
                    if canon == "write_file" || canon == "edit_file" {
                        if let Some(call_id) = tc.get("id").and_then(|id| id.as_str()) {
                            let tool_resp = messages.iter().find(|m| {
                                m.role == "tool" && m.tool_call_id.as_deref() == Some(call_id)
                            });

                            if let Some(resp) = tool_resp {
                                if is_tool_call_successful(name, &resp.content.as_text()) {
                                    if let Some(args_str) = func.get("arguments").and_then(|a| a.as_str()) {
                                        if let Ok(v) = serde_json::from_str::<Value>(args_str) {
                                            if let Some(path) = v.get("path").and_then(|p| p.as_str()) {
                                                if !files.contains(&path.to_string()) {
                                                    files.push(path.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    files
}

/// Counts only successfully executed tool calls in the conversation history.
pub fn count_successful_tool_calls(messages: &[ChatMessage]) -> usize {
    let mut count = 0;
    for msg in messages {
        if let Some(tool_calls) = &msg.tool_calls {
            for tc in tool_calls {
                if let Some(call_id) = tc.get("id").and_then(|id| id.as_str()) {
                    let tool_name = tc.get("function")
                        .and_then(|f| f.get("name"))
                        .and_then(|n| n.as_str())
                        .unwrap_or("");
                    if let Some(tool_resp) = messages.iter().find(|m| {
                        m.role == "tool" && m.tool_call_id.as_deref() == Some(call_id)
                    }) {
                        if is_tool_call_successful(tool_name, &tool_resp.content.as_text()) {
                            count += 1;
                        }
                    }
                }
            }
        }
    }
    count
}

/// Extracts the final assistant text response from conversation history.
pub fn extract_final_assistant_content(messages: &[ChatMessage]) -> String {
    messages
        .iter()
        .rev()
        .find(|m| m.role == "assistant")
        .map(|m| m.content.as_text())
        .unwrap_or_default()
}

/// Runs a sequential multi-stage pipeline using a custom stream factory (enables clean testing).
pub fn run_pipeline_with_stream_factory<F>(
    plan: &PipelinePlan,
    mut stream_fn_factory: F,
    emit_event: EventSink,
) -> Result<Vec<StageDeliverable>, String>
where
    F: FnMut(&PipelineStage) -> StreamFn,
{
    // Validate plan upfront before starting any execution or emitting started events
    validate_pipeline_plan(plan)?;

    let emit_shared: Arc<dyn Fn(&str, Value) + Send + Sync> = Arc::from(emit_event);

    emit_shared(
        "pipeline_event",
        json!({
            "type": "pipeline_started",
            "payload": {
                "plan_id": &plan.plan_id,
                "session_id": &plan.session_id,
                "total_stages": plan.stages.len(),
            }
        }),
    );

    let mut deliverables: Vec<StageDeliverable> = Vec::new();

    for (idx, stage) in plan.stages.iter().enumerate() {
        // 1. Check if pipeline was cancelled prior to starting this stage
        if agent::is_session_cancelled(&plan.session_id) {
            emit_shared(
                "pipeline_event",
                json!({
                    "type": "pipeline_cancelled",
                    "payload": {
                        "plan_id": &plan.plan_id,
                        "session_id": &plan.session_id,
                        "stage_index": idx,
                    }
                }),
            );
            return Ok(deliverables);
        }

        let storage = crate::storage::get_storage();
        let stage_start_evt = crate::storage::PersistedEvent::new(
            &plan.session_id,
            None,
            crate::storage::EventPayload::PipelineStageStart {
                plan_id: plan.plan_id.clone(),
                stage_index: idx,
                stage_name: stage.name.clone(),
                model: stage.model.model.clone(),
                allowed_tools: stage.allowed_tools.clone(),
            },
        );
        let stage_start_id = stage_start_evt.id.clone();
        let _ = storage.append_event(&plan.workspace_root, &stage_start_evt);

        emit_shared(
            "pipeline_event",
            json!({
                "type": "stage_started",
                "payload": {
                    "plan_id": &plan.plan_id,
                    "session_id": &plan.session_id,
                    "stage_index": idx,
                    "stage_name": &stage.name,
                    "model_name": &stage.model.model,
                    "allowed_tools": &stage.allowed_tools,
                }
            }),
        );

        let stage_prompt = build_stage_prompt(&plan.user_prompt, stage, &deliverables);
        let stream_fn = stream_fn_factory(stage);
        let start_time = Instant::now();

        let emit_for_stage = emit_shared.clone();
        let stage_res = agent::run_agent_loop_scoped(
            &plan.workspace_root,
            &plan.session_id,
            &stage_prompt,
            &stage.model,
            Some(&stage.allowed_tools),
            stage.system_instruction.as_deref(),
            stream_fn,
            Box::new(move |event, payload| emit_for_stage(event, payload)),
        );

        let duration_ms = start_time.elapsed().as_millis() as u64;

        // Check if cancellation occurred during stage execution
        if agent::is_session_cancelled(&plan.session_id) {
            emit_shared(
                "pipeline_event",
                json!({
                    "type": "pipeline_cancelled",
                    "payload": {
                        "plan_id": &plan.plan_id,
                        "session_id": &plan.session_id,
                        "stage_index": idx,
                    }
                }),
            );
            return Ok(deliverables);
        }

        match stage_res {
            Ok(messages) => {
                let output_text = extract_final_assistant_content(&messages);
                let files_modified = extract_modified_files(&messages);
                let tool_calls_count = count_successful_tool_calls(&messages);

                let deliverable = StageDeliverable {
                    stage_index: idx,
                    stage_name: stage.name.clone(),
                    model_name: stage.model.model.clone(),
                    output_text,
                    files_modified,
                    tool_calls_count,
                    success: true,
                    duration_ms,
                };

                let stage_complete_evt = crate::storage::PersistedEvent::new(
                    &plan.session_id,
                    Some(stage_start_id),
                    crate::storage::EventPayload::PipelineStageComplete {
                        plan_id: plan.plan_id.clone(),
                        stage_index: idx,
                        deliverable: deliverable.clone(),
                    },
                );
                let _ = storage.append_event_durable(&plan.workspace_root, &stage_complete_evt);

                emit_shared(
                    "pipeline_event",
                    json!({
                        "type": "stage_completed",
                        "payload": {
                            "plan_id": &plan.plan_id,
                            "session_id": &plan.session_id,
                            "stage_index": idx,
                            "deliverable": &deliverable,
                        }
                    }),
                );

                deliverables.push(deliverable);
            }
            Err(err) => {
                let stage_err_evt = crate::storage::PersistedEvent::new(
                    &plan.session_id,
                    Some(stage_start_id),
                    crate::storage::EventPayload::Error {
                        message: err.clone(),
                        stage_index: Some(idx),
                    },
                );
                let _ = storage.append_event_durable(&plan.workspace_root, &stage_err_evt);

                emit_shared(
                    "pipeline_event",
                    json!({
                        "type": "stage_failed",
                        "payload": {
                            "plan_id": &plan.plan_id,
                            "session_id": &plan.session_id,
                            "stage_index": idx,
                            "error": &err,
                        }
                    }),
                );

                if plan.stop_on_stage_error {
                    emit_shared(
                        "pipeline_event",
                        json!({
                            "type": "pipeline_error",
                            "payload": {
                                "plan_id": &plan.plan_id,
                                "session_id": &plan.session_id,
                                "failed_at_stage": idx,
                                "error": &err,
                            }
                        }),
                    );
                    return Err(format!(
                        "Pipeline halted at stage {} ({}): {}",
                        idx + 1,
                        stage.name,
                        err
                    ));
                } else {
                    deliverables.push(StageDeliverable {
                        stage_index: idx,
                        stage_name: stage.name.clone(),
                        model_name: stage.model.model.clone(),
                        output_text: format!("Error: {}", err),
                        files_modified: vec![],
                        tool_calls_count: 0,
                        success: false,
                        duration_ms,
                    });
                }
            }
        }
    }

    emit_shared(
        "pipeline_event",
        json!({
            "type": "pipeline_completed",
            "payload": {
                "plan_id": &plan.plan_id,
                "session_id": &plan.session_id,
                "stages_completed": deliverables.len(),
            }
        }),
    );

    Ok(deliverables)
}

/// Production entrypoint for executing a pipeline plan using standard streaming providers.
pub fn run_pipeline(
    plan: &PipelinePlan,
    emit_event: EventSink,
) -> Result<Vec<StageDeliverable>, String> {
    run_pipeline_with_stream_factory(
        plan,
        |_stage| {
            Box::new(|cfg, msgs, tools, on_chunk| {
                crate::provider::stream_chat_completion(cfg, msgs, tools, on_chunk)
            })
        },
        emit_event,
    )
}

// ---------------------------------------------------------------------------
// Tauri IPC Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn run_pipeline_turn(
    app: tauri::AppHandle,
    plan: PipelinePlanPayload,
) -> Result<Vec<StageDeliverable>, String> {
    use tauri::Emitter;

    let plan_domain = PipelinePlan::from(plan);
    let session_id = plan_domain.session_id.clone();

    let app_clone = app.clone();
    let emit_event: EventSink = Box::new(move |event, payload| {
        let _ = app_clone.emit(event, payload);
    });

    tauri::async_runtime::spawn_blocking(move || {
        let res = run_pipeline(&plan_domain, emit_event);
        agent::remove_session(&session_id);
        res
    })
    .await
    .map_err(|e| format!("Pipeline execution task failed: {}", e))?
}

// ---------------------------------------------------------------------------
// Unit & Integration Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;
    use crate::provider::{AssembledToolCall, StreamChunk};

    fn make_test_provider_config(name: &str) -> ProviderConfig {
        ProviderConfig {
            base_url: "http://127.0.0.1:11434".to_string(),
            model: name.to_string(),
            temperature: None,
            max_tokens: None,
            timeout_secs: Some(30),
        }
    }

    /// Helper to create a unique temporary workspace directory
    fn create_temp_workspace(prefix: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("unfuse_pipe_test_{}_{}", prefix, std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let _ = fs::create_dir_all(&dir);
        dir
    }

    // 1. allowed tools execute normally
    #[test]
    fn test_allowed_tools_execute_normally() {
        let ws = create_temp_workspace("allowed_exec");
        let test_file = ws.join("sample.txt");
        fs::write(&test_file, "hello from test file").unwrap();

        let session_id = "test-pipe-allowed-tools";
        let config = make_test_provider_config("qwen-test");

        // Mock stream that requests `read_file`
        let stream_fn: StreamFn = Box::new(|_, msgs, _, on_chunk| {
            let has_tool_res = msgs.iter().any(|m| m.role == "tool");
            if !has_tool_res {
                Ok(vec![AssembledToolCall {
                    id: "call-read-1".to_string(),
                    name: "read_file".to_string(),
                    arguments: "{\"path\":\"sample.txt\"}".to_string(),
                }])
            } else {
                on_chunk(StreamChunk::Text("I read the file.".to_string()));
                Ok(vec![])
            }
        });

        let allowed = vec!["read".to_string()];
        let res = agent::run_agent_loop_scoped(
            &ws,
            session_id,
            "read sample.txt",
            &config,
            Some(&allowed),
            None,
            stream_fn,
            Box::new(|_, _| {}),
        );

        assert!(res.is_ok(), "Expected turn to succeed");
        let msgs = res.unwrap();
        let tool_msg = msgs.iter().find(|m| m.role == "tool").expect("Tool response should exist");
        assert!(tool_msg.content.contains("hello from test file"), "Expected read content, got: {}", tool_msg.content);

        let _ = fs::remove_dir_all(&ws);
    }

    // 2. disallowed write_file/edit_file are rejected before modification
    #[test]
    fn test_disallowed_write_edit_rejected_before_modification() {
        let ws = create_temp_workspace("disallowed_write");
        let target_file = ws.join("target.txt");
        fs::write(&target_file, "original content").unwrap();

        let session_id = "test-pipe-disallowed-write";
        let config = make_test_provider_config("qwen-test");

        // Model requests `write_file` and `edit_file`, but stage only allows `["read"]`
        let stream_fn: StreamFn = Box::new(|_, msgs, _, on_chunk| {
            let has_tool_res = msgs.iter().any(|m| m.role == "tool");
            if !has_tool_res {
                Ok(vec![
                    AssembledToolCall {
                        id: "call-write-1".to_string(),
                        name: "write_file".to_string(),
                        arguments: "{\"path\":\"target.txt\",\"content\":\"HACKED\"}".to_string(),
                    },
                    AssembledToolCall {
                        id: "call-edit-1".to_string(),
                        name: "edit_file".to_string(),
                        arguments: "{\"path\":\"target.txt\",\"old_text\":\"original\",\"new_text\":\"MODIFIED\"}".to_string(),
                    },
                ])
            } else {
                on_chunk(StreamChunk::Text("Tools were denied.".to_string()));
                Ok(vec![])
            }
        });

        let allowed = vec!["read".to_string()];
        let res = agent::run_agent_loop_scoped(
            &ws,
            session_id,
            "modify target.txt",
            &config,
            Some(&allowed),
            None,
            stream_fn,
            Box::new(|_, _| {}),
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();

        // Verify tool responses report rejection
        let tool_msgs: Vec<&ChatMessage> = msgs.iter().filter(|m| m.role == "tool").collect();
        assert_eq!(tool_msgs.len(), 2);
        assert!(tool_msgs[0].content.contains("not permitted for this stage"));
        assert!(tool_msgs[1].content.contains("not permitted for this stage"));

        // Verify target file on disk was NOT touched
        let disk_content = fs::read_to_string(&target_file).unwrap();
        assert_eq!(disk_content, "original content", "File on disk must not have been modified!");

        let _ = fs::remove_dir_all(&ws);
    }

    // 3. disallowed bash is rejected before process spawn
    #[test]
    fn test_disallowed_bash_rejected_before_process_spawn() {
        let ws = create_temp_workspace("disallowed_bash");
        let sentinel_file = ws.join("spawned_sentinel.txt");

        let session_id = "test-pipe-disallowed-bash";
        let config = make_test_provider_config("qwen-test");

        // Model requests `bash` command that would create `spawned_sentinel.txt`
        let cmd = format!("touch {}", sentinel_file.display());
        let stream_fn: StreamFn = Box::new(move |_, msgs, _, on_chunk| {
            let has_tool_res = msgs.iter().any(|m| m.role == "tool");
            if !has_tool_res {
                Ok(vec![AssembledToolCall {
                    id: "call-bash-1".to_string(),
                    name: "bash".to_string(),
                    arguments: format!("{{\"command\":\"{}\"}}", cmd),
                }])
            } else {
                on_chunk(StreamChunk::Text("Bash was denied.".to_string()));
                Ok(vec![])
            }
        });

        let allowed = vec!["read".to_string()];
        let res = agent::run_agent_loop_scoped(
            &ws,
            session_id,
            "run touch command",
            &config,
            Some(&allowed),
            None,
            stream_fn,
            Box::new(|_, _| {}),
        );

        assert!(res.is_ok());
        let msgs = res.unwrap();
        let tool_msg = msgs.iter().find(|m| m.role == "tool").unwrap();
        assert!(tool_msg.content.contains("not permitted for this stage"));

        // Verify sentinel file was never created by child process
        assert!(!sentinel_file.exists(), "Disallowed bash command must not have spawned a process!");

        let _ = fs::remove_dir_all(&ws);
    }

    // 4. tool definitions exposed to the model are filtered
    #[test]
    fn test_tool_definitions_exposed_to_model_are_filtered() {
        // Read only
        let read_allowed = vec!["read".to_string()];
        let read_defs = tools::get_filtered_tool_definitions(Some(&read_allowed));
        assert_eq!(read_defs.len(), 1);
        assert_eq!(read_defs[0]["function"]["name"], "read_file");

        // Read and bash
        let read_bash_allowed = vec!["read_file".to_string(), "bash".to_string()];
        let read_bash_defs = tools::get_filtered_tool_definitions(Some(&read_bash_allowed));
        assert_eq!(read_bash_defs.len(), 2);
        let names: Vec<&str> = read_bash_defs.iter().map(|d| d["function"]["name"].as_str().unwrap()).collect();
        assert!(names.contains(&"read_file"));
        assert!(names.contains(&"bash"));
        assert!(!names.contains(&"write_file"));
        assert!(!names.contains(&"edit_file"));

        // Empty allowed list
        let empty: Vec<String> = vec![];
        let empty_defs = tools::get_filtered_tool_definitions(Some(&empty));
        assert_eq!(empty_defs.len(), 0);

        // None -> all definitions
        let all_defs = tools::get_filtered_tool_definitions(None);
        assert_eq!(all_defs.len(), 4);
    }

    // 5. normal non-pipeline agent behavior remains unchanged
    #[test]
    fn test_normal_non_pipeline_agent_behavior_remains_unchanged() {
        let ws = create_temp_workspace("normal_non_pipeline");
        let session_id = "test-pipe-normal-agent";
        let config = make_test_provider_config("qwen-test");

        // Normal run_agent_loop without scoped tools: write_file succeeds
        let stream_fn: StreamFn = Box::new(|_, msgs, tool_defs, on_chunk| {
            // Verify all 4 tool defs are exposed
            assert_eq!(tool_defs.unwrap().len(), 4, "Normal agent must receive all tool definitions");

            let has_tool_res = msgs.iter().any(|m| m.role == "tool");
            if !has_tool_res {
                Ok(vec![AssembledToolCall {
                    id: "call-write-norm".to_string(),
                    name: "write_file".to_string(),
                    arguments: "{\"path\":\"normal.txt\",\"content\":\"normal write works\"}".to_string(),
                }])
            } else {
                on_chunk(StreamChunk::Text("Normal write completed.".to_string()));
                Ok(vec![])
            }
        });

        // Set policy to auto-allow so no interactive prompt pauses test
        let session = agent::get_or_create_session(session_id);
        {
            let mut guard = session.lock().unwrap();
            guard.policy.write_requires_approval = false;
        }

        let res = agent::run_agent_loop(
            &ws,
            session_id,
            "write normal.txt",
            &config,
            stream_fn,
            Box::new(|_, _| {}),
        );

        assert!(res.is_ok());
        let created = ws.join("normal.txt");
        assert!(created.exists(), "Normal non-pipeline write_file must succeed");
        assert_eq!(fs::read_to_string(created).unwrap(), "normal write works");

        let _ = fs::remove_dir_all(&ws);
    }

    // 6. sequential stages execute in the configured order
    #[test]
    fn test_sequential_stages_execute_in_configured_order() {
        let ws = create_temp_workspace("seq_order");
        let plan = PipelinePlan {
            plan_id: "plan-order-1".to_string(),
            session_id: "sess-order-1".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "execute order test".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Stage Alpha".to_string(),
                    model: make_test_provider_config("model-a"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Stage Beta".to_string(),
                    model: make_test_provider_config("model-b"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Stage Gamma".to_string(),
                    model: make_test_provider_config("model-c"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
            ],
            stop_on_stage_error: true,
        };

        let execution_order = Arc::new(std::sync::Mutex::new(Vec::new()));
        let order_clone = execution_order.clone();

        let deliverables = run_pipeline_with_stream_factory(
            &plan,
            move |stage| {
                let stage_name = stage.name.clone();
                let order = order_clone.clone();
                Box::new(move |_, _, _, on_chunk| {
                    order.lock().unwrap().push(stage_name.clone());
                    on_chunk(StreamChunk::Text(format!("Finished {}", stage_name)));
                    Ok(vec![])
                })
            },
            Box::new(|_, _| {}),
        )
        .expect("Pipeline should succeed");

        assert_eq!(deliverables.len(), 3);
        let executed = execution_order.lock().unwrap().clone();
        assert_eq!(executed, vec!["Stage Alpha", "Stage Beta", "Stage Gamma"]);

        assert_eq!(deliverables[0].stage_name, "Stage Alpha");
        assert_eq!(deliverables[1].stage_name, "Stage Beta");
        assert_eq!(deliverables[2].stage_name, "Stage Gamma");

        let _ = fs::remove_dir_all(&ws);
    }

    // 7. stage outputs are handed to subsequent stages
    #[test]
    fn test_stage_outputs_are_handed_to_subsequent_stages() {
        let ws = create_temp_workspace("handoff");
        let plan = PipelinePlan {
            plan_id: "plan-handoff-1".to_string(),
            session_id: "sess-handoff-1".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "Refactor auth logic".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Architect".to_string(),
                    model: make_test_provider_config("r1-architect"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Coder".to_string(),
                    model: make_test_provider_config("qwen-coder"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
            ],
            stop_on_stage_error: true,
        };

        let stage_2_received_prompt = Arc::new(std::sync::Mutex::new(String::new()));
        let s2_prompt_clone = stage_2_received_prompt.clone();

        let deliverables = run_pipeline_with_stream_factory(
            &plan,
            move |stage| {
                let sname = stage.name.clone();
                let s2_dest = s2_prompt_clone.clone();
                Box::new(move |_, msgs, _, on_chunk| {
                    let user_msg = msgs.iter().find(|m| m.role == "user").unwrap();
                    if sname == "Architect" {
                        on_chunk(StreamChunk::Text("ARCHITECTURE_PLAN: Split AuthSession into TokenManager and KeyRotator.".to_string()));
                    } else if sname == "Coder" {
                        *s2_dest.lock().unwrap() = user_msg.content.as_text();
                        on_chunk(StreamChunk::Text("Implemented TokenManager.".to_string()));
                    }
                    Ok(vec![])
                })
            },
            Box::new(|_, _| {}),
        )
        .expect("Pipeline should succeed");

        assert_eq!(deliverables.len(), 2);
        assert_eq!(deliverables[0].output_text, "ARCHITECTURE_PLAN: Split AuthSession into TokenManager and KeyRotator.");

        let received = stage_2_received_prompt.lock().unwrap().clone();
        assert!(received.contains("Refactor auth logic"), "Stage 2 must receive original prompt");
        assert!(
            received.contains("ARCHITECTURE_PLAN: Split AuthSession into TokenManager and KeyRotator."),
            "Stage 2 must receive Stage 1's complete deliverable output! Got: {}",
            received
        );

        let _ = fs::remove_dir_all(&ws);
    }

    // 8. pipeline cancellation stops the active stage and prevents subsequent stages
    #[test]
    fn test_pipeline_cancellation_stops_active_stage_and_prevents_subsequent_stages() {
        let ws = create_temp_workspace("cancellation");
        let session_id = "test-pipe-cancellation-sess";
        let plan = PipelinePlan {
            plan_id: "plan-cancel-1".to_string(),
            session_id: session_id.to_string(),
            workspace_root: ws.clone(),
            user_prompt: "long running pipeline".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Stage 1".to_string(),
                    model: make_test_provider_config("m1"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Stage 2".to_string(),
                    model: make_test_provider_config("m2"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
            ],
            stop_on_stage_error: true,
        };

        let stage_2_executed = Arc::new(AtomicUsize::new(0));
        let s2_counter = stage_2_executed.clone();
        let sess_clone = session_id.to_string();

        let deliverables = run_pipeline_with_stream_factory(
            &plan,
            move |stage| {
                let sname = stage.name.clone();
                let s2 = s2_counter.clone();
                let sess = sess_clone.clone();
                Box::new(move |_, _, _, on_chunk| {
                    if sname == "Stage 1" {
                        // Trigger cancellation during stage 1
                        let _ = agent::cancel_agent_turn(sess.clone());
                        on_chunk(StreamChunk::Text("Stage 1 running...".to_string()));
                        Ok(vec![])
                    } else {
                        s2.fetch_add(1, Ordering::SeqCst);
                        Ok(vec![])
                    }
                })
            },
            Box::new(|_, _| {}),
        )
        .expect("Cancelled pipeline returns ok with partial deliverables");

        // Stage 2 must NEVER have been called
        assert_eq!(stage_2_executed.load(Ordering::SeqCst), 0, "Stage 2 must not be invoked after cancellation!");
        assert!(deliverables.len() <= 1);

        let _ = fs::remove_dir_all(&ws);
    }

    // 9. stage failure respects stop_on_stage_error
    #[test]
    fn test_stage_failure_respects_stop_on_stage_error() {
        let ws = create_temp_workspace("stage_fail");

        // Case A: stop_on_stage_error = true -> halts pipeline and returns Err
        let plan_stop = PipelinePlan {
            plan_id: "plan-fail-stop".to_string(),
            session_id: "sess-fail-stop".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "test stop on error".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Failing Stage".to_string(),
                    model: make_test_provider_config("m-fail"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Subsequent Stage".to_string(),
                    model: make_test_provider_config("m-sub"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
            ],
            stop_on_stage_error: true,
        };

        let sub_executed = Arc::new(AtomicUsize::new(0));
        let sub_counter = sub_executed.clone();

        let res_stop = run_pipeline_with_stream_factory(
            &plan_stop,
            move |stage| {
                let sname = stage.name.clone();
                let sub = sub_counter.clone();
                Box::new(move |_, _, _, _| {
                    if sname == "Failing Stage" {
                        Err("Provider connection dropped".to_string())
                    } else {
                        sub.fetch_add(1, Ordering::SeqCst);
                        Ok(vec![])
                    }
                })
            },
            Box::new(|_, _| {}),
        );

        assert!(res_stop.is_err(), "Pipeline must return Err when stop_on_stage_error is true");
        assert!(res_stop.unwrap_err().contains("Provider connection dropped"));
        assert_eq!(sub_executed.load(Ordering::SeqCst), 0, "Subsequent stage must not run when stage fails!");

        // Case B: stop_on_stage_error = false -> records failure and continues to next stage
        let plan_continue = PipelinePlan {
            plan_id: "plan-fail-cont".to_string(),
            session_id: "sess-fail-cont".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "test continue on error".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Failing Stage".to_string(),
                    model: make_test_provider_config("m-fail"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
                PipelineStage {
                    name: "Subsequent Stage".to_string(),
                    model: make_test_provider_config("m-sub"),
                    allowed_tools: vec![],
                    system_instruction: None,
                },
            ],
            stop_on_stage_error: false,
        };

        let sub_executed_b = Arc::new(AtomicUsize::new(0));
        let sub_counter_b = sub_executed_b.clone();

        let res_cont = run_pipeline_with_stream_factory(
            &plan_continue,
            move |stage| {
                let sname = stage.name.clone();
                let sub = sub_counter_b.clone();
                Box::new(move |_, _, _, on_chunk| {
                    if sname == "Failing Stage" {
                        Err("Provider connection dropped".to_string())
                    } else {
                        sub.fetch_add(1, Ordering::SeqCst);
                        on_chunk(StreamChunk::Text("Subsequent finished.".to_string()));
                        Ok(vec![])
                    }
                })
            },
            Box::new(|_, _| {}),
        );

        assert!(res_cont.is_ok(), "Pipeline should continue when stop_on_stage_error is false");
        let dels = res_cont.unwrap();
        assert_eq!(dels.len(), 2);
        assert!(!dels[0].success);
        assert!(dels[1].success);
        assert_eq!(sub_executed_b.load(Ordering::SeqCst), 1, "Subsequent stage must run when stop_on_stage_error is false");

        let _ = fs::remove_dir_all(&ws);
    }

    // 10. rejected write/edit calls produce an empty files_modified list
    #[test]
    fn test_rejected_write_edit_calls_produce_empty_files_modified() {
        let ws = create_temp_workspace("rej_files_mod");
        let plan = PipelinePlan {
            plan_id: "plan-rej-files".to_string(),
            session_id: "sess-rej-files".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "write something illegal".to_string(),
            stages: vec![PipelineStage {
                name: "Auditor".to_string(),
                model: make_test_provider_config("auditor-model"),
                allowed_tools: vec!["read".to_string()], // Read-only!
                system_instruction: None,
            }],
            stop_on_stage_error: true,
        };

        let deliverables = run_pipeline_with_stream_factory(
            &plan,
            |_stage| {
                Box::new(|_, msgs, _, on_chunk| {
                    let has_tool_res = msgs.iter().any(|m| m.role == "tool");
                    if !has_tool_res {
                        Ok(vec![
                            AssembledToolCall {
                                id: "call-write-denied".to_string(),
                                name: "write_file".to_string(),
                                arguments: "{\"path\":\"forbidden.txt\",\"content\":\"nope\"}".to_string(),
                            },
                            AssembledToolCall {
                                id: "call-edit-denied".to_string(),
                                name: "edit_file".to_string(),
                                arguments: "{\"path\":\"also_forbidden.txt\",\"old_text\":\"a\",\"new_text\":\"b\"}".to_string(),
                            },
                        ])
                    } else {
                        on_chunk(StreamChunk::Text("Write calls were denied.".to_string()));
                        Ok(vec![])
                    }
                })
            },
            Box::new(|_, _| {}),
        )
        .expect("Pipeline should complete");

        assert_eq!(deliverables.len(), 1);
        let deliverable = &deliverables[0];
        assert!(
            deliverable.files_modified.is_empty(),
            "Rejected write/edit calls must produce an empty files_modified list! Got: {:?}",
            deliverable.files_modified
        );

        let _ = fs::remove_dir_all(&ws);
    }

    // 11. tool_calls_count only counts successfully executed tool calls
    #[test]
    fn test_tool_calls_count_only_counts_successful() {
        let ws = create_temp_workspace("count_success");
        let sample = ws.join("sample.txt");
        fs::write(&sample, "readable content").unwrap();

        let plan = PipelinePlan {
            plan_id: "plan-tool-count".to_string(),
            session_id: "sess-tool-count".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "read and write".to_string(),
            stages: vec![PipelineStage {
                name: "Reader".to_string(),
                model: make_test_provider_config("reader-model"),
                allowed_tools: vec!["read".to_string()], // only read is allowed
                system_instruction: None,
            }],
            stop_on_stage_error: true,
        };

        let deliverables = run_pipeline_with_stream_factory(
            &plan,
            |_stage| {
                Box::new(|_, msgs, _, on_chunk| {
                    let has_tool_res = msgs.iter().any(|m| m.role == "tool");
                    if !has_tool_res {
                        // 1 permitted read, 1 disallowed write, 1 disallowed bash
                        Ok(vec![
                            AssembledToolCall {
                                id: "call-ok-read".to_string(),
                                name: "read_file".to_string(),
                                arguments: "{\"path\":\"sample.txt\"}".to_string(),
                            },
                            AssembledToolCall {
                                id: "call-bad-write".to_string(),
                                name: "write_file".to_string(),
                                arguments: "{\"path\":\"bad.txt\",\"content\":\"bad\"}".to_string(),
                            },
                            AssembledToolCall {
                                id: "call-bad-bash".to_string(),
                                name: "bash".to_string(),
                                arguments: "{\"command\":\"ls\"}".to_string(),
                            },
                        ])
                    } else {
                        on_chunk(StreamChunk::Text("Finished reading.".to_string()));
                        Ok(vec![])
                    }
                })
            },
            Box::new(|_, _| {}),
        )
        .expect("Pipeline should complete");

        assert_eq!(deliverables.len(), 1);
        assert_eq!(
            deliverables[0].tool_calls_count, 1,
            "tool_calls_count must only count the 1 successfully executed tool call, not rejected attempts!"
        );

        let _ = fs::remove_dir_all(&ws);
    }

    // 12. validate_pipeline_plan rejects empty stages, empty model names, and unknown tools
    #[test]
    fn test_validate_pipeline_plan() {
        let ws = PathBuf::from("/tmp");

        // Empty stages array rejected
        let empty_plan = PipelinePlan {
            plan_id: "p1".to_string(),
            session_id: "s1".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "prompt".to_string(),
            stages: vec![],
            stop_on_stage_error: true,
        };
        let err1 = validate_pipeline_plan(&empty_plan);
        assert!(err1.is_err());
        assert!(err1.unwrap_err().contains("stages array cannot be empty"));

        // Empty model name rejected
        let empty_model_plan = PipelinePlan {
            plan_id: "p2".to_string(),
            session_id: "s2".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "prompt".to_string(),
            stages: vec![PipelineStage {
                name: "Stage 1".to_string(),
                model: make_test_provider_config(""),
                allowed_tools: vec![],
                system_instruction: None,
            }],
            stop_on_stage_error: true,
        };
        let err2 = validate_pipeline_plan(&empty_model_plan);
        assert!(err2.is_err());
        assert!(err2.unwrap_err().contains("empty model name"));

        // Unrecognized tool name rejected
        let unknown_tool_plan = PipelinePlan {
            plan_id: "p3".to_string(),
            session_id: "s3".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "prompt".to_string(),
            stages: vec![PipelineStage {
                name: "Stage 1".to_string(),
                model: make_test_provider_config("valid-model"),
                allowed_tools: vec!["read".to_string(), "super_power_fly".to_string()],
                system_instruction: None,
            }],
            stop_on_stage_error: true,
        };
        let err3 = validate_pipeline_plan(&unknown_tool_plan);
        assert!(err3.is_err());
        assert!(err3.unwrap_err().contains("unrecognized tool 'super_power_fly'"));

        // Valid plan accepted
        let valid_plan = PipelinePlan {
            plan_id: "p4".to_string(),
            session_id: "s4".to_string(),
            workspace_root: ws.clone(),
            user_prompt: "prompt".to_string(),
            stages: vec![PipelineStage {
                name: "Stage 1".to_string(),
                model: make_test_provider_config("valid-model"),
                allowed_tools: vec!["read_file".to_string(), "bash".to_string()],
                system_instruction: None,
            }],
            stop_on_stage_error: true,
        };
        assert!(validate_pipeline_plan(&valid_plan).is_ok());
    }
}
