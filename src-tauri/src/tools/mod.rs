pub mod bash;
pub mod file_ops;
pub mod guardrails;

use std::path::Path;
use serde_json::{json, Value};

/// Generates the standard JSON schemas for the 4 core developer tools.
/// These schemas are sent to Ollama / OpenAI-compatible models during function calling.
pub fn get_tool_definitions() -> Vec<Value> {
    vec![
        json!({
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read the contents of a file within the workspace.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to the file relative to workspace root"
                        },
                        "offset": {
                            "type": "integer",
                            "description": "Optional 1-indexed start line number"
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Optional maximum number of lines to read"
                        }
                    },
                    "required": ["path"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "write_file",
                "description": "Create a new file or completely overwrite an existing file with new content. Parent directories will be created automatically.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to the file relative to workspace root"
                        },
                        "content": {
                            "type": "string",
                            "description": "Full file content to write"
                        }
                    },
                    "required": ["path", "content"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "edit_file",
                "description": "Surgically edit an existing file by replacing old_text with new_text. old_text must match existing file content exactly, including whitespace and indentation, and must appear exactly once in the file.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to the file relative to workspace root"
                        },
                        "old_text": {
                            "type": "string",
                            "description": "The exact existing text snippet to replace (must match exactly once)"
                        },
                        "new_text": {
                            "type": "string",
                            "description": "The new replacement text"
                        }
                    },
                    "required": ["path", "old_text", "new_text"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "bash",
                "description": "Execute a shell command within the workspace directory.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "Shell command to run (e.g. 'cargo test', 'npm install', 'git status')"
                        },
                        "timeout_secs": {
                            "type": "integer",
                            "description": "Optional maximum seconds before timing out (defaults to 60, hard capped at 300)"
                        }
                    },
                    "required": ["command"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "ocr_extract",
                "description": "Extract text from an image. This tool signals the model to perform a specialized OCR analysis on the provided image reference.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "image_ref": {
                            "type": "string",
                            "description": "The reference ID of the attached image to perform OCR on"
                        },
                        "focus_area": {
                            "type": "string",
                            "description": "Optional description of the specific area or text to extract"
                        }
                    },
                    "required": ["image_ref"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "web_search",
                "description": "Search the web for real-time information, technical docs, or news using the best available provider (Tavily, Brave, etc.).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query to execute"
                        },
                        "provider": {
                            "type": "string",
                            "description": "Optional provider override (e.g. 'tavily', 'brave', 'exa'). If omitted, the user's default is used."
                        }
                    },
                    "required": ["query"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "web_extract",
                "description": "Extract full-page content as clean Markdown from a specific URL using Firecrawl.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "url": {
                            "type": "string",
                            "description": "The URL of the page to scrape"
                        }
                    },
                    "required": ["url"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "knowledge_search",
                "description": "Search and retrieve internal knowledge base pages (e.g. from Notion).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "action": {
                            "type": "string",
                            "enum": ["read", "write"],
                            "description": "Whether to read a page or append content to one."
                        },
                        "page_id": {
                            "type": "string",
                            "description": "The ID of the page to interact with"
                        },
                        "content": {
                            "type": "string",
                            "description": "Content to append (required if action is 'write')"
                        }
                    },
                    "required": ["action", "page_id"]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "dev_ops",
                "description": "Manage external development tools (GitHub, Linear, Sentry, Datadog). Use this for issue triaging, PR management, or checking metrics.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "service": {
                            "type": "string",
                            "enum": ["github", "linear", "sentry", "datadog"],
                            "description": "The service to interact with"
                        },
                        "action": {
                            "type": "string",
                            "enum": ["read", "write"],
                            "description": "Whether to fetch data or perform a modification"
                        },
                        "params": {
                            "type": "object",
                            "description": "Service-specific parameters (e.g. { 'endpoint': '/repos/owner/repo/issues' } for GitHub read, or { 'query': '...' } for Datadog)"
                        }
                    },
                    "required": ["service", "action", "params"]
                }
            }
        })
    ]
}

/// Canonicalizes tool aliases to their primary definition name.
pub fn canonical_tool_name(name: &str) -> &str {
    match name {
        "read" | "read_file" => "read_file",
        "write" | "write_file" => "write_file",
        "edit" | "edit_file" => "edit_file",
        "bash" | "execute_bash" => "bash",
        "ocr" | "ocr_extract" => "ocr_extract",
        "search" | "web_search" => "web_search",
        "extract" | "web_extract" => "web_extract",
        "knowledge" | "knowledge_search" => "knowledge_search",
        "ops" | "dev_ops" => "dev_ops",
        other => other,
    }
}

/// Checks whether a tool (or any of its known aliases) is in the allowed list.
pub fn is_tool_allowed(tool_name: &str, allowed_tools: &[String]) -> bool {
    let canon = canonical_tool_name(tool_name);
    allowed_tools.iter().any(|allowed| {
        canonical_tool_name(allowed) == canon
    })
}

/// Returns tool definitions filtered by an optional allowed_tools list.
/// If allowed_tools is None, all tool definitions are returned.
pub fn get_filtered_tool_definitions(allowed_tools: Option<&[String]>) -> Vec<Value> {
    let all = get_tool_definitions();
    match allowed_tools {
        None => all,
        Some(allowed) => all
            .into_iter()
            .filter(|t| {
                t.get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|n| n.as_str())
                    .map(|name| is_tool_allowed(name, allowed))
                    .unwrap_or(false)
            })
            .collect(),
    }
}

/// Dispatches and executes a tool call using the parsed JSON arguments.
pub fn execute_tool(
    workspace_root: &Path,
    tool_name: &str,
    arguments_json: &str,
) -> Result<String, String> {
    execute_tool_with_pid_callback(workspace_root, tool_name, arguments_json, None::<fn(u32)>)
}

/// Dispatches and executes a tool call, optionally passing child process PID to a callback (e.g. for bash).
pub fn execute_tool_with_pid_callback<F>(
    workspace_root: &Path,
    tool_name: &str,
    arguments_json: &str,
    on_pid: Option<F>,
) -> Result<String, String>
where
    F: FnOnce(u32),
{
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|e| format!("Invalid JSON arguments for tool '{}': {}", tool_name, e))?;

    match tool_name {
        "read_file" | "read" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let offset = args["offset"].as_u64().map(|v| v as usize);
            let limit = args["limit"].as_u64().map(|v| v as usize);

            file_ops::read_file(workspace_root, path, offset, limit)
        }
        "write_file" | "write" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let content = args["content"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'content'".to_string())?;

            file_ops::write_file(workspace_root, path, content)
        }
        "edit_file" | "edit" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let old_text = args["old_text"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'old_text'".to_string())?;
            let new_text = args["new_text"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'new_text'".to_string())?;

            file_ops::edit_file(workspace_root, path, old_text, new_text)
        }
        "bash" | "execute_bash" => {
            let command = args["command"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'command'".to_string())?;
            let timeout = args["timeout_secs"].as_u64();

            let res = bash::execute_bash_with_pid_callback(workspace_root, command, timeout, on_pid)?;
            if res.timed_out {
                Err(res.output)
            } else {
                Ok(res.output)
            }
        }
        "ocr_extract" | "ocr" => {
            let image_ref = args["image_ref"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'image_ref'".to_string())?;

            Ok(format!(
                "OCR request received for image {}. Since OCR is handled by the model's own vision capabilities, the system will now perform a specialized extraction turn. Please extract all text from this image accurately.",
                image_ref
            ))
        }
        "web_search" | "search" => {
            let query = args["query"].as_str().ok_or("Missing 'query' parameter")?;
            let provider_id = args["provider"].as_str().unwrap_or("tavily");

            // Integration config is stored in the current session state
            // We must retrieve it from agent::get_or_create_session
            let session = crate::agent::get_or_create_session("current_turn");
            let guard = session.lock().unwrap();
            let config = guard.integrations.get(provider_id)
                .ok_or_else(|| format!("Search provider '{}' not configured", provider_id))?;

            let res = crate::integrations::INTEGRATION_MANAGER.execute_tool(provider_id, args, config)?;
            Ok(res.to_agent_string())
        }
        "web_extract" | "extract" => {
            let config = {
                let session = crate::agent::get_or_create_session("current_turn");
                let guard = session.lock().unwrap();
                guard.integrations.get("firecrawl")
                    .cloned()
                    .ok_or_else(|| "Firecrawl not configured".to_string())?
            };
            let res = crate::integrations::INTEGRATION_MANAGER.execute_tool("firecrawl", args, &config)?;
            Ok(res.to_agent_string())
        }
        "knowledge_search" | "knowledge" => {
            let config = {
                let session = crate::agent::get_or_create_session("current_turn");
                let guard = session.lock().unwrap();
                guard.integrations.get("notion")
                    .cloned()
                    .ok_or_else(|| "Notion not configured".to_string())?
            };
            let res = crate::integrations::INTEGRATION_MANAGER.execute_tool("notion", args, &config)?;
            Ok(res.to_agent_string())
        }
        "dev_ops" | "ops" => {
            let service = args["service"].as_str().ok_or("Missing 'service' parameter")?;
            let config = {
                let session = crate::agent::get_or_create_session("current_turn");
                let guard = session.lock().unwrap();
                guard.integrations.get(service)
                    .cloned()
                    .ok_or_else(|| format!("Service '{}' not configured", service))?
            };
            let res = crate::integrations::INTEGRATION_MANAGER.execute_tool(service, args["params"].clone(), &config)?;
            Ok(res.to_agent_string())
        }
        unknown => Err(format!("Unrecognized tool: '{}'", unknown)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canonical_tool_names() {
        assert_eq!(canonical_tool_name("read"), "read_file");
        assert_eq!(canonical_tool_name("read_file"), "read_file");
        assert_eq!(canonical_tool_name("write"), "write_file");
        assert_eq!(canonical_tool_name("write_file"), "write_file");
        assert_eq!(canonical_tool_name("edit"), "edit_file");
        assert_eq!(canonical_tool_name("edit_file"), "edit_file");
        assert_eq!(canonical_tool_name("bash"), "bash");
        assert_eq!(canonical_tool_name("execute_bash"), "bash");
        assert_eq!(canonical_tool_name("other"), "other");
    }

    #[test]
    fn test_is_tool_allowed() {
        let allowed = vec!["read".to_string(), "bash".to_string()];
        assert!(is_tool_allowed("read_file", &allowed));
        assert!(is_tool_allowed("read", &allowed));
        assert!(is_tool_allowed("bash", &allowed));
        assert!(is_tool_allowed("execute_bash", &allowed));
        assert!(!is_tool_allowed("write_file", &allowed));
        assert!(!is_tool_allowed("edit_file", &allowed));
    }

    #[test]
    fn test_get_filtered_tool_definitions() {
        // None -> returns all 4 tools
        let all = get_filtered_tool_definitions(None);
        assert_eq!(all.len(), 4);

        // Filter for only read
        let read_only = vec!["read".to_string()];
        let filtered = get_filtered_tool_definitions(Some(&read_only));
        assert_eq!(filtered.len(), 1);
        let name = filtered[0]["function"]["name"].as_str().unwrap();
        assert_eq!(name, "read_file");

        // Filter for read and bash
        let read_and_bash = vec!["read_file".to_string(), "bash".to_string()];
        let filtered2 = get_filtered_tool_definitions(Some(&read_and_bash));
        assert_eq!(filtered2.len(), 2);
        let names: Vec<&str> = filtered2
            .iter()
            .map(|t| t["function"]["name"].as_str().unwrap())
            .collect();
        assert!(names.contains(&"read_file"));
        assert!(names.contains(&"bash"));
        assert!(!names.contains(&"write_file"));
        assert!(!names.contains(&"edit_file"));

        // Empty allowed list -> 0 tools
        let empty: Vec<String> = vec![];
        let filtered_empty = get_filtered_tool_definitions(Some(&empty));
        assert_eq!(filtered_empty.len(), 0);
    }
}
