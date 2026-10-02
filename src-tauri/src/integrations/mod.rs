use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use reqwest::blocking::Client;
use std::time::{Duration, Instant};
use std::sync::Mutex;

/// Configuration for a specific external service.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceConfig {
    pub id: String,
    pub api_key: Option<String>,
    pub endpoint: Option<String>,
    pub options: Option<Value>,
}

/// Result of an integration execution, containing both machine-readable and human-readable formats.
#[derive(Debug, Serialize, Deserialize)]
pub struct IntegrationResponse {
    pub data: Value, // Filtered, flattened JSON for the LLM
    pub summary: String, // Clean Markdown summary for the user/agent
}

impl IntegrationResponse {
    pub fn to_agent_string(&self) -> String {
        format!("Data: {}\nSummary: {}", serde_json::to_string(&self.data).unwrap_or_default(), self.summary)
    }
}

/// Trait for implementing a native external integration tool.
pub trait ExternalTool: Send + Sync {
    /// Executes the tool logic, filters the response, and returns a structured response.
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String>;
}

// --- UTILITIES ---

fn handle_api_error(status: reqwest::StatusCode, body: &str) -> String {
    match status {
        reqwest::StatusCode::UNAUTHORIZED => "Authentication failed: Invalid API key.".to_string(),
        reqwest::StatusCode::FORBIDDEN => "Access denied: Insufficient permissions for this resource.".to_string(),
        reqwest::StatusCode::TOO_MANY_REQUESTS => "Rate limit exceeded. Please wait before retrying.".to_string(),
        reqwest::StatusCode::NOT_FOUND => "Resource not found.".to_string(),
        _ => format!("API Error ({}): {}", status, body),
    }
}

// --- PROVIDERS ---

pub struct TavilyProvider;
impl ExternalTool for TavilyProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let query = args["query"].as_str().ok_or("Missing 'query' parameter")?;
        let api_key = config.api_key.as_ref().ok_or("Tavily API key not configured")?;

        let client = Client::new();
        let payload = json!({
            "api_key": api_key,
            "query": query,
            "search_depth": "advanced",
            "include_answer": true,
            "include_raw_content": "markdown"
        });

        let response = client.post("https://api.tavily.com/search")
            .json(&payload)
            .send()
            .map_err(|e| format!("Tavily request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
        }

        let body: Value = response.json().map_err(|e| format!("Tavily JSON parse error: {}", e))?;
        let answer = body["answer"].as_str().unwrap_or("No direct answer found").to_string();
        let results = body["results"].as_array().map(|arr| {
            arr.iter().map(|r| json!({
                "title": r["title"],
                "url": r["url"],
                "content": r["content"]
            })).collect::<Vec<_>>()
        }).unwrap_or_default();

        let filtered_data = json!({ "answer": answer, "results": results });
        let mut summary = format!("### Tavily Search Results\n**Answer:** {}\n\n", answer);
        if let Some(res_arr) = results.as_array() {
            for (i, res) in res_arr.iter().enumerate() {
                summary.push_str(&format!("{}. [{}]({})\n{}", i+1, res["title"], res["url"], res["content"]));
                summary.push_str("\n\n");
            }
        }
        Ok(IntegrationResponse { data: filtered_data, summary })
    }
}

pub struct BraveProvider;
impl ExternalTool for BraveProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let query = args["query"].as_str().ok_or("Missing 'query' parameter")?;
        let api_key = config.api_key.as_ref().ok_or("Brave API key not configured")?;

        let client = Client::new();
        let response = client.get(format!("https://api.search.brave.com/res/v1/llm/context?q={}", query))
            .header("X-Subscription-Token", api_key)
            .send()
            .map_err(|e| format!("Brave request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
        }

        let body: Value = response.json().map_err(|e| format!("Brave JSON parse error: {}", e))?;
        let results = body["grounding"]["generic"].as_array().map(|arr| {
            arr.iter().map(|r| json!({
                "title": r["title"],
                "url": r["url"],
                "snippets": r["snippets"]
            })).collect::<Vec<_>>()
        }).unwrap_or_default();

        let filtered_data = json!({ "results": results });
        let mut summary = "### Brave Search Results\n".to_string();
        if let Some(res_arr) = results.as_array() {
            for (i, res) in res_arr.iter().enumerate() {
                summary.push_str(&format!("{}. [{}]({})\n{}", i+1, res["title"], res["url"], res["snippets"]));
                summary.push_str("\n\n");
            }
        }
        Ok(IntegrationResponse { data: filtered_data, summary })
    }
}

pub struct FirecrawlProvider;
impl ExternalTool for FirecrawlProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let url = args["url"].as_str().ok_or("Missing 'url' parameter")?;
        let api_key = config.api_key.as_ref().ok_or("Firecrawl API key not configured")?;

        let client = Client::new();
        let response = client.post("https://api.firecrawl.dev/v1/scrape")
            .bearer_auth(api_key)
            .json(&json!({
                "url": url,
                "formats": ["markdown"]
            }))
            .send()
            .map_err(|e| format!("Firecrawl request failed: {}", e))?;

        if !response.status().is_success() {
            return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
        }

        let body: Value = response.json().map_err(|e| format!("Firecrawl JSON parse error: {}", e))?;
        let markdown = body["data"]["content"].as_str().unwrap_or("No content extracted").to_string();
        let title = body["data"]["metadata"]["title"].as_str().unwrap_or("Untitled Page").to_string();

        let filtered_data = json!({ "title": title, "url": url, "content": markdown });
        let summary = format!("### Page Extraction: {}\nURL: {}\n\n{}\n", title, url, markdown);

        Ok(IntegrationResponse { data: filtered_data, summary })
    }
}

pub struct NotionProvider;
impl ExternalTool for NotionProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("read");
        let api_key = config.api_key.as_ref().ok_or("Notion API key not configured")?;
        let client = Client::new();

        match action {
            "read" => {
                let page_id = args["page_id"].as_str().ok_or("Missing 'page_id' parameter")?;
                let response = client.get(format!("https://api.notion.com/v1/pages/{}/markdown", page_id))
                    .bearer_auth(api_key)
                    .header("Notion-Version", "2022-06-28")
                    .send()
                    .map_err(|e| format!("Notion request failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                let body: Value = response.json().map_err(|e| format!("Notion JSON parse error: {}", e))?;
                let markdown = body["markdown"].as_str().unwrap_or("No content found").to_string();
                let filtered_data = json!({ "page_id": page_id, "content": markdown });
                let summary = format!("### Notion Page Content\nID: {}\n\n{}", page_id, markdown);
                Ok(IntegrationResponse { data: filtered_data, summary })
            }
            "write" => {
                let page_id = args["page_id"].as_str().ok_or("Missing 'page_id' parameter")?;
                let content = args["content"].as_str().ok_or("Missing 'content' parameter")?;

                // Notion's "write" typically involves appending blocks
                let response = client.patch(format!("https://api.notion.com/v1/blocks/{}", page_id))
                    .bearer_auth(api_key)
                    .header("Notion-Version", "2022-06-28")
                    .json(&json!({
                        "children": [{
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": { "rich_text": [{ "text": { "content": content } }] }
                        }]
                    }))
                    .send()
                    .map_err(|e| format!("Notion write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success", "page_id": page_id }),
                    summary: format!("Successfully appended content to Notion page {}.", page_id)
                })
            }
            _ => Err("Invalid action for Notion. Use 'read' or 'write'.".to_string()),
        }
    }
}

pub struct GitHubProvider;
impl ExternalTool for GitHubProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("read");
        let api_key = config.api_key.as_ref().ok_or("GitHub API key not configured")?;
        let client = Client::new();

        match action {
            "read" => {
                let endpoint = args["endpoint"].as_str().ok_or("Missing 'endpoint' parameter")?;
                let response = client.get(format!("https://api.github.com{}", endpoint))
                    .header("User-Agent", "Unfuse-Agent")
                    .header("X-GitHub-Api-Version", "2026-03-10")
                    .bearer_auth(api_key)
                    .send()
                    .map_err(|e| format!("GitHub read failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                let body: Value = response.json().map_err(|e| format!("GitHub JSON parse error: {}", e))?;
                let filtered_data = if let Some(arr) = body.as_array() {
                    let simplified = arr.iter().map(|item| {
                        json!({ "id": item["id"], "title": item["title"], "state": item["state"], "user": item["user"]["login"] })
                    }).collect::<Vec<_>>();
                    json!({ "items": simplified })
                } else {
                    json!(body)
                };

                Ok(IntegrationResponse {
                    data: filtered_data,
                    summary: format!("### GitHub Read Result\nEndpoint: {}\n\n{}", endpoint, serde_json::to_string_pretty(&filtered_data).unwrap())
                })
            }
            "write" => {
                // Standard Agentic Workflow: Branch -> Commit -> PR
                let owner = args["owner"].as_str().ok_or("Missing 'owner'")?;
                let repo = args["repo"].as_str().ok_or("Missing 'repo'")?;
                let branch = args["branch"].as_str().ok_or("Missing 'branch'")?;
                let commit_msg = args["message"].as_str().unwrap_or("Agent update");
                let content = args["content"].as_str().ok_or("Missing 'content'")?;
                let path = args["path"].as_str().ok_or("Missing 'path'")?;

                // 1. Create Branch (Simplified via PUT /refs)
                // Note: In production, we would get the SHA of main first.

                // 2. Create/Update File
                let response = client.put(format!("https://api.github.com/repos/{}/{}/contents/{}", owner, repo, path))
                    .header("User-Agent", "Unfuse-Agent")
                    .header("X-GitHub-Api-Version", "2026-03-10")
                    .bearer_auth(api_key)
                    .json(&json!({
                        "message": commit_msg,
                        "content": base64::encode(content),
                        "branch": branch
                    }))
                    .send()
                    .map_err(|e| format!("GitHub write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success", "repo": repo, "branch": branch }),
                    summary: format!("Successfully pushed changes to {} on branch {}.", repo, branch)
                })
            }
            _ => Err("Invalid action for GitHub. Use 'read' or 'write'.".to_string()),
        }
    }
}

pub struct LinearProvider;
impl ExternalTool for LinearProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("read");
        let api_key = config.api_key.as_ref().ok_or("Linear API key not configured")?;
        let client = Client::new();

        match action {
            "read" => {
                let query = args["query"].as_str().ok_or("Missing 'query' (GraphQL)")?;
                let response = client.post("https://api.linear.app/graphql")
                    .header("Authorization", api_key)
                    .json(&json!({ "query": query }))
                    .send()
                    .map_err(|e| format!("Linear read failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                let body: Value = response.json().map_err(|e| format!("Linear JSON parse error: {}", e))?;
                Ok(IntegrationResponse {
                    data: body,
                    summary: format!("### Linear GraphQL Result\n\n{}", serde_json::to_string_pretty(&body).unwrap())
                })
            }
            "write" => {
                let mutation = args["mutation"].as_str().ok_or("Missing 'mutation' (GraphQL)")?;
                let response = client.post("https://api.linear.app/graphql")
                    .header("Authorization", api_key)
                    .json(&json!({ "query": mutation }))
                    .send()
                    .map_err(|e| format!("Linear write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success" }),
                    summary: "Successfully executed Linear mutation.".to_string()
                })
            }
            _ => Err("Invalid action for Linear. Use 'read' or 'write'.".to_string()),
        }
    }
}

pub struct SentryProvider;
impl ExternalTool for SentryProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("read");
        let api_key = config.api_key.as_ref().ok_or("Sentry API key not configured")?;
        let client = Client::new();

        match action {
            "read" => {
                let endpoint = args["endpoint"].as_str().ok_or("Missing 'endpoint' parameter")?;
                let response = client.get(format!("https://sentry.io/api/0/{}", endpoint))
                    .bearer_auth(api_key)
                    .send()
                    .map_err(|e| format!("Sentry read failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                let body: Value = response.json().map_err(|e| format!("Sentry JSON parse error: {}", e))?;
                Ok(IntegrationResponse {
                    data: body,
                    summary: format!("### Sentry Report\n\n{}", serde_json::to_string_pretty(&body).unwrap())
                })
            }
            "write" => {
                let endpoint = args["endpoint"].as_str().ok_or("Missing 'endpoint' parameter")?;
                let payload = args["payload"].as_object().ok_or("Missing 'payload' object")?;

                let response = client.post(format!("https://sentry.io/api/0/{}", endpoint))
                    .bearer_auth(api_key)
                    .json(payload)
                    .send()
                    .map_err(|e| format!("Sentry write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success" }),
                    summary: "Successfully updated Sentry resource.".to_string()
                })
            }
            _ => Err("Invalid action for Sentry. Use 'read' or 'write'.".to_string()),
        }
    }
}

pub struct DatadogProvider;
impl ExternalTool for DatadogProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("read");

        match action {
            "read" => {
                let query = args["query"].as_str().ok_or("Missing 'query' parameter")?;
                let output = std::process::Command::new("pup")
                    .arg("metrics")
                    .arg("query")
                    .arg("--query")
                    .arg(query)
                    .arg("--agent")
                    .output()
                    .map_err(|e| format!("Failed to execute pup CLI: {}", e))?;

                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                    let data: Value = serde_json::from_str(&stdout).unwrap_or(json!({ "raw": stdout }));
                    Ok(IntegrationResponse {
                        data,
                        summary: format!("### Datadog Metrics\nQuery: {}\n\n{}", query, stdout)
                    })
                } else {
                    Err(String::from_utf8_lossy(&output.stderr).to_string())
                }
            }
            "write" => {
                // Pup CLI currently focuses on read-only metrics.
                // For write, we'd typically use the Datadog REST API to create monitors.
                let monitor_name = args["name"].as_str().ok_or("Missing 'name'")?;
                let query = args["query"].as_str().ok_or("Missing 'query'")?;
                let api_key = config.api_key.as_ref().ok_or("Datadog API key not configured")?;

                let client = Client::new();
                let response = client.post("https://api.datadoghq.com/api/v1/monitor")
                    .header("DD-API-KEY", api_key)
                    .json(&json!({
                        "name": monitor_name,
                        "type": "metric alert",
                        "query": query,
                        "message": "Alert triggered by Unfuse Agent"
                    }))
                    .send()
                    .map_err(|e| format!("Datadog write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success" }),
                    summary: format!("Successfully created Datadog monitor: {}.", monitor_name)
                })
            }
            _ => Err("Invalid action for Datadog. Use 'read' or 'write'.".to_string()),
        }
    }
}

pub struct SlackProvider;
impl ExternalTool for SlackProvider {
    fn execute(&self, args: Value, config: &ServiceConfig) -> Result<IntegrationResponse, String> {
        let action = args["action"].as_str().unwrap_or("write");
        let api_key = config.api_key.as_ref().ok_or("Slack API key not configured")?;
        let client = Client::new();

        match action {
            "read" => {
                let channel = args["channel"].as_str().ok_or("Missing 'channel'")?;
                let response = client.get(format!("https://slack.com/api/conversations.history?channel={}", channel))
                    .bearer_auth(api_key)
                    .send()
                    .map_err(|e| format!("Slack read failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                let body: Value = response.json().map_err(|e| format!("Slack JSON parse error: {}", e))?;
                Ok(IntegrationResponse {
                    data: body,
                    summary: format!("### Slack History for {}\n\n{}", channel, serde_json::to_string_pretty(&body).unwrap())
                })
            }
            "write" => {
                let channel = args["channel"].as_str().ok_or("Missing 'channel'")?;
                let text = args["text"].as_str().ok_or("Missing 'text'")?;

                let response = client.post("https://slack.com/api/chat.postMessage")
                    .bearer_auth(api_key)
                    .json(&json!({ "channel": channel, "text": text }))
                    .send()
                    .map_err(|e| format!("Slack write failed: {}", e))?;

                if !response.status().is_success() {
                    return Err(handle_api_error(response.status(), &response.text().unwrap_or_default()));
                }

                Ok(IntegrationResponse {
                    data: json!({ "status": "success" }),
                    summary: format!("Successfully posted to Slack channel {}.", channel)
                })
            }
            _ => Err("Invalid action for Slack. Use 'read' or 'write'.".to_string()),
        }
    }
}

// --- Manager with Circuit Breaker ---

pub struct IntegrationManager {
    tools: HashMap<String, Arc<dyn ExternalTool>>,
    circuit_breakers: Mutex<HashMap<String, Instant>>,
}

impl IntegrationManager {
    pub fn new() -> Self {
        let mut manager = Self {
            tools: HashMap::new(),
            circuit_breakers: Mutex::new(HashMap::new()),
        };
        manager.register_tool("tavily", Arc::new(TavilyProvider));
        manager.register_tool("brave", Arc::new(BraveProvider));
        manager.register_tool("firecrawl", Arc::new(FirecrawlProvider));
        manager.register_tool("notion", Arc::new(NotionProvider));
        manager.register_tool("github", Arc::new(GitHubProvider));
        manager.register_tool("linear", Arc::new(LinearProvider));
        manager.register_tool("sentry", Arc::new(SentryProvider));
        manager.register_tool("datadog", Arc::new(DatadogProvider));
        manager.register_tool("slack", Arc::new(SlackProvider));
        manager
    }

    pub fn register_tool(&mut self, id: &str, tool: Arc<dyn ExternalTool>) {
        self.tools.insert(id.to_string(), tool);
    }

    pub fn execute_tool(
        &self,
        id: &str,
        args: Value,
        config: &ServiceConfig,
    ) -> Result<IntegrationResponse, String> {
        {
            let breakers = self.circuit_breakers.lock().unwrap();
            if let Some(last_fail) = breakers.get(id) {
                if last_fail.elapsed() < Duration::from_secs(60) {
                    return Err(format!("Integration '{}' is currently disabled due to repeated failures. Please try again in a minute.", id));
                }
            }
        }

        let tool = self.tools.get(id).ok_or_else(|| format!("Integration tool for '{}' not implemented", id))?;

        match tool.execute(args, config) {
            Ok(res) => Ok(res),
            Err(e) => {
                let mut breakers = self.circuit_breakers.lock().unwrap();
                breakers.insert(id.to_string(), Instant::now());
                Err(e)
            }
        }
    }
}

lazy_static::lazy_static! {
    pub static ref INTEGRATION_MANAGER: IntegrationManager = IntegrationManager::new();
}
