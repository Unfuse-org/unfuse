use super::*;
use serde_json::json;
use std::{
    io::{BufRead, Read, Write},
    net::TcpListener,
    thread,
};
fn flag() -> Arc<AtomicBool> {
    Arc::new(AtomicBool::new(false))
}
fn local() -> McpServerConfig {
    let script = r#"
import sys,json,time
count=0
for line in sys.stdin:
 r=json.loads(line);method=r.get('method');i=r.get('id')
 if i is None: continue
 if method=='initialize':v={'protocolVersion':r['params']['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'fixture','version':'1'}}
 elif method=='tools/list':
  print(json.dumps({'jsonrpc':'2.0','method':'notifications/message','params':{'level':'info','data':'fixture notification'}}),flush=True)
  print(json.dumps({'jsonrpc':'2.0','id':'unrelated-response','result':{}}),flush=True)
  if r.get('params',{}).get('cursor')=='second':v={'tools':[{'name':'hang','inputSchema':{'type':'object'}}]}
  else:v={'tools':[{'name':'zap','description':'A mutation with no familiar mutation keyword','inputSchema':{'type':'object'},'annotations':{'readOnlyHint':True}}],'nextCursor':'second'}
 elif method=='tools/call':
  if r['params']['name']=='hang':time.sleep(10)
  count+=1;v={'content':[{'type':'text','text':'result'},{'type':'image','data':'aGk=','mimeType':'image/png'}],'structuredContent':{'count':count},'isError':r['params']['arguments'].get('error',False)}
 else: print(json.dumps({'jsonrpc':'2.0','id':i,'error':{'code':-32601,'message':'unsupported'}}),flush=True);continue
 print(json.dumps({'jsonrpc':'2.0','id':i,'result':v}),flush=True)
"#;
    McpServerConfig {
        id: crate::storage::event::generate_event_id(),
        name: "Fixture".into(),
        transport: "stdio".into(),
        command: Some("python3".into()),
        args: Some(vec!["-u".into(), "-c".into(), script.into()]),
        enabled: Some(true),
        ..Default::default()
    }
}
#[test]
fn sdk_stdio_routes_notifications_matches_ids_paginates_and_reuses_process() {
    let config = local();
    let root = std::env::temp_dir();
    let root = root.to_str().unwrap();
    let tools = discover(&config, Some(root), flag()).unwrap();
    assert_eq!(tools.len(), 2);
    for count in 1..=2 {
        let result: Value = serde_json::from_str(
            &call(&config, root, "zap", json!({"error":true}), flag()).unwrap(),
        )
        .unwrap();
        assert_eq!(result["structuredContent"]["count"], count);
        assert_eq!(result["content"][1]["type"], "image");
        assert_eq!(result["isError"], true);
    }
    assert_eq!(
        crate::tools::get_tool_action_type("mcp__fixture__zap", "{}"),
        (crate::tools::ToolActionType::MutateExternal, "external")
    );
    tauri::async_runtime::block_on(disconnect_mcp_server(config.id));
}

#[test]
fn local_mcp_is_scoped_and_disconnect_stops_descendants() {
    let directory = std::env::temp_dir().join(format!("unfuse-mcp-sandbox-{}", crate::storage::event::generate_event_id()));
    let workspace = directory.join("project");
    std::fs::create_dir_all(&workspace).unwrap();
    std::fs::write(directory.join("outside"), "fake outside data").unwrap();
    std::fs::write(workspace.join(".env"), "fake secret").unwrap();
    let script = r#"
import sys,json,os,subprocess
for line in sys.stdin:
 r=json.loads(line);i=r.get('id');m=r.get('method')
 if i is None:continue
 if m=='initialize':v={'protocolVersion':r['params']['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'scope','version':'1'}}
 elif m=='tools/list':v={'tools':[{'name':'scope','inputSchema':{'type':'object'}}]}
 elif m=='tools/call':
  denied=[]
  for p in ['.env','../outside']:
   try:open(p).read();denied.append(False)
   except PermissionError:denied.append(True)
  open('allowed','w').write('ok')
  subprocess.Popen(['/bin/sh','-c','sleep 2; touch descendant'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  v={'content':[{'type':'text','text':'checked'}],'structuredContent':{'denied':denied,'explicitEnv':os.environ.get('UNFUSE_FIXTURE')=='fake-value'}}
 else:continue
 print(json.dumps({'jsonrpc':'2.0','id':i,'result':v}),flush=True)
"#;
    let mut config = local();
    config.args = Some(vec!["-u".into(), "-c".into(), script.into()]);
    config.cwd = Some(workspace.to_string_lossy().into());
    config.env = Some(HashMap::from([("UNFUSE_FIXTURE".into(), "fake-value".into())]));
    let result: Value = serde_json::from_str(&call(&config, workspace.to_str().unwrap(), "scope", json!({}), flag()).unwrap()).unwrap();
    assert_eq!(result["structuredContent"]["denied"], json!([true,true]));
    assert_eq!(result["structuredContent"]["explicitEnv"], true);
    assert!(workspace.join("allowed").exists());
    tauri::async_runtime::block_on(disconnect_mcp_server(config.id));
    thread::sleep(Duration::from_millis(2300));
    assert!(!workspace.join("descendant").exists());
    std::fs::remove_dir_all(directory).unwrap();
}
#[test]
fn sdk_calls_cancel_and_timeout_without_replaying_external_actions() {
    for cancel in [true, false] {
        let mut config = local();
        config.timeout = Some(1);
        let root = std::env::temp_dir();
        let root = root.to_str().unwrap();
        discover(&config, Some(root), flag()).unwrap();
        let flag = flag();
        let task = if cancel {
            let flag = flag.clone();
            Some(thread::spawn(move || {
                thread::sleep(Duration::from_millis(120));
                flag.store(true, Ordering::SeqCst);
            }))
        } else {
            None
        };
        let start = Instant::now();
        let error = call(&config, root, "hang", json!({}), flag).unwrap_err();
        assert!(start.elapsed() < Duration::from_secs(3));
        assert!(
            error.contains("may have happened") || error.contains("inspect"),
            "{error}"
        );
        if let Some(task) = task {
            task.join().unwrap();
        }
        tauri::async_runtime::block_on(disconnect_mcp_server(config.id));
    }
}
#[test]
fn invalid_configuration_is_rejected_before_launch_or_network() {
    let mut config = local();
    config.transport = "websocket".into();
    assert!(validate(&config).is_err());
    config.transport = "streamable-http".into();
    for url in [
        "http://example.com/mcp",
        "https://user:password@example.com/mcp",
        "file:///tmp/server",
    ] {
        config.url = Some(url.into());
        assert!(validate(&config).is_err());
    }
    config.url = Some("https://example.com/mcp".into());
    config.headers = Some(HashMap::from([("MCP-Session-Id".into(), "forged".into())]));
    assert!(http_config(&config).is_err());
    config.timeout = Some(0);
    assert!(validate(&config).is_err());
    let mut config = local();
    config.enabled = Some(false);
    assert!(discover(&config, None, flag()).is_err());
    config.enabled = Some(true);
    let cancelled = flag();
    cancelled.store(true, Ordering::SeqCst);
    assert!(discover(&config, None, cancelled)
        .unwrap_err()
        .contains("cancelled"));
}

struct HttpFixture {
    url: String,
    stop: Arc<AtomicBool>,
    task: Option<thread::JoinHandle<()>>,
    requests: Arc<std::sync::Mutex<Vec<Value>>>,
}
impl Drop for HttpFixture {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(task) = self.task.take() {
            task.join().unwrap();
        }
    }
}
fn http() -> HttpFixture {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let url = format!("http://{}/mcp", listener.local_addr().unwrap());
    let stop = flag();
    let flag = stop.clone();
    let requests = Arc::new(std::sync::Mutex::new(Vec::new()));
    let recorded = requests.clone();
    let task = thread::spawn(move || {
        while !flag.load(Ordering::SeqCst) {
            let (mut socket, _) = match listener.accept() {
                Ok(socket) => socket,
                Err(_) => {
                    thread::sleep(Duration::from_millis(5));
                    continue;
                }
            };
            socket.set_nonblocking(false).unwrap();
            socket
                .set_read_timeout(Some(Duration::from_secs(2)))
                .unwrap();
            let mut reader = std::io::BufReader::new(socket.try_clone().unwrap());
            let mut line = String::new();
            if reader.read_line(&mut line).is_err() {
                continue;
            }
            let method = line.split_whitespace().next().unwrap_or("").to_owned();
            let mut length = 0;
            let mut headers = HashMap::new();
            loop {
                line.clear();
                if reader.read_line(&mut line).unwrap_or(0) == 0 || line == "\r\n" {
                    break;
                }
                if let Some((k, v)) = line.split_once(':') {
                    headers.insert(k.trim().to_lowercase(), v.trim().to_owned());
                }
            }
            if let Some(value) = headers.get("content-length") {
                length = value.parse().unwrap();
            }
            let mut bytes = vec![0; length];
            if reader.read_exact(&mut bytes).is_err() {
                continue;
            }
            if method == "GET" || method == "DELETE" {
                let _=socket.write_all(b"HTTP/1.1 405 Method Not Allowed\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                continue;
            }
            let body: Value = serde_json::from_slice(&bytes).unwrap();
            recorded
                .lock()
                .unwrap()
                .push(json!({"body":body,"headers":headers}));
            if body.get("id").is_none() {
                let _ = socket.write_all(
                    b"HTTP/1.1 202 Accepted\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
                );
                continue;
            }
            let result = match body["method"].as_str().unwrap() {
                "initialize" => {
                    json!({"protocolVersion":body["params"]["protocolVersion"],"capabilities":{"tools":{}},"serverInfo":{"name":"http-fixture","version":"1"}})
                }
                "tools/list" => {
                    json!({"tools":[{"name":"inspect","inputSchema":{"type":"object"}}]})
                }
                "tools/call" => {
                    json!({"content":[{"type":"text","text":"done"}],"structuredContent":{"ok":true}})
                }
                other => panic!("Unexpected method {other}"),
            };
            let payload = json!({"jsonrpc":"2.0","id":body["id"],"result":result}).to_string();
            let response=format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nMcp-Session-Id: fixture-session\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{payload}",payload.len());
            let _ = socket.write_all(response.as_bytes());
        }
    });
    HttpFixture {
        url,
        stop,
        task: Some(task),
        requests,
    }
}
#[test]
fn sdk_http_carries_auth_headers_and_session_identity_and_preserves_results() {
    let fixture = http();
    let config = McpServerConfig {
        id: crate::storage::event::generate_event_id(),
        name: "HTTP fixture".into(),
        transport: "streamable-http".into(),
        url: Some(fixture.url.clone()),
        headers: Some(HashMap::from([
            (
                "Authorization".into(),
                "Bearer fixture-not-a-real-key".into(),
            ),
            ("X-MCP-Toolsets".into(), "repos".into()),
        ])),
        ..Default::default()
    };
    let tools = discover(&config, None, flag()).unwrap();
    assert_eq!(tools.len(), 1);
    let result: Value =
        serde_json::from_str(&call(&config, "/tmp", "inspect", json!({}), flag()).unwrap())
            .unwrap();
    assert_eq!(result["structuredContent"]["ok"], true);
    let requests = fixture.requests.lock().unwrap();
    assert_eq!(
        requests
            .iter()
            .filter(|r| r["body"]["method"] == "initialize")
            .count(),
        1
    );
    for request in requests.iter() {
        assert_eq!(
            request["headers"]["authorization"],
            "Bearer fixture-not-a-real-key"
        );
        assert_eq!(request["headers"]["x-mcp-toolsets"], "repos");
        if request["body"]["method"] != "initialize" {
            assert_eq!(request["headers"]["mcp-session-id"], "fixture-session");
        }
    }
    drop(requests);
    tauri::async_runtime::block_on(disconnect_mcp_server(config.id));
}
