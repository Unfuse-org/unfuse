use super::{capability, ModelCapabilities};
use reqwest::{Client, Method, Url};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Runner {
    Ollama,
    Lmstudio,
    Llamacpp,
    Vllm,
    Mlx,
    Unsloth,
}

impl Runner {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Ollama => "ollama",
            Self::Lmstudio => "lmstudio",
            Self::Llamacpp => "llamacpp",
            Self::Vllm => "vllm",
            Self::Mlx => "mlx",
            Self::Unsloth => "unsloth",
        }
    }
}

// base_url is a server root or an API root ending in /v1; proxy prefixes are preserved.
pub(super) fn endpoint(base: &str, path: &str) -> Result<Url, String> {
    let mut url = Url::parse(base.trim()).map_err(|_| "Enter an absolute HTTP(S) server URL")?;
    if !matches!(url.scheme(), "http" | "https")
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err("Server URL must use HTTP(S), without credentials, query or fragment; use the API key field for authentication".into());
    }
    let prefix = url.path().trim_end_matches('/');
    let prefix = prefix.strip_suffix("/v1").unwrap_or(prefix);
    url.set_path(&format!("{prefix}/{path}"));
    Ok(url)
}

pub(super) fn client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "Cannot initialize provider HTTP client".into())
}

pub(super) fn authorize(
    request: reqwest::RequestBuilder,
    key: Option<&str>,
) -> reqwest::RequestBuilder {
    match key.map(str::trim).filter(|k| !k.is_empty()) {
        Some(key) => request.bearer_auth(key),
        None => request,
    }
}

pub(super) fn response_error(status: reqwest::StatusCode, runner: Runner) -> String {
    match status.as_u16() {
        401 | 403 => format!("{} rejected authentication (HTTP {status}); check its API key and access settings", runner.as_str()),
        404 => format!("{} endpoint was not found (HTTP 404); check the selected runner, server URL and server version", runner.as_str()),
        410 => format!("{} resource is no longer available (HTTP 410 Gone)", runner.as_str()),
        _ => format!("{} rejected the request (HTTP {status}); check model availability, context limits and tool-parser configuration in the runner", runner.as_str()),
    }
}

struct MetadataError {
    status: Option<reqwest::StatusCode>,
    message: String,
}
impl From<String> for MetadataError {
    fn from(message: String) -> Self { Self { status: None, message } }
}
impl From<&str> for MetadataError {
    fn from(message: &str) -> Self { message.to_string().into() }
}
impl From<MetadataError> for String {
    fn from(error: MetadataError) -> Self { error.message }
}

async fn metadata(
    client: &Client,
    runner: Runner,
    base: &str,
    key: Option<&str>,
    method: Method,
    path: &str,
    body: Option<Value>,
) -> Result<Value, MetadataError> {
    let mut request = authorize(client.request(method, endpoint(base, path)?), key)
        .timeout(Duration::from_secs(15));
    if let Some(body) = body {
        request = request.json(&body);
    }
    let mut response = request.send().await.map_err(|e| {
        format!(
            "{} metadata request failed: {}",
            runner.as_str(),
            e.without_url()
        )
    })?;
    if !response.status().is_success() {
        return Err(MetadataError { status: Some(response.status()), message: format!("{}: {path}", response_error(response.status(), runner)) });
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "Cannot read provider metadata")?
    {
        if bytes.len().saturating_add(chunk.len()) > 4 * 1024 * 1024 {
            return Err("Provider metadata exceeded 4 MiB".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(|_| "Runner returned invalid model metadata JSON".into())
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredModel {
    pub id: String,
    pub name: String,
    pub display_name: String,
    pub family: String,
    pub quantization: Option<String>,
    pub size_bytes: Option<u64>,
    pub parameters: Option<String>,
    /// Currently allocated context, never the model's theoretical maximum.
    pub context_length: Option<usize>,
    pub max_context_length: Option<usize>,
    pub loaded: Option<bool>,
    pub capabilities: ModelCapabilities,
}

fn positive(value: &Value) -> Option<usize> {
    value
        .as_u64()
        .filter(|v| *v > 0)
        .and_then(|v| usize::try_from(v).ok())
}
fn text(value: &Value) -> Option<String> {
    value.as_str().filter(|v| !v.is_empty()).map(str::to_owned)
}
fn array<'a>(body: &'a Value, field: &str) -> Result<&'a Vec<Value>, String> {
    body[field].as_array().ok_or_else(|| {
        format!("Selected runner returned no {field} array; check runner type and API version")
    })
}
fn model(runner: Runner, name: &str, data: &Value) -> DiscoveredModel {
    DiscoveredModel {
        id: name.into(),
        name: name.into(),
        display_name: text(&data["display_name"]).unwrap_or_else(|| name.into()),
        family: text(&data["architecture"])
            .or_else(|| text(&data["details"]["family"]))
            .unwrap_or_else(|| "custom".into()),
        quantization: None,
        size_bytes: None,
        parameters: None,
        context_length: None,
        max_context_length: None,
        loaded: None,
        capabilities: capability::resolve_model_capabilities(runner.as_str(), Some(data)),
    }
}

// Native model metadata: https://docs.ollama.com/api/ps and https://lmstudio.ai/docs/developer/rest/list
pub async fn discover(
    runner: Runner,
    base: &str,
    key: Option<&str>,
) -> Result<Vec<DiscoveredModel>, String> {
    discover_selected(runner, base, key, None).await
}

async fn discover_selected(
    runner: Runner,
    base: &str,
    key: Option<&str>,
    selected: Option<&str>,
) -> Result<Vec<DiscoveredModel>, String> {
    endpoint(base, "v1/models")?;
    if runner == Runner::Unsloth && key.map(str::trim).is_none_or(str::is_empty) {
        return Err("Unsloth Studio requires an API key from Settings → API".into());
    }
    let client = client()?;
    let get = |path: &'static str| metadata(&client, runner, base, key, Method::GET, path, None);
    let mut result = Vec::new();
    match runner {
        Runner::Ollama => {
            let tags = get("api/tags").await?;
            let running = get("api/ps").await?;
            let running = array(&running, "models")?;
            for tag in array(&tags, "models")? {
                let name = tag["name"]
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .ok_or("Ollama returned a model without a name")?;
                if selected.is_some_and(|selected| selected != name) {
                    continue;
                }
                let show = match metadata(
                    &client,
                    runner,
                    base,
                    key,
                    Method::POST,
                    "api/show",
                    Some(json!({"model":name})),
                )
                .await {
                    Ok(show) => show,
                    Err(error) if selected.is_none() && error.status == Some(reqwest::StatusCode::GONE) => continue,
                    Err(error) => return Err(format!("{name}: {}", error.message)),
                };
                let mut item = model(runner, name, &show);
                item.size_bytes = tag["size"].as_u64();
                item.parameters = text(&show["details"]["parameter_size"]);
                item.quantization = text(&show["details"]["quantization_level"]);
                let active = running.iter().find(|m| {
                    m["name"].as_str() == Some(name) || m["model"].as_str() == Some(name)
                });
                item.loaded = Some(active.is_some());
                item.context_length = active.and_then(|m| positive(&m["context_length"]));
                if let Some(info) = show["model_info"].as_object() {
                    if let Some(architecture) =
                        info.get("general.architecture").and_then(Value::as_str)
                    {
                        item.max_context_length = info
                            .get(&format!("{architecture}.context_length"))
                            .and_then(positive);
                    }
                }
                result.push(item);
            }
        }
        Runner::Lmstudio => {
            let body = get("api/v1/models").await?;
            for entry in array(&body, "models")? {
                if entry["type"].as_str() != Some("llm") {
                    continue;
                }
                let name = entry["key"]
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .ok_or("LM Studio returned an LLM without a key")?;
                let instances = array(entry, "loaded_instances")?;
                let mut base_item = model(runner, name, entry);
                base_item.size_bytes = entry["size_bytes"].as_u64();
                base_item.parameters = text(&entry["params_string"]);
                base_item.quantization = text(&entry["quantization"]["name"]);
                base_item.max_context_length = positive(&entry["max_context_length"]);
                base_item.loaded = Some(!instances.is_empty());
                if instances.is_empty() {
                    result.push(base_item);
                    continue;
                }
                for instance in instances {
                    let mut item = base_item.clone();
                    let id = instance["id"]
                        .as_str()
                        .filter(|v| !v.is_empty())
                        .ok_or("LM Studio returned a loaded instance without an ID")?;
                    item.id = id.into();
                    item.name = id.into();
                    item.context_length = positive(&instance["config"]["context_length"]);
                    result.push(item);
                }
            }
        }
        Runner::Llamacpp | Runner::Vllm | Runner::Mlx | Runner::Unsloth => {
            let body = get("v1/models").await?;
            let entries = array(&body, "data")?;
            // /props describes a single loaded llama.cpp model; never apply it to every router model.
            let props = if runner == Runner::Llamacpp && entries.len() == 1 {
                Some(get("props").await?)
            } else {
                None
            };
            for entry in entries {
                let name = entry["id"]
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .ok_or("Runner returned a model without an ID")?;
                let mut item = model(runner, name, entry);
                match runner {
                    Runner::Llamacpp => {
                        if let Some(props) = &props {
                            item.context_length =
                                positive(&props["default_generation_settings"]["n_ctx"]);
                            item.loaded = props["is_sleeping"].as_bool().map(|sleeping| !sleeping);
                            item.capabilities =
                                capability::inspect_llamacpp_capabilities(Some(props));
                        }
                    }
                    Runner::Vllm => {
                        item.context_length = positive(&entry["max_model_len"]);
                    }
                    Runner::Unsloth => {
                        item.loaded = Some(true);
                    }
                    // mlx-lm /v1/models lists downloaded models, not necessarily resident ones.
                    _ => {}
                }
                result.push(item);
            }
        }
    }
    let mut ids = std::collections::HashSet::new();
    if result.iter().any(|m| !ids.insert(&m.id)) {
        return Err("Runner returned duplicate model IDs".into());
    }
    Ok(result)
}

#[tauri::command]
pub async fn discover_provider_models(
    provider: Runner,
    base_url: String,
    api_key: Option<String>,
) -> Result<Vec<DiscoveredModel>, String> {
    discover(provider, &base_url, api_key.as_deref()).await
}

pub async fn prepare_config(
    mut config: super::ProviderConfig,
) -> Result<super::ProviderConfig, String> {
    let models = discover_selected(
        config.provider,
        &config.base_url,
        config.api_key.as_deref(),
        Some(&config.model),
    )
    .await?;
    let model = models
        .iter()
        .find(|m| m.name == config.model)
        .ok_or("Selected model is no longer available from this runner; refresh the rack")?;
    config.capabilities = model.capabilities.clone();
    if config.provider == Runner::Ollama {
        // Native /api/chat sets num_ctx explicitly. Never allocate the model maximum implicitly.
        if config.context_window.is_none() {
            config.context_window = model.context_length;
        }
        if config
            .context_window
            .zip(model.max_context_length)
            .is_some_and(|(requested, max)| requested > max)
        {
            return Err("Requested context exceeds the model's reported maximum".into());
        }
    } else if let Some(active) = model.context_length {
        if config.context_window.is_some_and(|budget| budget > active) {
            return Err(format!(
                "Context budget exceeds the runner's active allocation of {active} tokens"
            ));
        }
        if config.context_window.is_none() {
            config.context_window = Some(active);
        }
    }
    if config.context_window.is_none() {
        return Err("Runner did not report an active context allocation. Set a context budget matching the runner before running".into());
    }
    Ok(config)
}
