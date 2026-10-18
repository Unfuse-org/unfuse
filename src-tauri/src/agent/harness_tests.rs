use super::*;
use crate::storage::{EventPayload, PersistedEvent};
use std::fs;

struct Fixture {
    root: PathBuf,
    id: String,
}
impl Fixture {
    fn new() -> Self {
        let id = crate::storage::event::generate_event_id();
        let root = std::env::temp_dir().join(format!("unfuse-harness-{id}"));
        fs::create_dir_all(&root).unwrap();
        Self { root, id }
    }
    fn config(&self) -> ProviderConfig {
        ProviderConfig {
            provider: provider::Runner::Ollama,
            capabilities: provider::ModelCapabilities::runtime(provider::CapabilityStatus::Unknown),
            base_url: "http://localhost:11434".into(),
            api_key: Some("test-only-credential".into()),
            model: "test-model".into(),
            temperature: None,
            max_tokens: Some(2048),
            timeout_secs: None,
            context_window: Some(131072),
        }
    }
    fn append(&self, payload: EventPayload) {
        let storage = crate::storage::get_storage().unwrap();
        let leaf = storage
            .reconstruct_active_context(&self.root, &self.id, None)
            .unwrap()
            .active_leaf_id;
        storage
            .append_event_durable(&self.root, &PersistedEvent::new(&self.id, leaf, payload))
            .unwrap();
    }
}
impl Drop for Fixture {
    fn drop(&mut self) {
        remove_session(&self.id);
        let _ = fs::remove_dir_all(&self.root);
    }
}

#[test]
fn saved_checkpoint_resumes_after_registry_loss_without_replaying_completed_tools() {
    let fixture = Fixture::new();
    let storage = crate::storage::get_storage().unwrap();
    storage
        .create_session(&fixture.root, &fixture.id, None)
        .unwrap();
    fs::write(fixture.root.join("file.txt"), "already written").unwrap();
    let pending = AssembledToolCall {
        id: "read".into(),
        name: "read_file".into(),
        arguments: json!({"path":"file.txt"}).to_string(),
    };
    let batch = ChatMessage {
        role: "assistant".into(),
        content: "Writing, then checking".into(),
        tool_call_id: None,
        tool_calls: Some(vec![
            json!({"id":"write","type":"function","function":{"name":"write_file","arguments":"{}"}}),
            json!({"id":"read","type":"function","function":{"name":"read_file","arguments":pending.arguments}}),
        ]),
    };
    let completed = ChatMessage {
        role: "tool".into(),
        content: "already committed".into(),
        tool_calls: None,
        tool_call_id: Some("write".into()),
    };
    let checkpoint = RunCheckpoint {
        run_id: "resume-test".into(),
        reason: PauseReason::RepeatedToolCall,
        provider_fingerprint: lifecycle::fingerprint(&fixture.config()),
        messages: vec![
            ChatMessage::system("instructions"),
            ChatMessage::user_text("write then check"),
            batch.clone(),
            completed,
        ],
        tools: Some(tools::get_tool_definitions()),
        pending_tools: vec![pending],
        stage_iterations: 1,
        pipeline_remaining: Some(119),
        recent_calls: Vec::new(),
        allowed_tools: None,
    };
    fixture.append(EventPayload::UserTurn {
        prompt: "write then check".into(),
        attached_files: vec![],
    });
    fixture.append(EventPayload::AssistantMessage {
        message: batch,
        model: "test-model".into(),
    });
    fixture.append(EventPayload::ToolResult {
        call_id: "write".into(),
        tool: "write_file".into(),
        is_error: false,
        output: "already committed".into(),
        stage_index: None,
    });
    fixture.append(EventPayload::RunCheckpoint {
        checkpoint: Box::new(checkpoint),
    });
    remove_session(&fixture.id);
    let paused = crate::storage::load_session(
        fixture.root.to_string_lossy().into_owned(),
        fixture.id.clone(),
        None,
    )
    .unwrap();
    assert!(!paused.is_interrupted);
    assert_eq!(
        paused.paused_run.unwrap().reason,
        PauseReason::RepeatedToolCall
    );
    let checkpoint =
        lifecycle::load_checkpoint(&fixture.root, &fixture.id, &fixture.config()).unwrap();
    assert!(!serde_json::to_string(&checkpoint)
        .unwrap()
        .contains("test-only-credential"));
    let mut wrong = fixture.config();
    wrong.model = "other-model".into();
    assert!(lifecycle::load_checkpoint(&fixture.root, &fixture.id, &wrong).is_err());
    let stream: StreamFn = Box::new(|_, messages, _, emit| {
        context::validate_pairs(messages).unwrap();
        assert_eq!(messages.iter().filter(|m| m.role == "user").count(), 1);
        assert_eq!(
            messages.last().unwrap().tool_call_id.as_deref(),
            Some("read")
        );
        assert!(messages
            .last()
            .unwrap()
            .content
            .as_text()
            .contains("already written"));
        emit(StreamChunk::Text("checked".into()));
        Ok(CompletionResponse::from_calls(vec![]))
    });
    execute_run(
        &fixture.root,
        &fixture.id,
        "ignored",
        None,
        &fixture.config(),
        None,
        None,
        stream,
        Arc::new(|_, _| {}),
        Some(checkpoint),
        None,
    )
    .unwrap();
    assert_eq!(
        fs::read_to_string(fixture.root.join("file.txt")).unwrap(),
        "already written"
    );
    assert!(lifecycle::load_checkpoint(&fixture.root, &fixture.id, &fixture.config()).is_err());
    let context = storage
        .reconstruct_active_context(&fixture.root, &fixture.id, None)
        .unwrap();
    context::validate_pairs(&context.chat_messages).unwrap();
    assert_eq!(
        context
            .chat_messages
            .iter()
            .filter(|m| m.role == "user")
            .count(),
        1
    );
}

#[test]
fn third_identical_call_pauses_before_execution_and_is_saved_before_notification() {
    let fixture = Fixture::new();
    fs::write(fixture.root.join("file.txt"), "hello").unwrap();
    let root = fixture.root.clone();
    let id = fixture.id.clone();
    let completed = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let count = completed.clone();
    let sink: EventSink = Arc::new(move |_, event| {
        if event["type"] == "tool_call_started" {
            count.fetch_add(1, Ordering::SeqCst);
        }
        if event["type"] == "run_paused" {
            assert_eq!(event["payload"]["reason"], "repeated_tool_call");
            let context = crate::storage::get_storage()
                .unwrap()
                .reconstruct_active_context(&root, &id, None)
                .unwrap();
            assert!(matches!(
                &context.events.last().unwrap().payload,
                EventPayload::RunCheckpoint { .. }
            ));
            resolve_tool_permission(
                Some(id.clone()),
                event["payload"]["id"].as_str().unwrap().into(),
                "reject".into(),
                None,
                None,
                None,
            )
            .unwrap();
        }
    });
    let n = std::sync::atomic::AtomicUsize::new(0);
    let stream: StreamFn = Box::new(move |_, _, _, _| {
        Ok(CompletionResponse::from_calls(vec![AssembledToolCall {
            id: format!("call-{}", n.fetch_add(1, Ordering::SeqCst)),
            name: "read_file".into(),
            arguments: json!({"path":"file.txt"}).to_string(),
        }]))
    });
    assert!(run_agent_loop(
        &fixture.root,
        &fixture.id,
        "read",
        &fixture.config(),
        stream,
        sink
    )
    .is_err());
    assert_eq!(completed.load(Ordering::SeqCst), 2);
}

#[test]
fn tool_instructions_match_actual_definitions_and_unknown_tools_do_not_prompt_for_approval() {
    let fixture = Fixture::new();
    let n = std::sync::atomic::AtomicUsize::new(0);
    let stream: StreamFn = Box::new(move |_, messages, definitions, emit| {
        let definitions = definitions.unwrap();
        assert_eq!(definitions.len(), 1);
        let system = messages[0].content.as_text();
        assert!(system.contains("read_file:"));
        assert!(!system.contains("write_file:"));
        if n.fetch_add(1, Ordering::SeqCst) == 0 {
            Ok(CompletionResponse::from_calls(vec![AssembledToolCall {
                id: "unavailable".into(),
                name: "imaginary_tool".into(),
                arguments: "{}".into(),
            }]))
        } else {
            assert!(messages
                .last()
                .unwrap()
                .content
                .as_text()
                .contains("not permitted"));
            emit(StreamChunk::Text("done".into()));
            Ok(CompletionResponse::from_calls(vec![]))
        }
    });
    let sink: EventSink = Arc::new(|_, event| assert_ne!(event["type"], "tool_call_pending"));
    run_agent_loop_scoped(
        &fixture.root,
        &fixture.id,
        "hello",
        &fixture.config(),
        Some(&["read_file".into()]),
        None,
        stream,
        sink,
    )
    .unwrap();
}

#[test]
fn interrupted_text_is_preserved_without_a_success_event() {
    let fixture = Fixture::new();
    let stream: StreamFn = Box::new(|_, _, _, emit| {
        emit(StreamChunk::Text("partial answer".into()));
        Err("connection lost".into())
    });
    let sink: EventSink = Arc::new(|_, event| assert_ne!(event["type"], "turn_completed"));
    assert!(run_agent_loop(
        &fixture.root,
        &fixture.id,
        "work",
        &fixture.config(),
        stream,
        sink
    )
    .is_err());
    let context = crate::storage::get_storage()
        .unwrap()
        .reconstruct_active_context(&fixture.root, &fixture.id, None)
        .unwrap();
    assert!(context
        .chat_messages
        .iter()
        .any(|m| m.content.as_text().contains("partial answer")));
    assert!(matches!(
        context.events.last().unwrap().payload,
        EventPayload::RunStatus {
            status: RunStatus::Failed,
            ..
        }
    ));
}

#[test]
fn unknown_context_capacity_stops_before_inference() {
    let fixture = Fixture::new();
    let mut config = fixture.config();
    config.context_window = None;
    let stream: StreamFn =
        Box::new(|_, _, _, _| panic!("must not request an unbudgeted inference"));
    let error = run_agent_loop(
        &fixture.root,
        &fixture.id,
        "work",
        &config,
        stream,
        Arc::new(|_, _| {}),
    )
    .unwrap_err();
    assert!(error.contains("context_window"));
}

#[test]
fn truncated_response_never_executes_even_syntactically_valid_tool_arguments() {
    let fixture = Fixture::new();
    let stream: StreamFn = Box::new(|_, _, _, emit| {
        emit(StreamChunk::Text("unfinished answer".into()));
        Ok(CompletionResponse {
            reason: provider::CompletionReason::Length,
            tool_calls: vec![AssembledToolCall {
                id: "truncated".into(),
                name: "write_file".into(),
                arguments: json!({"path":"must-not-exist","content":"unsafe"}).to_string(),
            }],
        })
    });
    let sink: EventSink = Arc::new(|_, event| {
        assert_ne!(event["type"], "tool_call_pending");
        assert_ne!(event["type"], "tool_call_started");
        assert_ne!(event["type"], "turn_completed");
    });
    assert!(run_agent_loop(
        &fixture.root,
        &fixture.id,
        "work",
        &fixture.config(),
        stream,
        sink
    )
    .is_err());
    assert!(!fixture.root.join("must-not-exist").exists());
    let context = crate::storage::get_storage()
        .unwrap()
        .reconstruct_active_context(&fixture.root, &fixture.id, None)
        .unwrap();
    assert!(context
        .chat_messages
        .iter()
        .any(|m| m.content.as_text().contains("unfinished answer")));
}

#[test]
fn interrupted_tools_are_reported_as_unknown_outcomes_and_never_replayed() {
    let fixture = Fixture::new();
    let storage = crate::storage::get_storage().unwrap();
    storage
        .create_session(&fixture.root, &fixture.id, None)
        .unwrap();
    fixture.append(EventPayload::UserTurn {
        prompt: "previous request".into(),
        attached_files: vec![],
    });
    fixture.append(EventPayload::AssistantMessage { model:"test-model".into(), message:ChatMessage {
        role:"assistant".into(), content:"working".into(), tool_call_id:None,
        tool_calls:Some(vec![json!({"id":"interrupted","type":"function","function":{"name":"write_file","arguments":"{}"}})]) } });
    let stream: StreamFn = Box::new(|_, messages, _, emit| {
        context::validate_pairs(messages).unwrap();
        assert!(messages.iter().any(|message| message.role == "tool"
            && message
                .content
                .as_text()
                .contains("may or may not have happened")));
        emit(StreamChunk::Text("I will inspect before retrying".into()));
        Ok(CompletionResponse::from_calls(vec![]))
    });
    run_agent_loop(
        &fixture.root,
        &fixture.id,
        "what happened?",
        &fixture.config(),
        stream,
        Arc::new(|_, _| {}),
    )
    .unwrap();
}

#[test]
fn an_active_session_cannot_be_replaced_or_removed_by_another_run() {
    let fixture = Fixture::new();
    let root = fixture.root.clone();
    let id = fixture.id.clone();
    let config = fixture.config();
    let stream: StreamFn = Box::new(move |_, _, _, emit| {
        let original = get_or_create_session(&id);
        remove_session(&id);
        assert!(Arc::ptr_eq(&original, &get_or_create_session(&id)));
        let other: StreamFn =
            Box::new(|_, _, _, _| panic!("a second run must not reach inference"));
        assert!(
            run_agent_loop(&root, &id, "second", &config, other, Arc::new(|_, _| {}))
                .unwrap_err()
                .contains("already active")
        );
        emit(StreamChunk::Text("done".into()));
        Ok(CompletionResponse::from_calls(vec![]))
    });
    run_agent_loop(
        &fixture.root,
        &fixture.id,
        "first",
        &fixture.config(),
        stream,
        Arc::new(|_, _| {}),
    )
    .unwrap();
}

#[test]
fn agent_discovers_search_tools_reads_real_results_and_gates_web_requests() {
    let f = Fixture::new();
    fs::create_dir_all(f.root.join("src")).unwrap();
    fs::write(f.root.join("src/login.rs"), "fn login() {}\n").unwrap();
    let captured = Arc::new(Mutex::new(Vec::new()));
    let events = captured.clone();
    let id = f.id.clone();
    let sink: EventSink = Arc::new(move |_, event| {
        if event["type"] == "tool_call_pending" {
            assert_eq!(event["payload"]["tool"], "web_search");
            assert_eq!(event["payload"]["tool_class"], "web");
            resolve_tool_permission(
                Some(id.clone()),
                event["payload"]["id"].as_str().unwrap().into(),
                "reject".into(),
                None,
                None,
                None,
            )
            .unwrap();
        }
        events.lock().unwrap().push(event);
    });
    let rounds = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let count = rounds.clone();
    let stream: StreamFn = Box::new(move |_, messages, definitions, emit| {
        let names: Vec<_> = definitions
            .unwrap()
            .iter()
            .map(|t| t["function"]["name"].as_str().unwrap())
            .collect();
        for name in ["glob", "grep", "web_search", "web_fetch"] {
            assert!(names.contains(&name));
        }
        let round = count.fetch_add(1, Ordering::SeqCst);
        let (name, args) = match round {
            0 => ("glob", json!({"pattern":"**/*.rs"})),
            1 => {
                assert!(messages
                    .last()
                    .unwrap()
                    .content
                    .as_text()
                    .contains("src/login.rs"));
                ("grep", json!({"pattern":"fn login","glob":"*.rs"}))
            }
            2 => {
                assert!(messages
                    .last()
                    .unwrap()
                    .content
                    .as_text()
                    .contains("src/login.rs:1: fn login() {}"));
                ("web_search", json!({"query":"Rust documentation"}))
            }
            _ => {
                assert!(messages
                    .last()
                    .unwrap()
                    .content
                    .as_text()
                    .to_ascii_lowercase()
                    .contains("reject"));
                emit(StreamChunk::Text(
                    "Found login; web search was denied.".into(),
                ));
                return Ok(CompletionResponse::from_calls(vec![]));
            }
        };
        Ok(CompletionResponse::from_calls(vec![AssembledToolCall {
            id: format!("search-{round}"),
            name: name.into(),
            arguments: args.to_string(),
        }]))
    });
    run_agent_loop(
        &f.root,
        &f.id,
        "Find login and search documentation.",
        &f.config(),
        stream,
        sink,
    )
    .unwrap();
    assert_eq!(rounds.load(Ordering::SeqCst), 4);
    let events = captured.lock().unwrap();
    assert_eq!(
        events
            .iter()
            .filter(|event| event["type"] == "tool_call_pending")
            .count(),
        1
    );
    assert!(events
        .iter()
        .any(|event| event["type"] == "tool_call_completed"
            && event["payload"]["tool"] == "web_search"
            && event["payload"]["is_error"] == true));
}
