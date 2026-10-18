use rmcp::{
    model::{CallToolRequestParams, ClientConfig, ClientRequest, Request, ServerResult, Tool},
    service::{PeerRequestOptions, RunningService},
    transport::{
        streamable_http_client::StreamableHttpClientTransportConfig, StreamableHttpClientTransport,
        TokioChildProcess,
    },
    RoleClient, ServiceExt,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    path::Path,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, OnceLock,
    },
    time::{Duration, Instant},
};
use tokio::sync::Mutex;

pub mod auth;
#[cfg(test)]
mod tests;

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct McpServerConfig {
    pub id: String,
    pub name: String,
    #[serde(default = "default_transport")]
    pub transport: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
    pub cwd: Option<String>,
    #[serde(default)]
    pub allowed_domains: Vec<String>,
    pub url: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub timeout: Option<u64>,
    pub enabled: Option<bool>,
    pub tool_count: Option<usize>,
    pub oauth_client_id: Option<String>,
    pub oauth_client_secret: Option<String>,
}
fn default_transport() -> String {
    "stdio".into()
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct McpTestResult {
    pub success: bool,
    pub message: String,
    pub latency_ms: u64,
    pub tools_count: usize,
    pub tools: Vec<Tool>,
}

pub(crate) struct Connection {
    service: RunningService<RoleClient, ClientConfig>,
    tools: Vec<Tool>,
    sandbox: Option<crate::sandbox::Invocation>,
}
type Connections = Mutex<HashMap<String, Arc<Connection>>>;
fn pool() -> &'static Connections {
    static POOL: OnceLock<Connections> = OnceLock::new();
    POOL.get_or_init(|| Mutex::new(HashMap::new()))
}
fn generations() -> &'static Mutex<HashMap<String, u64>> {
    static GENERATIONS: OnceLock<Mutex<HashMap<String, u64>>> = OnceLock::new();
    GENERATIONS.get_or_init(|| Mutex::new(HashMap::new()))
}
async fn generation(id: &str) -> u64 {
    *generations().lock().await.entry(id.to_owned()).or_default()
}
fn key(config: &McpServerConfig, root: Option<&str>) -> Result<String, String> {
    let root = if config.transport == "stdio" {
        root
    } else {
        None
    };
    let bytes = serde_json::to_vec(&(config, root)).map_err(|_| "Invalid MCP configuration")?;
    Ok(format!("{}:{:x}", config.id, Sha256::digest(bytes)))
}
fn duration(config: &McpServerConfig) -> Result<Duration, String> {
    let value = config.timeout.unwrap_or(120);
    if !(1..=1800).contains(&value) {
        return Err("MCP timeout must be between 1 and 1800 seconds".into());
    }
    Ok(Duration::from_secs(value))
}
fn validate(config: &McpServerConfig) -> Result<(), String> {
    if config.id.is_empty()
        || config.id.contains("__")
        || !config
            .id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
        return Err("MCP ID must contain letters, digits, single underscores or hyphens".into());
    }
    duration(config)?;
    if config.enabled == Some(false) {
        return Err("MCP connection is disabled".into());
    }
    match config.transport.as_str() {
        "stdio" if config.command.as_deref().is_some_and(|s| !s.trim().is_empty()) => Ok(()),
        "stdio" => Err("Choose an explicit installed executable for the stdio MCP server".into()),
        "streamable-http" => { remote_url(config)?; Ok(()) },
        _ => Err("Supported MCP transports are stdio and streamable-http; legacy SSE and WebSocket presets are not supported".into()),
    }
}
fn remote_url(config: &McpServerConfig) -> Result<reqwest::Url, String> {
    let url = reqwest::Url::parse(config.url.as_deref().ok_or("MCP server URL is required")?)
        .map_err(|_| "Invalid MCP server URL")?;
    let local = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"));
    if !(url.scheme() == "https" || url.scheme() == "http" && local)
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err("Use HTTPS for remote MCP, or HTTP on loopback; URL credentials and fragments are not allowed".into());
    }
    Ok(url)
}
fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .build()
        .map_err(|_| "Cannot initialize MCP HTTP client".into())
}
fn http_config(config: &McpServerConfig) -> Result<StreamableHttpClientTransportConfig, String> {
    let mut transport =
        StreamableHttpClientTransportConfig::with_uri(remote_url(config)?.to_string());
    // Never automatically repeat an external action after a session expires.
    transport.reinit_on_expired_session = false;
    for (name, value) in config.headers.as_ref().into_iter().flatten() {
        let name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| "Invalid MCP header name")?;
        if matches!(
            name.as_str(),
            "host" | "content-length" | "mcp-session-id" | "mcp-protocol-version"
        ) {
            return Err("MCP protocol headers are managed by the SDK".into());
        }
        let value = reqwest::header::HeaderValue::from_str(value)
            .map_err(|_| "Invalid MCP header value")?;
        transport.custom_headers.insert(name, value);
    }
    Ok(transport)
}
fn client_info() -> ClientConfig {
    let mut config = ClientConfig::default();
    config.client_info.name = "unfuse".into();
    config.client_info.version = env!("CARGO_PKG_VERSION").into();
    config
}
async fn connect(config: &McpServerConfig, root: Option<&str>) -> Result<Connection, String> {
    validate(config)?;
    let info = client_info();
    let mut sandbox = None;
    let service = match config.transport.as_str() {
        "stdio" => {
            let cwd = Path::new(config.cwd.as_deref().or(root).ok_or("Choose a workspace directory for this local MCP server")?);
            let mut argv = vec![config.command.clone().ok_or("Missing MCP executable")?];
            argv.extend(config.args.clone().unwrap_or_default());
            let (invocation, command) = crate::sandbox::Invocation::new(cwd, cwd, argv, &config.allowed_domains, config.env.as_ref())?;
            sandbox = Some(invocation);
            let command = tokio::process::Command::from(command);
            let (transport, _) = TokioChildProcess::builder(command)
                .stderr(std::process::Stdio::null())
                .spawn()
                .map_err(|_| "Cannot launch MCP executable; check its path and installation")?;
            if let Some(invocation) = sandbox.as_mut() { invocation.pid = transport.id(); }
            info.serve(transport).await.map_err(|_| {
                "Sandboxed MCP initialization failed; check executable, workspace, allowed domains and SRT dependencies"
            })?
        }
        _ => {
            let transport =
                StreamableHttpClientTransport::with_client(http_client()?, http_config(config)?);
            info.serve(transport).await.map_err(|e| -> String { if e.auth_challenge().is_some() { "MCP authentication required; authorize this connection or provide supported credentials".into() } else { "MCP HTTP initialization failed; check endpoint, credentials and server availability".into() } })?
        }
    };
    let mut connection = finish_connection(service).await?;
    connection.sandbox = sandbox;
    Ok(connection)
}
async fn finish_connection(
    service: RunningService<RoleClient, ClientConfig>,
) -> Result<Connection, String> {
    let tools = service
        .list_all_tools()
        .await
        .map_err(|_| "MCP tools/list failed")?;
    let mut names = std::collections::HashSet::new();
    if tools.iter().any(|t| {
        t.name.is_empty()
            || !names.insert(t.name.clone())
            || t.input_schema
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind != "object")
    }) {
        return Err("MCP returned invalid or duplicate tool definitions".into());
    }
    Ok(Connection { service, tools, sandbox: None })
}
async fn connection(
    config: &McpServerConfig,
    root: Option<&str>,
) -> Result<Arc<Connection>, String> {
    validate(config)?;
    let revision = generation(&config.id).await;
    let key = key(config, root)?;
    let existing = pool().lock().await.get(&key).cloned();
    if let Some(existing) = existing {
        if !existing.service.is_closed() {
            return Ok(existing);
        }
        pool().lock().await.remove(&key);
    }
    let connection = tokio::time::timeout(Duration::from_secs(30), connect(config, root))
        .await
        .map_err(|_| "MCP initialization or discovery timed out")??;
    let entry = Arc::new(connection);
    let generations = generations().lock().await;
    if generations.get(&config.id).copied().unwrap_or_default() != revision {
        entry.service.cancellation_token().cancel();
        return Err("MCP connection was disconnected".into());
    }
    Ok(pool().lock().await.entry(key).or_insert(entry).clone())
}

pub fn discover(
    config: &McpServerConfig,
    root: Option<&str>,
    cancelled: Arc<AtomicBool>,
) -> Result<Vec<Tool>, String> {
    let config = config.clone();
    let root = root.map(str::to_owned);
    blocking(cancelled, Duration::from_secs(35), async move {
        let connection = connection(&config, root.as_deref()).await?;
        let tools = connection.tools.clone();
        Ok(tools)
    })
}

pub fn call(
    config: &McpServerConfig,
    root: &str,
    name: &str,
    args: Value,
    cancelled: Arc<AtomicBool>,
) -> Result<String, String> {
    let timeout = duration(config)?;
    let config = config.clone();
    let root = root.to_owned();
    let name = name.to_owned();
    let flag = cancelled.clone();
    blocking(cancelled, timeout + Duration::from_secs(35), async move {
        let entry = connection(&config, Some(&root)).await?;
        let guard = entry;
        if !guard.tools.iter().any(|tool| tool.name == name) {
            return Err("MCP tool is not in the discovered tool list".into());
        }
        if flag.load(Ordering::SeqCst) {
            return Err("MCP call cancelled before dispatch".into());
        }
        let arguments = args
            .as_object()
            .cloned()
            .ok_or("MCP tool arguments must be a JSON object")?;
        let params = CallToolRequestParams::new(name).with_arguments(arguments);
        let handle = guard
            .service
            .send_cancellable_request(
                ClientRequest::CallToolRequest(Request::new(params)),
                PeerRequestOptions::with_timeout(timeout),
            )
            .await
            .map_err(|_| "MCP request could not be sent")?;
        let id = handle.id.clone();
        let peer = handle.peer.clone();
        let result = tokio::select! {
            response=handle.await_response()=>response.map_err(|_| "MCP call failed or timed out; the external action may have happened. Inspect before retrying")?,
            _=async { while !flag.load(Ordering::SeqCst) { tokio::time::sleep(Duration::from_millis(20)).await; } } => {
                let notification=rmcp::model::CancelledNotificationParam::new(Some(id),Some("User cancelled".into()));
                let _=peer.send_notification(rmcp::model::Notification::new(notification).into()).await;
                return Err("MCP call cancelled; the external action may have happened. Inspect before retrying".into());
            }
        };
        match result {
            ServerResult::CallToolResult(result) => {
                serde_json::to_string(&result).map_err(|_| "Cannot serialize MCP result".into())
            }
            _ => Err("MCP returned an unexpected response type".into()),
        }
    })
}

fn blocking<T: Send + 'static>(
    cancelled: Arc<AtomicBool>,
    timeout: Duration,
    future: impl std::future::Future<Output = Result<T, String>> + Send + 'static,
) -> Result<T, String> {
    if cancelled.load(Ordering::SeqCst) {
        return Err("MCP operation cancelled".into());
    }
    let (send, receive) = std::sync::mpsc::sync_channel(1);
    let task = tauri::async_runtime::spawn(async move {
        let result = future.await;
        let _ = send.send(result);
    });
    let start = Instant::now();
    loop {
        match receive.recv_timeout(Duration::from_millis(20)) {
            Ok(result) => return result,
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                return Err("MCP task stopped".into())
            }
            Err(_) => {
                if cancelled.load(Ordering::SeqCst) {
                    // Allow the in-flight request to send its cancellation notification.
                    if let Ok(result) = receive.recv_timeout(Duration::from_millis(250)) {
                        return result;
                    }
                    task.abort();
                    return Err(
                        "MCP operation cancelled; inspect external state before retrying".into(),
                    );
                }
                if start.elapsed() >= timeout {
                    task.abort();
                    return Err(
                        "MCP operation timed out; inspect external state before retrying".into(),
                    );
                }
            }
        }
    }
}

#[tauri::command]
pub async fn test_mcp_server(config: McpServerConfig) -> McpTestResult {
    let start = Instant::now();
    let result = connection(&config, None).await;
    match result {
        Ok(entry) => {
            let tools = entry.tools.clone();
            McpTestResult {
                success: true,
                message: "Connected; tools discovered from the server".into(),
                latency_ms: start.elapsed().as_millis() as u64,
                tools_count: tools.len(),
                tools,
            }
        }
        Err(message) => McpTestResult {
            success: false,
            message,
            latency_ms: start.elapsed().as_millis() as u64,
            tools_count: 0,
            tools: vec![],
        },
    }
}
#[tauri::command]
pub async fn disconnect_mcp_server(id: String) {
    {
        let mut revisions = generations().lock().await;
        *revisions.entry(id.clone()).or_default() += 1;
    }
    auth::disconnect_pending(&id).await;
    let entries: Vec<_> = {
        let mut pool = pool().lock().await;
        let keys: Vec<_> = pool
            .keys()
            .filter(|k| k.starts_with(&format!("{id}:")))
            .cloned()
            .collect();
        keys.into_iter().filter_map(|k| pool.remove(&k)).collect()
    };
    for entry in entries {
        let guard = entry;
        guard.service.cancellation_token().cancel();
    }
}
