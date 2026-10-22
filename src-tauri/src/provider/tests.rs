use super::*;
use std::{
    io::{BufRead, Read, Write},
    net::TcpListener,
    sync::{Arc, Mutex},
    thread,
};

struct Exchange {
    method: &'static str,
    path: &'static str,
    body: Value,
    status: u16,
}
impl Exchange {
    fn get(path: &'static str, body: Value) -> Self {
        Self {
            method: "GET",
            path,
            body,
            status: 200,
        }
    }
}
type Requests = Arc<Mutex<Vec<Value>>>;
fn server(exchanges: Vec<Exchange>) -> (String, Requests, thread::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let requests = Arc::new(Mutex::new(Vec::new()));
    let recorded = requests.clone();
    let handle = thread::spawn(move || {
        for expected in exchanges {
            let deadline = Instant::now() + Duration::from_secs(5);
            let (mut socket, _) = loop {
                match listener.accept() {
                    Ok(socket) => break socket,
                    Err(e)
                        if e.kind() == std::io::ErrorKind::WouldBlock
                            && Instant::now() < deadline =>
                    {
                        thread::sleep(Duration::from_millis(5))
                    }
                    Err(e) => panic!("Provider did not make expected request: {e}"),
                }
            };
            socket.set_nonblocking(false).unwrap();
            socket
                .set_read_timeout(Some(Duration::from_secs(5)))
                .unwrap();
            let mut reader = std::io::BufReader::new(socket.try_clone().unwrap());
            let mut line = String::new();
            reader.read_line(&mut line).unwrap();
            assert!(
                line.starts_with(&format!("{} {} HTTP/1.1", expected.method, expected.path)),
                "{line}"
            );
            let mut length = 0;
            let mut authorization = None;
            loop {
                line.clear();
                reader.read_line(&mut line).unwrap();
                if line == "\r\n" {
                    break;
                }
                let lower = line.to_lowercase();
                if let Some(len) = lower.strip_prefix("content-length:") {
                    length = len.trim().parse().unwrap();
                }
                if lower.starts_with("authorization:") {
                    authorization = Some(line.trim().to_owned());
                }
            }
            let mut bytes = vec![0; length];
            reader.read_exact(&mut bytes).unwrap();
            recorded.lock().unwrap().push(json!({"body": if bytes.is_empty() { Value::Null } else { serde_json::from_slice(&bytes).unwrap() },"authorization":authorization}));
            let content_type = if expected.path.ends_with("/chat/completions") {
                "text/event-stream"
            } else if expected.path.ends_with("/api/chat") {
                "application/x-ndjson"
            } else {
                "application/json"
            };
            let body = expected
                .body
                .as_str()
                .map(str::to_owned)
                .unwrap_or_else(|| expected.body.to_string());
            write!(socket, "HTTP/1.1 {} Response\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}", expected.status, content_type, body.len(), body).unwrap();
        }
    });
    (url, requests, handle)
}
fn config(runner: Runner) -> ProviderConfig {
    ProviderConfig {
        provider: runner,
        capabilities: ModelCapabilities::runtime(CapabilityStatus::Unknown),
        base_url: "http://localhost:9999/proxy/v1/".into(),
        api_key: Some("test-key".into()),
        model: "exact/model:id".into(),
        temperature: Some(0.3),
        max_tokens: Some(128),
        timeout_secs: None,
        context_window: Some(4096),
    }
}

#[test]
fn configured_urls_keep_proxy_prefixes_and_never_duplicate_v1() {
    for base in [
        "https://example.test/proxy",
        "https://example.test/proxy/",
        "https://example.test/proxy/v1/",
    ] {
        assert_eq!(
            connection::endpoint(base, "v1/models").unwrap().as_str(),
            "https://example.test/proxy/v1/models"
        );
        assert_eq!(
            connection::endpoint(base, "api/chat").unwrap().as_str(),
            "https://example.test/proxy/api/chat"
        );
    }
    for base in [
        "file:///tmp/model",
        "localhost:1234",
        "https://user:secret@example.test",
        "https://example.test?token=secret",
        "https://example.test/#x",
    ] {
        assert!(connection::endpoint(base, "v1/models").is_err());
    }
    assert!(serde_json::from_str::<Runner>("\"something-random\"").is_err());
}

#[test]
fn ollama_discovery_separates_maximum_from_loaded_context_and_sends_auth_to_every_endpoint() {
    let (url, requests, task) = server(vec![
        Exchange::get(
            "/proxy/api/tags",
            json!({"models":[{"name":"small:latest","size":123456}]}),
        ),
        Exchange::get(
            "/proxy/api/ps",
            json!({"models":[{"name":"small:latest","context_length":4096}]}),
        ),
        Exchange {
            method: "POST",
            path: "/proxy/api/show",
            status: 200,
            body: json!({"model_info":{"general.architecture":"qwen2","qwen2.context_length":131072},"capabilities":["completion","tools"],"details":{"family":"qwen2","quantization_level":"Q4_K_M"}}),
        },
    ]);
    let models = tauri::async_runtime::block_on(connection::discover(
        Runner::Ollama,
        &format!("{url}/proxy/v1"),
        Some("test-key"),
    ))
    .unwrap();
    task.join().unwrap();
    let model = &models[0];
    assert_eq!(model.context_length, Some(4096));
    assert_eq!(model.max_context_length, Some(131072));
    assert_eq!(model.loaded, Some(true));
    assert_eq!(model.size_bytes, Some(123456));
    assert_eq!(model.capabilities.tool_calling, CapabilityStatus::Supported);
    assert_eq!(
        model.capabilities.image_input,
        CapabilityStatus::Unsupported
    );
    let requests = requests.lock().unwrap();
    assert!(requests.iter().all(|r| r["authorization"]
        .as_str()
        .unwrap()
        .ends_with("Bearer test-key")));
    assert_eq!(requests[2]["body"], json!({"model":"small:latest"}));
}

#[test]
fn lmstudio_uses_loaded_instance_ids_and_filters_embeddings() {
    let (url, _, task) = server(vec![Exchange::get(
        "/api/v1/models",
        json!({"models":[
            {"type":"llm","key":"model","max_context_length":65536,"capabilities":{"vision":true,"trained_for_tool_use":false},"loaded_instances":[{"id":"instance-a","config":{"context_length":4096}},{"id":"instance-b","config":{"context_length":8192}}]},
            {"type":"embedding","key":"embedding","loaded_instances":[]},
            {"type":"llm","key":"not-loaded","max_context_length":99999,"loaded_instances":[]}
        ]}),
    )]);
    let models =
        tauri::async_runtime::block_on(connection::discover(Runner::Lmstudio, &url, None)).unwrap();
    task.join().unwrap();
    assert_eq!(models.len(), 3);
    assert_eq!(models[0].name, "instance-a");
    assert_eq!(models[1].context_length, Some(8192));
    assert_eq!(models[2].loaded, Some(false));
    assert_eq!(models[2].context_length, None);
    assert_eq!(
        models[0].capabilities.tool_calling,
        CapabilityStatus::Unsupported
    );
}

#[test]
fn ollama_discovery_skips_retired_entries_but_keeps_other_failures() {
    for status in [410, 401, 500] {
        let mut exchanges = vec![
            Exchange::get("/api/tags", json!({"models":[{"name":"retired"},{"name":"healthy"}]})),
            Exchange::get("/api/ps", json!({"models":[]})),
            Exchange { method: "POST", path: "/api/show", status, body: json!({"error":"unavailable"}) },
        ];
        if status == 410 {
            exchanges.push(Exchange { method: "POST", path: "/api/show", status: 200, body: json!({"model_info":{"general.architecture":"qwen2","qwen2.context_length":32768},"capabilities":["completion"]}) });
        }
        let (url, _, task) = server(exchanges);
        let result = tauri::async_runtime::block_on(connection::discover(Runner::Ollama, &url, None));
        task.join().unwrap();
        if status == 410 {
            let models = result.unwrap();
            assert_eq!(models.len(), 1);
            assert_eq!(models[0].name, "healthy");
            assert_eq!(models[0].max_context_length, Some(32768));
            assert_eq!(models[0].context_length, None);
        } else {
            assert!(result.is_err());
        }
    }
}

#[test]
fn ollama_selected_retired_model_still_fails_preflight() {
    let (url, _, task) = server(vec![
        Exchange::get("/api/tags", json!({"models":[{"name":"exact/model:id"}]})),
        Exchange::get("/api/ps", json!({"models":[]})),
        Exchange { method: "POST", path: "/api/show", status: 410, body: json!({"error":"retired"}) },
    ]);
    let mut cfg = config(Runner::Ollama);
    cfg.base_url = url;
    let error = tauri::async_runtime::block_on(connection::prepare_config(cfg)).unwrap_err();
    task.join().unwrap();
    assert!(error.contains("exact/model:id"));
    assert!(error.contains("410 Gone"));
}

#[test]
fn compatible_runners_do_not_invent_capabilities_or_context() {
    for runner in [Runner::Vllm, Runner::Mlx, Runner::Unsloth] {
        let (url, _, task) = server(vec![Exchange::get(
            "/v1/models",
            json!({"data":[{"id":"vision-coder-name","max_model_len":8192}]}),
        )]);
        let models =
            tauri::async_runtime::block_on(connection::discover(runner, &url, Some("test-key")))
                .unwrap();
        task.join().unwrap();
        assert_eq!(
            models[0].capabilities.image_input,
            CapabilityStatus::Unknown
        );
        assert_eq!(
            models[0].capabilities.tool_calling,
            CapabilityStatus::Unknown
        );
        assert_eq!(
            models[0].context_length,
            if runner == Runner::Vllm {
                Some(8192)
            } else {
                None
            }
        );
        assert_eq!(
            models[0].loaded,
            if runner == Runner::Unsloth {
                Some(true)
            } else {
                None
            }
        );
    }
}

#[test]
fn llamacpp_uses_slot_allocation_and_does_not_apply_single_model_props_to_router_models() {
    let (url, _, task) = server(vec![
        Exchange::get("/v1/models", json!({"data":[{"id":"local"}]})),
        Exchange::get(
            "/props",
            json!({"default_generation_settings":{"n_ctx":2048},"modalities":{"vision":false},"is_sleeping":false}),
        ),
    ]);
    let models =
        tauri::async_runtime::block_on(connection::discover(Runner::Llamacpp, &url, None)).unwrap();
    task.join().unwrap();
    assert_eq!(models[0].context_length, Some(2048));
    assert_eq!(
        models[0].capabilities.image_input,
        CapabilityStatus::Unsupported
    );
    let (url, _, task) = server(vec![Exchange::get(
        "/v1/models",
        json!({"data":[{"id":"a"},{"id":"b"}]}),
    )]);
    let models =
        tauri::async_runtime::block_on(connection::discover(Runner::Llamacpp, &url, None)).unwrap();
    task.join().unwrap();
    assert!(models.iter().all(|m| m.context_length.is_none()));
}

#[test]
fn invalid_metadata_and_auth_failures_are_errors_not_empty_successful_discovery() {
    for (status, body, message) in [
        (
            401,
            json!({"error":"sensitive server diagnostic"}),
            "authentication",
        ),
        (200, json!({"models":[]}), "data array"),
        (200, json!({"data":[{}]}), "without an ID"),
    ] {
        let (url, _, task) = server(vec![Exchange {
            method: "GET",
            path: "/v1/models",
            status,
            body,
        }]);
        let error = tauri::async_runtime::block_on(connection::discover(Runner::Vllm, &url, None))
            .unwrap_err();
        task.join().unwrap();
        assert!(error.contains(message), "{error}");
        assert!(!error.contains("sensitive"));
    }
    assert!(tauri::async_runtime::block_on(connection::discover(
        Runner::Unsloth,
        "http://localhost:1",
        None
    ))
    .unwrap_err()
    .contains("API key"));
}

#[test]
fn request_parameters_reach_the_correct_wire_protocol_for_all_six_runners() {
    let tools = vec![
        json!({"type":"function","function":{"name":"read_file","parameters":{"type":"object"}}}),
    ];
    for runner in [
        Runner::Ollama,
        Runner::Lmstudio,
        Runner::Llamacpp,
        Runner::Vllm,
        Runner::Mlx,
        Runner::Unsloth,
    ] {
        let config = config(runner);
        let (url, body) =
            completion_request(&config, &[ChatMessage::user_text("hi")], Some(&tools)).unwrap();
        assert_eq!(body["model"], config.model);
        assert_eq!(body["tools"], json!(tools));
        if runner == Runner::Ollama {
            assert_eq!(url.path(), "/proxy/api/chat");
            assert_eq!(body["options"]["num_ctx"], 4096);
            assert_eq!(body["options"]["num_predict"], 128);
            assert!((body["options"]["temperature"].as_f64().unwrap() - 0.3).abs() < 0.0001);
            assert!(body.get("tool_choice").is_none());
        } else {
            assert_eq!(url.path(), "/proxy/v1/chat/completions");
            assert_eq!(body["max_tokens"], 128);
            if runner == Runner::Mlx {
                assert!(body.get("tool_choice").is_none());
            } else {
                assert_eq!(body["tool_choice"], "auto");
            }
            assert!(body.get("num_ctx").is_none());
            if runner == Runner::Unsloth {
                assert_eq!(body["enable_tools"], false);
            }
        }
    }
}

#[test]
fn unsupported_tools_images_and_invalid_settings_stop_before_http() {
    let mut config = config(Runner::Lmstudio);
    config.capabilities.tool_calling = CapabilityStatus::Unsupported;
    assert!(completion_request(&config, &[], Some(&[json!({})])).is_err());
    assert!(completion_request(&config, &[], None).is_ok());
    let image = ChatMessage::user_multimodal("image", &["data:image/png;base64,aGk=".into()]);
    assert!(completion_request(&config, std::slice::from_ref(&image), None).is_err());
    config.capabilities.image_input = CapabilityStatus::Supported;
    assert!(completion_request(&config, &[image], None).is_ok());
    config.temperature = Some(f32::NAN);
    assert!(completion_request(&config, &[], None).is_err());
    config.temperature = None;
    config.max_tokens = Some(0);
    assert!(completion_request(&config, &[], None).is_err());
}

#[test]
fn native_ollama_tools_and_images_round_trip_without_stringified_arguments() {
    let mut config = config(Runner::Ollama);
    config.capabilities.image_input = CapabilityStatus::Supported;
    let mut parser = ollama::OllamaStream::default();
    let wire = format!(
        "{}\n{}",
        json!({"done":false,"message":{"content":"你好","thinking":"check","tool_calls":[{"function":{"name":"read_file","arguments":{"path":"a.rs"}}}]}}),
        json!({"done":true,"done_reason":"stop","message":{"content":""}})
    );
    let mut chunks = Vec::new();
    for byte in wire.as_bytes() {
        parser.feed(&[*byte], &mut |c| chunks.push(c)).unwrap();
    }
    let response = parser.finish(&mut |c| chunks.push(c)).unwrap();
    assert_eq!(response.reason, CompletionReason::ToolCalls);
    assert_eq!(response.tool_calls.len(), 1);
    let call = &response.tool_calls[0];
    let history = vec![
        ChatMessage::user_multimodal("image", &["data:image/png;base64,aGk=".into()]),
        ChatMessage {
            role: "assistant".into(),
            content: "".into(),
            tool_call_id: None,
            tool_calls: Some(vec![
                json!({"id":call.id,"type":"function","function":{"name":call.name,"arguments":call.arguments}}),
            ]),
        },
        ChatMessage {
            role: "tool".into(),
            content: "contents".into(),
            tool_calls: None,
            tool_call_id: Some(call.id.clone()),
        },
    ];
    let (_, payload) = completion_request(&config, &history, None).unwrap();
    assert_eq!(payload["messages"][0]["images"], json!(["aGk="]));
    assert_eq!(
        payload["messages"][1]["tool_calls"][0]["function"]["arguments"],
        json!({"path":"a.rs"})
    );
    assert_eq!(payload["messages"][2]["tool_name"], "read_file");
    assert_eq!(payload["messages"][2]["tool_call_id"], call.id);
}

#[test]
fn native_ollama_truncation_and_invalid_frames_never_emit_executable_calls() {
    for wire in [
        format!(
            "{}\n",
            json!({"done":true,"done_reason":"length","message":{"tool_calls":[{"function":{"name":"read_file","arguments":{}}}]}})
        ),
        format!(
            "{}\n",
            json!({"done":false,"message":{"content":"partial"}})
        ),
        "not JSON\n".into(),
    ] {
        let mut parser = ollama::OllamaStream::default();
        let mut emitted = false;
        let mut emit = |chunk| {
            if matches!(chunk, StreamChunk::ToolCall(_)) {
                emitted = true;
            }
        };
        let result = parser
            .feed(wire.as_bytes(), &mut emit)
            .and_then(|_| parser.finish(&mut emit));
        assert!(result.is_err());
        assert!(!emitted);
    }
}

#[test]
fn preflight_checks_selected_models_and_active_context_without_claiming_unknown_values() {
    let (url, _, task) = server(vec![Exchange::get(
        "/v1/models",
        json!({"data":[{"id":"exact/model:id","max_model_len":2048}]}),
    )]);
    let mut cfg = config(Runner::Vllm);
    cfg.base_url = url;
    assert!(
        tauri::async_runtime::block_on(connection::prepare_config(cfg))
            .unwrap_err()
            .contains("active allocation")
    );
    task.join().unwrap();
    let (url, _, task) = server(vec![Exchange::get(
        "/v1/models",
        json!({"data":[{"id":"exact/model:id"}]}),
    )]);
    let mut cfg = config(Runner::Mlx);
    cfg.base_url = url;
    cfg.context_window = None;
    assert!(
        tauri::async_runtime::block_on(connection::prepare_config(cfg))
            .unwrap_err()
            .contains("did not report")
    );
    task.join().unwrap();
    let (url, _, task) = server(vec![Exchange::get("/v1/models", json!({"data":[]}))]);
    let mut cfg = config(Runner::Vllm);
    cfg.base_url = url;
    assert!(
        tauri::async_runtime::block_on(connection::prepare_config(cfg))
            .unwrap_err()
            .contains("no longer available")
    );
    task.join().unwrap();
    let (url, _, task) = server(vec![
        Exchange::get(
            "/api/tags",
            json!({"models":[{"name":"other"},{"name":"exact/model:id"}]}),
        ),
        Exchange::get("/api/ps", json!({"models":[]})),
        Exchange {
            method: "POST",
            path: "/api/show",
            status: 200,
            body: json!({"capabilities":["completion","tools"],"model_info":{}}),
        },
    ]);
    let mut cfg = config(Runner::Ollama);
    cfg.base_url = url;
    let cfg = tauri::async_runtime::block_on(connection::prepare_config(cfg)).unwrap();
    task.join().unwrap();
    assert_eq!(cfg.context_window, Some(4096));
    assert_eq!(cfg.capabilities.tool_calling, CapabilityStatus::Supported);
}

#[test]
fn six_runner_configuration_round_trips_ipc_without_dropping_provider_or_secrets_into_checkpoints()
{
    for runner in [
        Runner::Ollama,
        Runner::Lmstudio,
        Runner::Llamacpp,
        Runner::Vllm,
        Runner::Mlx,
        Runner::Unsloth,
    ] {
        let payload: crate::agent::LlmConfigPayload = serde_json::from_value(json!({"provider":runner,"base_url":"https://example.test/prefix/v1","api_key":"test-key","model":"custom/model","temperature":0.4,"max_tokens":256,"context_window":8192})).unwrap();
        let config = ProviderConfig::from(payload);
        assert_eq!(config.provider, runner);
        assert_eq!(config.api_key.as_deref(), Some("test-key"));
        assert_eq!(config.context_window, Some(8192));
        let (endpoint, body) =
            completion_request(&config, &[ChatMessage::user_text("hi")], None).unwrap();
        assert!(endpoint.path().starts_with("/prefix/"));
        assert!(!body.to_string().contains("test-key"));
        assert_eq!(body["model"], "custom/model");
    }
    assert!(serde_json::from_value::<crate::agent::LlmConfigPayload>(
        json!({"base_url":"http://localhost:1","model":"x"})
    )
    .is_err());
}

#[test]
fn actual_http_tool_round_trip_for_each_runner_preserves_auth_and_model_id() {
    for runner in [
        Runner::Ollama,
        Runner::Lmstudio,
        Runner::Llamacpp,
        Runner::Vllm,
        Runner::Mlx,
        Runner::Unsloth,
    ] {
        let (path, first, second) = if runner == Runner::Ollama {
            (
                "/api/chat",
                format!(
                    "{}\n",
                    json!({"done":true,"done_reason":"stop","message":{"content":"","tool_calls":[{"id":"call-a","function":{"name":"read_file","arguments":{"path":"a.rs"}}}]}})
                ),
                format!(
                    "{}\n",
                    json!({"done":true,"done_reason":"stop","message":{"content":"finished"}})
                ),
            )
        } else {
            (
                "/v1/chat/completions",
                format!(
                    "data: {}\n\ndata: [DONE]\n\n",
                    json!({"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-a","function":{"name":"read_file","arguments":"{\"path\":\"a.rs\"}"}}]},"finish_reason":"tool_calls"}]})
                ),
                format!(
                    "data: {}\n\ndata: [DONE]\n\n",
                    json!({"choices":[{"delta":{"content":"finished"},"finish_reason":"stop"}]})
                ),
            )
        };
        let (url, requests, task) = server(vec![
            Exchange {
                method: "POST",
                path,
                status: 200,
                body: Value::String(first),
            },
            Exchange {
                method: "POST",
                path,
                status: 200,
                body: Value::String(second),
            },
        ]);
        let mut cfg = config(runner);
        cfg.base_url = format!("{url}/v1");
        let mut messages = vec![ChatMessage::user_text("inspect a.rs")];
        let tools = vec![
            json!({"type":"function","function":{"name":"read_file","parameters":{"type":"object"}}}),
        ];
        let calls = stream_chat_completion(&cfg, &messages, Some(&tools), |_| {})
            .unwrap()
            .tool_calls;
        assert_eq!(calls.len(), 1);
        messages.push(ChatMessage{role:"assistant".into(),content:"".into(),tool_call_id:None,tool_calls:Some(vec![json!({"id":calls[0].id,"type":"function","function":{"name":calls[0].name,"arguments":calls[0].arguments}})])});
        messages.push(ChatMessage {
            role: "tool".into(),
            content: "file contents".into(),
            tool_call_id: Some(calls[0].id.clone()),
            tool_calls: None,
        });
        let mut text = String::new();
        let response = stream_chat_completion(&cfg, &messages, Some(&tools), |chunk| {
            if let StreamChunk::Text(delta) = chunk {
                text.push_str(&delta)
            }
        })
        .unwrap();
        assert_eq!(text, "finished");
        assert_eq!(response.reason, CompletionReason::Stop);
        task.join().unwrap();
        let requests = requests.lock().unwrap();
        for request in requests.iter() {
            assert_eq!(request["body"]["model"], cfg.model);
            assert!(request["authorization"]
                .as_str()
                .unwrap()
                .ends_with("Bearer test-key"));
        }
        if runner == Runner::Ollama {
            assert_eq!(requests[1]["body"]["messages"][2]["tool_name"], "read_file");
        } else {
            assert_eq!(requests[1]["body"]["messages"][2]["tool_call_id"], "call-a");
        }
    }
}
