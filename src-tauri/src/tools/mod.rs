pub mod bash;
pub mod read;
pub mod write;
pub mod edit;
mod mutation;
pub mod guardrails;
pub mod search;
pub mod web;

use std::path::Path;
use serde_json::{json, Value};

/// Tool schemas supplied to the agent for this workspace.
/// These schemas are sent to Ollama / OpenAI-compatible models during function calling.
pub fn get_tool_definitions() -> Vec<Value> {
    let mut definitions = vec![
        json!({
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read UTF-8 text with 1-based line numbers. Output is bounded; follow continuation offsets. Read existing files in this session before editing or overwriting. Binary files and media are unsupported by this text tool.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "path": {
                            "type": "string",
                            "description": "Path to the file relative to workspace root"
                        },
                        "offset": {
                            "type": "integer",
                            "description": "Optional 1-indexed start line number", "minimum": 1
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Maximum lines to read (default 2000)", "minimum": 1, "maximum": 2000
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
                "description": "Create a file or replace its entire UTF-8 contents (10 MiB maximum). Read an existing file first in this session; stale replacements are rejected. Missing parent directories are created. Use edit_file for partial changes.",
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
                        },
                        "edits": {
                            "type": "array", "minItems": 1, "maxItems": 100,
                            "description": "Multiple disjoint replacements against the same original file. Use instead of old_text/new_text.",
                            "items": { "type": "object", "additionalProperties": false,
                                "properties": { "old_text": { "type": "string", "minLength": 1 }, "new_text": { "type": "string" } },
                                "required": ["old_text", "new_text"] }
                        }
                    },
                    "required": ["path"],
                    "oneOf": [{"required": ["edits"], "not": {"anyOf": [{"required": ["old_text"]}, {"required": ["new_text"]}]}}, {"required": ["old_text", "new_text"], "not": {"required": ["edits"]}}]
                }
            }
        }),
        json!({
            "type": "function",
            "function": {
                "name": "bash",
                "description": "Run a foreground sh command through SRT. Network is denied unless allowed_domains are explicitly approved; use dedicated web tools for browsing. Output is bounded with a retained log for large results; nonzero exits are errors.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "command": {
                            "type": "string",
                            "description": "Shell command to run (e.g. 'cargo test', 'npm install', 'git status')"
                        },
                        "allowed_domains": {"type":"array","items":{"type":"string"},"maxItems":32,"description":"Network hostnames needed by this command; requires approval. Defaults to no network."},
                        "workdir": { "type": "string", "description": "Working directory within the workspace; defaults to workspace root" },
                        "timeout_secs": {
                            "type": "integer",
                            "description": "Maximum seconds before timing out (default 120)", "minimum": 1, "maximum": 1800
                        }
                    },
                    "required": ["command"]
                }
            }
        }),

    ];
    definitions.extend(search::definitions());
    definitions.extend(web::definitions());
    definitions
}

/// Canonicalizes tool aliases to their primary definition name.
pub fn canonical_tool_name(name: &str) -> &str {
    match name {
        "read" | "read_file" => "read_file",
        "write" | "write_file" => "write_file",
        "edit" | "edit_file" => "edit_file",
        "bash" | "execute_bash" => "bash",
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

/// Describes the permission profile of a tool invocation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolActionType {
    ReadOnly,
    WriteFile,
    EditFile,
    ExecuteBash,
    MutateExternal,
}

/// Evaluates the permission category and UI classification for a tool call.
pub fn get_tool_action_type(tool_name: &str, arguments_json: &str) -> (ToolActionType, &'static str) {
    let canon = canonical_tool_name(tool_name);
    match canon {
        "read_file" | "read_pipeline_record" | "glob" | "grep" => (ToolActionType::ReadOnly, "read"),
        "write_file" => (ToolActionType::WriteFile, "write"),
        "edit_file" => (ToolActionType::EditFile, "edit"),
        "bash" if serde_json::from_str::<Value>(arguments_json).ok().is_some_and(|args| args["allowed_domains"].as_array().is_some_and(|d| !d.is_empty())) => (ToolActionType::MutateExternal, "bash"),
        "bash" => (ToolActionType::ExecuteBash, "bash"),
        "web_search" | "web_fetch" => (ToolActionType::MutateExternal, "web"),
        name if name.starts_with("mcp__") => (ToolActionType::MutateExternal, "external"),
        _ => (ToolActionType::MutateExternal, "unknown"),
    }
}

/// Dispatches and executes a tool call using the parsed JSON arguments.
pub fn execute_tool(
    workspace_root: &Path,
    tool_name: &str,
    arguments_json: &str,
) -> Result<String, String> {
    execute_tool_with_context(workspace_root, None, tool_name, arguments_json, None::<fn(u32)>)
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
    execute_tool_with_context(workspace_root, None, tool_name, arguments_json, on_pid)
}

/// Dispatches and executes a tool call with dynamic session context and optional PID tracking.
pub fn execute_tool_with_context<F>(
    workspace_root: &Path,
    session_id: Option<&str>,
    tool_name: &str,
    arguments_json: &str,
    on_pid: Option<F>,
) -> Result<String, String>
where
    F: FnOnce(u32),
{
    execute_tool_with_context_and_output(workspace_root, session_id, tool_name, arguments_json, on_pid, None)
}

pub fn execute_tool_with_context_and_output<F>(
    workspace_root: &Path,
    session_id: Option<&str>,
    tool_name: &str,
    arguments_json: &str,
    on_pid: Option<F>,
    on_output: Option<&mut dyn FnMut(&str)>,
) -> Result<String, String>
where F: FnOnce(u32),
{
    let args: Value = serde_json::from_str(arguments_json)
        .map_err(|e| format!("Invalid JSON arguments for tool '{}': {}", tool_name, e))?;

    let canon = canonical_tool_name(tool_name);
    validate_core_arguments(canon, &args)?;
    let cancelled = session_id.map(|id| crate::agent::get_or_create_session(id).lock().unwrap().cancelled.clone());
    if cancelled.as_ref().is_some_and(|flag| flag.load(std::sync::atomic::Ordering::SeqCst)) { return Err("Tool execution cancelled".into()); }
    match canon {
        "glob" | "grep" => search::execute(workspace_root, canon, &args, cancelled.as_deref()),
        "web_search" | "web_fetch" => web::execute(canon, &args, cancelled.unwrap_or_else(|| std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)))),
        "read_file" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let integer = |name: &str| -> Result<Option<usize>, String> {
                args.get(name).map(|value| value.as_u64().and_then(|v| usize::try_from(v).ok())
                    .ok_or_else(|| format!("{name} must be a positive integer"))).transpose()
            };
            let offset = integer("offset")?;
            let limit = integer("limit")?;

            read::read_file(workspace_root, session_id.unwrap_or("direct"), path, offset, limit, cancelled.as_deref())
        }
        "write_file" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let content = args["content"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'content'".to_string())?;

            write::write_file(workspace_root, session_id.unwrap_or("direct"), path, content, cancelled.as_deref())
        }
        "edit_file" => {
            let path = args["path"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'path'".to_string())?;
            let replacements = if let Some(edits) = args.get("edits") {
                serde_json::from_value::<Vec<edit::Replacement>>(edits.clone()).map_err(|e| format!("Invalid edits: {e}"))?
            } else {
            let old_text = args["old_text"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'old_text'".to_string())?;
            let new_text = args["new_text"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'new_text'".to_string())?;

                vec![edit::Replacement { old_text: old_text.into(), new_text: new_text.into() }]
            };
            edit::edit_file(workspace_root, session_id.unwrap_or("direct"), path, &replacements, cancelled.as_deref())
        }
        "bash" => {
            let command = args["command"]
                .as_str()
                .ok_or_else(|| "Missing required parameter 'command'".to_string())?;
            let timeout = args.get("timeout_secs").map(|value| value.as_u64().ok_or("timeout_secs must be an integer")).transpose()?;

            let res = bash::execute_bash_with_options(workspace_root, args["workdir"].as_str(), command, timeout, &serde_json::from_value::<Vec<String>>(args.get("allowed_domains").cloned().unwrap_or_else(|| json!([]))).map_err(|_| "allowed_domains must be a string array")?, on_pid, on_output)?;
            if res.timed_out || res.exit_code != Some(0) {
                Err(res.output)
            } else {
                Ok(res.output)
            }
        }
        "read_pipeline_record" => crate::orchestrator::read_record(workspace_root,session_id.ok_or("Session ID is required")?,&args),
        mcp_tool if mcp_tool.starts_with("mcp__") => {
            let parts: Vec<&str> = mcp_tool.splitn(3, "__").collect();
            if parts.len() != 3 {
                return Err(format!("Malformed MCP tool call format: '{}'", mcp_tool));
            }
            let server_id = parts[1];
            let actual_tool_name = parts[2];

            let active_sess_id = session_id.unwrap_or("current_turn");
            let session = crate::agent::get_or_create_session(active_sess_id);
            let server_config = {
                let guard = session.lock().unwrap();
                guard.mcp_servers.iter().find(|s| s.id == server_id).cloned()
            };

            let config = server_config.ok_or_else(|| {
                format!("MCP server '{}' not configured for this session", server_id)
            })?;

            crate::mcp::call(&config, workspace_root.to_str().ok_or("Workspace path must be UTF-8")?, actual_tool_name, args, cancelled.unwrap_or_else(|| std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false))))
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
        // None -> returns all tools
        let all = get_filtered_tool_definitions(None);
        assert_eq!(all.len(), 8);

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

    #[test]
    fn test_get_tool_action_type() {
        assert_eq!(get_tool_action_type("read_file", "{}"), (ToolActionType::ReadOnly, "read"));
        assert_eq!(get_tool_action_type("write_file", "{}"), (ToolActionType::WriteFile, "write"));
        assert_eq!(get_tool_action_type("edit_file", "{}"), (ToolActionType::EditFile, "edit"));
        assert_eq!(get_tool_action_type("bash", "{}"), (ToolActionType::ExecuteBash, "bash"));
        assert_eq!(get_tool_action_type("bash", r#"{"allowed_domains":["example.com"]}"#), (ToolActionType::MutateExternal, "bash"));

    }
}

/// Validate core tool inputs before approval and again before dispatch.
pub fn validate_core_arguments(name: &str, args: &Value) -> Result<(), String> {
    let name = canonical_tool_name(name);
    if matches!(name, "glob" | "grep") { return search::validate(name, args); }
    if matches!(name, "web_search" | "web_fetch") { return web::validate(name, args); }
    if !matches!(name, "read_file" | "write_file" | "edit_file" | "bash") { return Ok(()); }
    let object = args.as_object().ok_or("Tool arguments must be an object")?;
    let allowed: &[&str] = match name {
        "read_file" => &["path", "offset", "limit"],
        "write_file" => &["path", "content"],
        "edit_file" => &["path", "old_text", "new_text", "edits"],
        _ => &["command", "timeout_secs", "workdir", "allowed_domains"],
    };
    if let Some(key) = object.keys().find(|key| !allowed.contains(&key.as_str())) { return Err(format!("Unsupported {name} parameter: {key}")); }
    let required = if name == "bash" { "command" } else { "path" };
    if args[required].as_str().is_none_or(|v| v.trim().is_empty()) { return Err(format!("{required} must be a nonempty string")); }
    for (key, max) in [("offset", usize::MAX as u64), ("limit", 2000), ("timeout_secs", 1800)] {
        if let Some(value) = args.get(key) {
            if value.as_u64().is_none_or(|v| v == 0 || v > max) { return Err(format!("{key} must be an integer between 1 and {max}")); }
        }
    }
    if let Some(domains) = args.get("allowed_domains") {
        let domains: Vec<String> = serde_json::from_value(domains.clone()).map_err(|_| "allowed_domains must be a string array")?;
        crate::sandbox::validate_domains(&domains)?;
    }
    if let Some(workdir) = args.get("workdir") {
        if workdir.as_str().is_none_or(|s| s.trim().is_empty()) { return Err("workdir must be a nonempty string".into()); }
    }
    if name == "write_file" && args["content"].as_str().is_none() { return Err("content must be a string".into()); }
    if name == "edit_file" {
        if let Some(edits) = args.get("edits") {
            if args.get("old_text").is_some() || args.get("new_text").is_some() { return Err("Use edits OR old_text/new_text, not both".into()); }
            let edits: Vec<edit::Replacement> = serde_json::from_value(edits.clone()).map_err(|e| e.to_string())?;
            if edits.is_empty() || edits.len() > 100 || edits.iter().any(|e| e.old_text.is_empty()) { return Err("Provide 1..100 nonempty replacements".into()); }
        } else if args["old_text"].as_str().is_none_or(str::is_empty) || args["new_text"].as_str().is_none() {
            return Err("old_text must be nonempty and new_text must be a string".into());
        }
    }
    Ok(())
}

pub fn forget_file_observations(session_id: &str) { mutation::forget_session(session_id); }

#[cfg(test)]
mod core_tests;
