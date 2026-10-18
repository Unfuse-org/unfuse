use super::*;
use rmcp::transport::auth::{AuthClient, AuthorizationRequest, OAuthState};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt};

fn active() -> &'static Mutex<HashMap<String, (String, tokio::task::AbortHandle)>> {
    static ACTIVE: OnceLock<Mutex<HashMap<String, (String, tokio::task::AbortHandle)>>> =
        OnceLock::new();
    ACTIVE.get_or_init(|| Mutex::new(HashMap::new()))
}
type AuthTask = tokio::task::JoinHandle<Result<Connection, String>>;
type PendingAuthorizations = Mutex<HashMap<String, (McpServerConfig, u64, AuthTask)>>;
fn pending() -> &'static PendingAuthorizations {
    static PENDING: OnceLock<PendingAuthorizations> = OnceLock::new();
    PENDING.get_or_init(|| Mutex::new(HashMap::new()))
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthorizationStart {
    auth_id: String,
    authorization_url: String,
}

#[tauri::command]
pub async fn begin_mcp_authorization(
    config: McpServerConfig,
) -> Result<AuthorizationStart, String> {
    validate(&config)?;
    let revision = generation(&config.id).await;
    if config.transport != "streamable-http" {
        return Err("Browser authorization is only for remote MCP connections".into());
    }
    let client = http_client()?;
    let transport =
        StreamableHttpClientTransport::with_client(client.clone(), http_config(&config)?);
    let attempt = tokio::time::timeout(Duration::from_secs(30), client_info().serve(transport))
        .await
        .map_err(|_| "MCP authentication discovery timed out")?;
    let challenge=match attempt { Ok(service)=>{let _=service.cancel().await;return Err("Server does not require browser authorization; use Connect".into())},Err(error)=>error.auth_challenge().map(str::to_owned).ok_or("Server did not return a supported OAuth challenge; check its URL and access requirements")? };
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|_| "Cannot open local OAuth callback listener")?;
    let address = listener
        .local_addr()
        .map_err(|_| "Cannot read callback address")?;
    let redirect = format!("http://127.0.0.1:{}/callback", address.port());
    let oauth_http = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "Cannot initialize OAuth client")?;
    let mut state = OAuthState::new(remote_url(&config)?.as_str(), Some(oauth_http))
        .await
        .map_err(|_| "OAuth metadata discovery failed")?;
    let mut request = AuthorizationRequest::new(&redirect)
        .with_client_name("Unfuse")
        .with_challenge(challenge)
        .with_application_type("native");
    if let Some(id) = &config.oauth_client_id {
        request = request.with_preregistered_client(id);
    }
    if let Some(secret) = &config.oauth_client_secret {
        request = request.with_client_secret(secret);
    }
    state.start_authorization(request).await.map_err(|_| {
        "OAuth registration failed; this vendor may require a registered client ID or approved app"
    })?;
    let authorization_url = state
        .get_authorization_url()
        .await
        .map_err(|_| "Cannot create authorization URL")?;
    let transport_config = http_config(&config)?;
    let task = tokio::spawn(async move {
        tokio::time::timeout(Duration::from_secs(300),async move {
            loop {
                let (mut socket,_)=listener.accept().await.map_err(|_|"OAuth callback listener failed")?;
                let mut request=String::new();
                let mut reader=tokio::io::BufReader::new((&mut socket).take(8192));
                tokio::time::timeout(Duration::from_secs(5),reader.read_line(&mut request)).await.map_err(|_|"OAuth callback read timed out")?.map_err(|_|"Cannot read OAuth callback")?;
                if !request.ends_with("\r\n") { return Err("Invalid or oversized OAuth callback".into()); }
                let target=request.lines().next().and_then(|line|line.strip_prefix("GET ")).and_then(|line|line.split_whitespace().next()).ok_or("Invalid OAuth callback method")?;
                let url=reqwest::Url::parse(&format!("http://{address}{target}")).map_err(|_|"Invalid OAuth callback URL")?;
                if url.path()!="/callback" { let _=socket.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;continue; }
                let callback=state.handle_callback_url(url.as_str()).await;
                let text=if callback.is_ok(){"Authorization received. Return to Unfuse."}else{"Authorization failed. Return to Unfuse and try again."};
                let response=format!("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{text}",text.len());
                let _=socket.write_all(response.as_bytes()).await;
                callback.map_err(|_|"OAuth callback verification or token exchange failed")?;
                let manager=state.into_authorization_manager().ok_or("OAuth authorization did not complete")?;
                let transport=StreamableHttpClientTransport::with_client(AuthClient::new(client,manager),transport_config);
                let service=client_info().serve(transport).await.map_err(|_|"Authorized MCP connection failed")?;
                return finish_connection(service).await;
            }
        }).await.map_err(|_|"Authorization expired after five minutes")?
    });
    let auth_id = crate::storage::event::generate_event_id();
    let mut pending = pending().lock().await;
    if pending.len() >= 16 {
        task.abort();
        return Err(
            "Too many pending authorizations; finish or disconnect an existing connection".into(),
        );
    }
    let revisions = generations().lock().await;
    if revisions.get(&config.id).copied().unwrap_or_default() != revision {
        task.abort();
        return Err("Authorization cancelled".into());
    }
    active()
        .lock()
        .await
        .insert(auth_id.clone(), (config.id.clone(), task.abort_handle()));
    pending.insert(auth_id.clone(), (config, revision, task));
    Ok(AuthorizationStart {
        auth_id,
        authorization_url,
    })
}

#[tauri::command]
pub async fn complete_mcp_authorization(auth_id: String) -> Result<McpTestResult, String> {
    let (config, revision, task) = pending()
        .lock()
        .await
        .remove(&auth_id)
        .ok_or("Authorization request is missing or expired")?;
    let result = task.await;
    active().lock().await.remove(&auth_id);
    let connection = result.map_err(|_| "Authorization task stopped")??;
    let revisions = generations().lock().await;
    if revisions.get(&config.id).copied().unwrap_or_default() != revision {
        connection.service.cancellation_token().cancel();
        return Err("Authorization cancelled".into());
    }
    let tools = connection.tools.clone();
    pool()
        .lock()
        .await
        .insert(key(&config, None)?, Arc::new(connection));
    Ok(McpTestResult {
        success: true,
        message: "Authorized; credentials are kept in memory for this app session".into(),
        latency_ms: 0,
        tools_count: tools.len(),
        tools,
    })
}

pub(super) async fn disconnect_pending(id: &str) {
    active().lock().await.retain(|_, (server, task)| {
        if server == id {
            task.abort();
            false
        } else {
            true
        }
    });
    pending().lock().await.retain(|_, (config, _, task)| {
        if config.id == id {
            task.abort();
            false
        } else {
            true
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn disconnect_aborts_authorization_while_completion_is_waiting() {
        tauri::async_runtime::block_on(async {
            let id = crate::storage::event::generate_event_id();
            let auth_id = crate::storage::event::generate_event_id();
            let revision = generation(&id).await;
            let config = McpServerConfig {
                id: id.clone(),
                transport: "streamable-http".into(),
                url: Some("https://example.com/mcp".into()),
                ..Default::default()
            };
            let task =
                tokio::spawn(async { std::future::pending::<Result<Connection, String>>().await });
            active()
                .lock()
                .await
                .insert(auth_id.clone(), (id.clone(), task.abort_handle()));
            pending()
                .lock()
                .await
                .insert(auth_id.clone(), (config, revision, task));
            let completion = tokio::spawn(complete_mcp_authorization(auth_id.clone()));
            while pending().lock().await.contains_key(&auth_id) {
                tokio::task::yield_now().await;
            }
            disconnect_mcp_server(id).await;
            let result = tokio::time::timeout(Duration::from_secs(1), completion)
                .await
                .unwrap()
                .unwrap();
            assert!(result.is_err());
            assert!(!active().lock().await.contains_key(&auth_id));
        });
    }
}
