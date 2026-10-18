use super::*;
use crate::provider::{CompletionResponse, StreamChunk};
use std::sync::atomic::{AtomicUsize, Ordering};

struct Fixture {
    root: PathBuf,
    session: String,
    configs: HashMap<String, ProviderConfig>,
}
impl Fixture {
    fn new() -> Self {
        let session = crate::storage::event::generate_event_id();
        let root = std::env::temp_dir().join(format!("unfuse-pipeline-{session}"));
        std::fs::create_dir_all(&root).unwrap();
        let config = ProviderConfig {
            provider: crate::provider::Runner::Ollama,
            capabilities: crate::provider::ModelCapabilities::runtime(
                crate::provider::CapabilityStatus::Unknown,
            ),
            base_url: "http://localhost:11434".into(),
            api_key: None,
            model: "qwen.3:4b".into(),
            temperature: Some(0.3),
            max_tokens: Some(1024),
            timeout_secs: None,
            context_window: Some(64000),
        };
        Self {
            root,
            session,
            configs: HashMap::from([
                ("rack-a".into(), config.clone()),
                (
                    "rack-b".into(),
                    ProviderConfig {
                        model: "gemma.3:4b".into(),
                        provider: crate::provider::Runner::Lmstudio,
                        base_url: "http://localhost:1234".into(),
                        ..config
                    },
                ),
            ]),
        }
    }
    fn state(&self, models: &[&str]) -> PipelineState {
        PipelineState{plan:PipelinePlan{id:crate::storage::event::generate_event_id(),request:"Fix login. Do not change the database schema. Email dev@example.com is ordinary task text.".into(),stages:models.iter().enumerate().map(|(i,id)|PipelineStage{id:format!("step-{i}"),model_id:(*id).into(),instruction:format!("Task {i}: check the evidence and do your assigned work"),allowed_tools:None}).collect()},status:PipelineStatus::Running,next_stage:0,active_stage:None,results:vec![],fingerprints:self.configs.iter().map(|(id,c)|(id.clone(),agent::lifecycle::fingerprint(c))).collect(),error:None}
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        agent::remove_session(&self.session);
        let _ = std::fs::remove_dir_all(&self.root);
    }
}
fn sink() -> EventSink {
    Arc::new(|_, _| {})
}
fn answer(text: &str) -> Vec<ChatMessage> {
    vec![ChatMessage::assistant_text(text)]
}

#[test]
fn explicit_stages_keep_order_repeated_models_and_original_constraints() {
    let f = Fixture::new();
    let state = f.state(&["rack-a", "rack-b", "rack-a"]);
    let plan = state.plan.clone();
    let mut calls = vec![];
    let mut runner = |spec: &PipelineStage,
                      _: &ProviderConfig,
                      prompt: &str,
                      _: Option<RunCheckpoint>,
                      stage: StageExecution,
                      _: EventSink| {
        assert!(prompt.contains("Do not change the database schema"));
        assert!(prompt.contains("dev@example.com"));
        if stage.stage_index > 0 {
            assert!(prompt.contains(&format!("result-{}", stage.stage_index - 1)));
        }
        calls.push(spec.model_id.clone());
        Ok(answer(&format!("result-{}", stage.stage_index)))
    };
    let completed = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(calls, vec!["rack-a", "rack-b", "rack-a"]);
    assert_eq!(completed.status, PipelineStatus::Completed);
    assert_eq!(completed.results.len(), 3);
    assert_ne!(
        completed.results[0].record_id,
        completed.results[2].record_id
    );
    agent::remove_session(&f.session);
    let loaded = load_pipelines(f.root.to_string_lossy().into(), f.session.clone()).unwrap();
    assert_eq!(loaded[0].plan, plan);
    assert_eq!(loaded[0].results, completed.results);
}

#[test]
fn real_agent_stages_have_isolated_context_attributed_events_and_retrievable_evidence() {
    let f = Fixture::new();
    std::fs::write(f.root.join("login.txt"), "cookie evidence").unwrap();
    let state = f.state(&["rack-a", "rack-b"]);
    let emissions = Arc::new(Mutex::new(Vec::new()));
    let captured = emissions.clone();
    let sink: EventSink = Arc::new(move |_, event| captured.lock().unwrap().push(event));
    let mut runner = |spec: &PipelineStage,
                      config: &ProviderConfig,
                      prompt: &str,
                      checkpoint: Option<RunCheckpoint>,
                      stage: StageExecution,
                      sink: EventSink| {
        let index = stage.stage_index;
        let rounds = Arc::new(AtomicUsize::new(0));
        let round = rounds.clone();
        let stream: agent::StreamFn = Box::new(move |_, messages, tools, emit| {
            if round.fetch_add(1, Ordering::SeqCst) == 0 {
                assert_eq!(
                    messages.len(),
                    2,
                    "A new stage must not receive the complete prior transcript"
                );
                assert!(tools
                    .unwrap()
                    .iter()
                    .any(|t| t["function"]["name"] == "read_pipeline_record"));
                if index == 0 {
                    return Ok(CompletionResponse::from_calls(vec![
                        crate::provider::AssembledToolCall {
                            id: "read-evidence".into(),
                            name: "read_file".into(),
                            arguments: json!({"path":"login.txt"}).to_string(),
                        },
                    ]));
                }
            }
            emit(StreamChunk::Text(format!(
                "Stage {index} findings. Evidence checked."
            )));
            Ok(CompletionResponse::from_calls(vec![]))
        });
        if index == 1 {
            let recorded = events(&f.root, &f.session).unwrap();
            let evidence = recorded
                .iter()
                .find(
                    |e| matches!(&e.payload,EventPayload::ToolResult{tool,..} if tool=="read_file"),
                )
                .unwrap();
            let output =
                read_record(&f.root, &f.session, &json!({"event_id":evidence.id})).unwrap();
            assert!(output.contains("cookie evidence"));
        }
        agent::execute_run(
            &f.root,
            &f.session,
            prompt,
            None,
            config,
            spec.allowed_tools.as_deref(),
            None,
            stream,
            sink,
            checkpoint,
            Some(stage),
        )
    };
    let completed = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink,
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(completed.status, PipelineStatus::Completed);
    assert_eq!(completed.results[0].evidence.len(), 1);
    let emitted = emissions.lock().unwrap();
    let deltas: Vec<_> = emitted
        .iter()
        .filter(|e| e["type"] == "content_delta")
        .collect();
    assert_eq!(deltas.len(), 2);
    assert_eq!(deltas[0]["payload"]["stage_index"], 0);
    assert_eq!(deltas[1]["payload"]["stage_index"], 1);
    let recorded = events(&f.root, &f.session).unwrap();
    assert!(recorded.iter().any(|e| matches!(
        &e.payload,
        EventPayload::ToolResult {
            stage_index: Some(0),
            ..
        }
    )));
}

#[test]
fn cancellation_between_stages_and_failure_do_not_start_following_models() {
    for cancel in [true, false] {
        let f = Fixture::new();
        let state = f.state(&["rack-a", "rack-b"]);
        let mut calls = 0;
        let mut runner = |_: &PipelineStage,
                          _: &ProviderConfig,
                          _: &str,
                          _: Option<RunCheckpoint>,
                          _: StageExecution,
                          _: EventSink| {
            calls += 1;
            if cancel {
                agent::get_or_create_session(&f.session)
                    .lock()
                    .unwrap()
                    .cancelled
                    .store(true, Ordering::SeqCst);
                Ok(answer("partial"))
            } else {
                Err("provider failed".into())
            }
        };
        let result = execute(
            &f.root,
            &f.session,
            state,
            &f.configs,
            vec![],
            sink(),
            &mut runner,
            None,
        )
        .unwrap();
        assert_eq!(calls, 1);
        assert_eq!(
            result.status,
            if cancel {
                PipelineStatus::Cancelled
            } else {
                PipelineStatus::Failed
            }
        );
        assert!(result.results.is_empty());
        assert!(agent::get_or_create_session(&f.session)
            .lock()
            .unwrap()
            .pipeline_owner
            .is_none());
    }
}

#[test]
fn pipeline_ownership_rejects_competing_runs_without_resetting_cancellation() {
    let f = Fixture::new();
    let lease = PipelineLease::acquire(&f.session, "owner").unwrap();
    let session = agent::get_or_create_session(&f.session);
    session
        .lock()
        .unwrap()
        .cancelled
        .store(true, Ordering::SeqCst);
    assert!(PipelineLease::acquire(&f.session, "other").is_err());
    assert!(agent::is_session_cancelled(&f.session));
    agent::remove_session(&f.session);
    assert_eq!(
        agent::get_or_create_session(&f.session)
            .lock()
            .unwrap()
            .pipeline_owner
            .as_deref(),
        Some("owner")
    );
    drop(lease);
}

#[test]
fn committed_stage_result_recovers_without_replaying_after_snapshot_interruption() {
    let f = Fixture::new();
    crate::storage::get_storage()
        .unwrap()
        .create_session(&f.root, &f.session, None)
        .unwrap();
    let state = f.state(&["rack-a", "rack-b"]);
    save(&f.root, &f.session, &state, &sink()).unwrap();
    let result = StageResult {
        stage_id: state.plan.stages[0].id.clone(),
        stage_index: 0,
        model_id: "rack-a".into(),
        model: "qwen".into(),
        output: "first stage already completed".into(),
        record_id: "committed-result".into(),
        evidence: vec![],
    };
    let committed = PersistedEvent {
        id: result.record_id.clone(),
        parent_id: crate::storage::get_storage()
            .unwrap()
            .active_leaf(&f.root, &f.session)
            .unwrap(),
        session_id: f.session.clone(),
        timestamp: crate::storage::now_epoch_ms(),
        payload: EventPayload::PipelineStageComplete {
            plan_id: state.plan.id.clone(),
            stage_index: 0,
            deliverable: json!(result),
        },
    };
    crate::storage::get_storage()
        .unwrap()
        .append_event_durable(&f.root, &committed)
        .unwrap();
    let recovered = states_from_events(&events(&f.root, &f.session).unwrap())
        .unwrap()
        .remove(0);
    assert_eq!(recovered.next_stage, 1);
    let mut called = vec![];
    let mut runner = |spec: &PipelineStage,
                      _: &ProviderConfig,
                      prompt: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink| {
        called.push(spec.id.clone());
        assert!(prompt.contains("first stage already completed"));
        Ok(answer("done"))
    };
    let result = execute(
        &f.root,
        &f.session,
        recovered,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(called, vec!["step-1"]);
    assert_eq!(result.results.len(), 2);
}

#[test]
fn interrupted_inflight_actions_are_not_replayed_without_a_safe_checkpoint() {
    let f = Fixture::new();
    let mut state = f.state(&["rack-a"]);
    state.active_stage = Some(StageExecution {
        plan_id: state.plan.id.clone(),
        stage_id: "step-0".into(),
        stage_index: 0,
        model_id: "rack-a".into(),
        run_id: "unknown-run".into(),
    });
    crate::storage::get_storage()
        .unwrap()
        .create_session(&f.root, &f.session, None)
        .unwrap();
    save(&f.root, &f.session, &state, &sink()).unwrap();
    let mut invoked = false;
    let mut runner = |_: &PipelineStage,
                      _: &ProviderConfig,
                      _: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink| {
        invoked = true;
        Ok(answer("must not run"))
    };
    let error = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap_err();
    assert!(error.contains("no safe checkpoint"));
    assert!(!invoked);
}

#[test]
fn denied_tool_approval_stops_the_entire_chain() {
    let f = Fixture::new();
    let state = f.state(&["rack-a", "rack-b"]);
    let session = f.session.clone();
    let gate: EventSink = Arc::new(move |_, event| {
        if event["type"] == "tool_call_pending" {
            let call = event["payload"]["id"].as_str().unwrap();
            agent::resolve_tool_permission(
                Some(session.clone()),
                call.into(),
                "reject".into(),
                None,
                None,
                Some("no".into()),
            )
            .unwrap();
        }
    });
    let mut calls = 0;
    let mut runner = |spec: &PipelineStage,
                      config: &ProviderConfig,
                      prompt: &str,
                      checkpoint: Option<RunCheckpoint>,
                      stage: StageExecution,
                      sink: EventSink| {
        calls += 1;
        let stream: agent::StreamFn = Box::new(|_, _, _, _| {
            Ok(CompletionResponse::from_calls(vec![
                crate::provider::AssembledToolCall {
                    id: "write-action".into(),
                    name: "bash".into(),
                    arguments: json!({"command":"touch forbidden.txt"}).to_string(),
                },
            ]))
        });
        agent::execute_run(
            &f.root,
            &f.session,
            prompt,
            None,
            config,
            spec.allowed_tools.as_deref(),
            None,
            stream,
            sink,
            checkpoint,
            Some(stage),
        )
    };
    let result = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        gate,
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(result.status, PipelineStatus::Failed);
    assert_eq!(calls, 1);
    assert!(!f.root.join("forbidden.txt").exists());
}

#[test]
fn essential_context_overflow_stops_before_inference_and_empty_answers_are_not_success() {
    let mut f = Fixture::new();
    f.configs.get_mut("rack-a").unwrap().context_window = Some(1200);
    let mut state = f.state(&["rack-a"]);
    state.plan.request = "mandatory constraint ".repeat(1000);
    let count = Arc::new(AtomicUsize::new(0));
    let n = count.clone();
    let mut runner = |spec: &PipelineStage,
                      config: &ProviderConfig,
                      prompt: &str,
                      checkpoint: Option<RunCheckpoint>,
                      stage: StageExecution,
                      sink: EventSink| {
        let n = n.clone();
        let stream: agent::StreamFn = Box::new(move |_, _, _, _| {
            n.fetch_add(1, Ordering::SeqCst);
            Ok(CompletionResponse::from_calls(vec![]))
        });
        agent::execute_run(
            &f.root,
            &f.session,
            prompt,
            None,
            config,
            spec.allowed_tools.as_deref(),
            None,
            stream,
            sink,
            checkpoint,
            Some(stage),
        )
    };
    let result = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(result.status, PipelineStatus::Failed);
    assert_eq!(count.load(Ordering::SeqCst), 0);
    assert!(result.error.unwrap().contains("context budget"));
    let f = Fixture::new();
    let mut runner = |_: &PipelineStage,
                      _: &ProviderConfig,
                      _: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink| Ok(answer(""));
    let result = execute(
        &f.root,
        &f.session,
        f.state(&["rack-a"]),
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(result.status, PipelineStatus::Failed);
}

#[test]
fn cancellation_after_committed_first_stage_preserves_it_and_never_starts_second() {
    let f = Fixture::new();
    let state = f.state(&["rack-a", "rack-b"]);
    let id = f.session.clone();
    let mut calls = 0;
    let sink: EventSink = Arc::new(move |_, event| {
        if event["type"] == "pipeline_state"
            && event["payload"]["state"]["results"]
                .as_array()
                .is_some_and(|results| results.len() == 1)
        {
            agent::get_or_create_session(&id)
                .lock()
                .unwrap()
                .cancelled
                .store(true, Ordering::SeqCst);
        }
    });
    let mut runner = |_: &PipelineStage,
                      _: &ProviderConfig,
                      _: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink| {
        calls += 1;
        Ok(answer("first stage finished"))
    };
    let result = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink,
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(calls, 1);
    assert_eq!(result.status, PipelineStatus::Cancelled);
    assert_eq!(result.results.len(), 1);
}

#[test]
fn safe_paused_stage_resumes_with_same_run_identity_without_repeating_prior_stages() {
    let f = Fixture::new();
    let mut state = f.state(&["rack-a", "rack-b"]);
    let config = &f.configs["rack-b"];
    state.next_stage = 1;
    state.results.push(StageResult {
        stage_id: "step-0".into(),
        stage_index: 0,
        model_id: "rack-a".into(),
        model: "qwen".into(),
        output: "already completed".into(),
        record_id: "completed".into(),
        evidence: vec![],
    });
    let stage = StageExecution {
        plan_id: state.plan.id.clone(),
        stage_id: "step-1".into(),
        stage_index: 1,
        model_id: "rack-b".into(),
        run_id: "paused-run".into(),
    };
    state.active_stage = Some(stage.clone());
    let checkpoint = RunCheckpoint {
        run_id: stage.run_id.clone(),
        reason: agent::lifecycle::PauseReason::StageBudget,
        provider_fingerprint: agent::lifecycle::fingerprint(config),
        messages: vec![
            ChatMessage::system("project rules"),
            ChatMessage::user_text("review the evidence"),
        ],
        tools: None,
        pending_tools: vec![],
        stage_iterations: 40,
        pipeline_remaining: Some(80),
        recent_calls: vec![],
        allowed_tools: None,
    };
    crate::storage::get_storage()
        .unwrap()
        .create_session(&f.root, &f.session, None)
        .unwrap();
    save(&f.root, &f.session, &state, &sink()).unwrap();
    append(
        &f.root,
        &f.session,
        EventPayload::RunCheckpoint {
            checkpoint: Box::new(checkpoint),
        },
    )
    .unwrap();
    agent::remove_session(&f.session);
    let mut calls = 0;
    let mut runner = |spec: &PipelineStage,
                      config: &ProviderConfig,
                      prompt: &str,
                      checkpoint: Option<RunCheckpoint>,
                      execution: StageExecution,
                      sink: EventSink| {
        calls += 1;
        assert_eq!(spec.id, "step-1");
        assert_eq!(execution.run_id, "paused-run");
        assert!(checkpoint.is_some());
        let stream: agent::StreamFn = Box::new(|_, messages, _, emit| {
            assert_eq!(messages[1].content.as_text(), "review the evidence");
            emit(StreamChunk::Text("review complete".into()));
            Ok(CompletionResponse::from_calls(vec![]))
        });
        agent::execute_run(
            &f.root,
            &f.session,
            prompt,
            None,
            config,
            None,
            None,
            stream,
            sink,
            checkpoint,
            Some(execution),
        )
    };
    let result = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None,
    )
    .unwrap();
    assert_eq!(calls, 1);
    assert_eq!(result.status, PipelineStatus::Completed);
    assert_eq!(result.results.len(), 2);
}

#[test]
fn retrieval_is_bounded_scoped_and_never_exposes_another_pipeline() {
    let f = Fixture::new();
    let state = f.state(&["rack-a"]);
    crate::storage::get_storage()
        .unwrap()
        .create_session(&f.root, &f.session, None)
        .unwrap();
    let foreign = append(
        &f.root,
        &f.session,
        EventPayload::AssistantTurn {
            content: "different conversation evidence".into(),
            model: "other".into(),
        },
    )
    .unwrap();
    save(&f.root, &f.session, &state, &sink()).unwrap();
    let evidence = append(
        &f.root,
        &f.session,
        EventPayload::ToolResult {
            call_id: "read".into(),
            tool: "read_file".into(),
            is_error: false,
            output: "αβγ".repeat(5000),
            stage_index: Some(0),
        },
    )
    .unwrap();
    let _lease = PipelineLease::acquire(&f.session, &state.plan.id).unwrap();
    agent::get_or_create_session(&f.session)
        .lock()
        .unwrap()
        .active_stage = Some(StageExecution {
        plan_id: state.plan.id,
        stage_id: "step-0".into(),
        stage_index: 0,
        model_id: "rack-a".into(),
        run_id: "run".into(),
    });
    let output = read_record(
        &f.root,
        &f.session,
        &json!({"event_id":evidence,"limit":30}),
    )
    .unwrap();
    assert!(output.contains("Continue with offset="));
    assert!(output.len() < 500);
    assert!(read_record(&f.root, &f.session, &json!({"event_id":foreign})).is_err());
    assert!(read_record(
        &f.root,
        &f.session,
        &json!({"event_id":evidence,"offset":u64::MAX})
    )
    .is_err());
    assert!(read_record(&f.root, &f.session, &json!({"event_id":evidence,"limit":0})).is_err());
}

#[test]
fn cancelled_preflight_lease_is_not_reset_when_execution_begins() {
    let f = Fixture::new();
    let state = f.state(&["rack-a", "rack-b"]);
    let lease = PipelineLease::acquire(&f.session, &state.plan.id).unwrap();
    agent::get_or_create_session(&f.session)
        .lock()
        .unwrap()
        .cancelled
        .store(true, Ordering::SeqCst);
    let mut runner = |_: &PipelineStage,
                      _: &ProviderConfig,
                      _: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink|
     -> Result<Vec<ChatMessage>, String> {
        panic!("Cancellation during provider preparation must prevent inference");
    };
    let stopped = execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        Some(lease),
    )
    .unwrap();
    assert_eq!(stopped.status, PipelineStatus::Cancelled);
    assert!(stopped.results.is_empty());
}

#[test]
fn invalid_saved_stage_and_changed_saved_state_never_invoke_a_model() {
    let f = Fixture::new();
    let mut state = f.state(&["rack-a"]);
    state.active_stage = Some(StageExecution {
        plan_id: state.plan.id.clone(),
        stage_id: "wrong-stage".into(),
        stage_index: 0,
        model_id: "missing-connection".into(),
        run_id: "untrusted-run".into(),
    });
    let mut runner = |_: &PipelineStage,
                      _: &ProviderConfig,
                      _: &str,
                      _: Option<RunCheckpoint>,
                      _: StageExecution,
                      _: EventSink|
     -> Result<Vec<ChatMessage>, String> {
        panic!("Invalid recovery must stop before inference")
    };
    assert!(execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None
    )
    .unwrap_err()
    .contains("Saved active stage"));
    let state = f.state(&["rack-a"]);
    let mut saved = state.clone();
    saved.status = PipelineStatus::Failed;
    save(&f.root, &f.session, &saved, &sink()).unwrap();
    assert!(execute(
        &f.root,
        &f.session,
        state,
        &f.configs,
        vec![],
        sink(),
        &mut runner,
        None
    )
    .unwrap_err()
    .contains("Saved pipeline changed"));
}

#[test]
fn rack_limit_counts_connections_without_restricting_repeated_stages() {
    let mut f = Fixture::new();
    let providers = [
        crate::provider::Runner::Ollama,
        crate::provider::Runner::Lmstudio,
        crate::provider::Runner::Llamacpp,
        crate::provider::Runner::Vllm,
        crate::provider::Runner::Mlx,
        crate::provider::Runner::Unsloth,
    ];
    for n in 0..7 {
        f.configs.insert(
            format!("rack-{n}"),
            ProviderConfig {
                provider: providers[n % 6],
                ..f.configs["rack-a"].clone()
            },
        );
    }
    let mut state = f.state(&["rack-a"]);
    state.plan.stages = (0..7)
        .map(|n| PipelineStage {
            id: format!("stage-{n}"),
            model_id: format!("rack-{n}"),
            instruction: "Check the evidence".into(),
            allowed_tools: None,
        })
        .collect();
    assert!(validate(&state.plan, &f.configs)
        .unwrap_err()
        .contains("six"));
    state.plan.stages.pop();
    assert!(validate(&state.plan, &f.configs).is_ok());
    state.plan.stages[1].id = state.plan.stages[0].id.clone();
    assert!(validate(&state.plan, &f.configs)
        .unwrap_err()
        .contains("unique ID"));
}

#[test]
fn different_models_or_endpoints_cannot_bypass_one_model_per_provider() {
    let mut f = Fixture::new();
    let state = f.state(&["rack-a", "rack-b"]);
    let second = f.configs.get_mut("rack-b").unwrap();
    second.provider = crate::provider::Runner::Ollama;
    second.base_url = "http://localhost:22434".into();
    assert!(validate(&state.plan, &f.configs)
        .unwrap_err()
        .contains("one model per provider"));
    let repeated = f.state(&["rack-a", "rack-a"]);
    assert!(validate(&repeated.plan, &f.configs).is_ok());
}
