use crate::provider::ChatMessage;
use serde_json::Value;

fn estimated_tokens(messages: &[ChatMessage], tools: Option<&[Value]>) -> Result<usize, String> {
    // Byte-based upper estimate for text, not a claim of exact tokenizer usage.
    let messages = serde_json::to_vec(messages).map_err(|e| e.to_string())?;
    let tools = serde_json::to_vec(&tools).map_err(|e| e.to_string())?;
    Ok(messages
        .len()
        .saturating_add(tools.len())
        .saturating_add(256))
}

pub(crate) fn capacity(window: Option<usize>, output: Option<u32>) -> Result<usize, String> {
    let window =
        window.ok_or("Supply the model runner's active context_window before running the agent")?;
    let reserve = output.unwrap_or(2048) as usize;
    if reserve == 0 || reserve >= window {
        return Err("max_tokens must be positive and smaller than context_window".into());
    }
    Ok(window - reserve)
}

pub(super) fn prepare(
    messages: &mut Vec<ChatMessage>,
    tools: Option<&[Value]>,
    window: Option<usize>,
    output: Option<u32>,
) -> Result<usize, String> {
    let budget = capacity(window, output)?;
    let mut omitted = 0;
    while estimated_tokens(messages, tools)? > budget {
        let user_indices: Vec<_> = messages
            .iter()
            .enumerate()
            .filter(|(_, m)| m.role == "user")
            .map(|(i, _)| i)
            .collect();
        if user_indices.len() > 1 {
            let range = user_indices[0]..user_indices[1];
            omitted += range.len();
            messages.drain(range);
            continue;
        }
        // Remove an entire settled assistant/tool exchange, never half of one.
        let rounds: Vec<_> = messages
            .iter()
            .enumerate()
            .filter(|(_, m)| {
                m.role == "assistant" && m.tool_calls.as_ref().is_some_and(|c| !c.is_empty())
            })
            .map(|(i, _)| i)
            .collect();
        if rounds.len() > 1 {
            let start = rounds[0];
            let end = rounds[1];
            validate_pairs(&messages[start..end])?;
            omitted += end - start;
            messages.drain(start..end);
            continue;
        }
        return Err("Current instructions, task, tools and latest tool exchange exceed the context budget; increase the active context window or reduce the task/tool set".into());
    }
    if omitted > 0 {
        let notice = ChatMessage::system("[Context notice] Older conversation or completed tool exchanges were omitted to fit the context window. Their records remain in session storage. Re-read evidence you need; do not assume omitted findings.");
        if !messages.iter().any(|message| {
            message.role == "system" && message.content.as_text().starts_with("[Context notice]")
        }) {
            messages.insert(1.min(messages.len()), notice);
        }
        if estimated_tokens(messages, tools)? > budget {
            return Err("Context budget cannot fit the task plus omission notice".into());
        }
    }
    validate_pairs(messages)?;
    Ok(omitted)
}

pub(super) fn validate_pairs(messages: &[ChatMessage]) -> Result<(), String> {
    let mut pending = std::collections::HashSet::new();
    for message in messages {
        if message.role == "tool" {
            let id = message
                .tool_call_id
                .as_deref()
                .ok_or("Tool result has no call ID")?;
            if !pending.remove(id) {
                return Err("Orphan or duplicate tool result in conversation".into());
            }
        } else {
            if !pending.is_empty() {
                return Err("Conversation contains unfinished tool calls; recover the interrupted run before continuing".into());
            }
            if let Some(calls) = &message.tool_calls {
                for call in calls {
                    let id = call["id"].as_str().ok_or("Tool call has no ID")?;
                    if !pending.insert(id) {
                        return Err("Duplicate tool call ID in assistant message".into());
                    }
                }
            }
        }
    }
    if pending.is_empty() {
        Ok(())
    } else {
        Err("Conversation ends with unanswered tool calls".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn whole_turns_are_removed_without_losing_instructions_or_latest_task() {
        let mut messages = vec![
            ChatMessage::system("project instructions"),
            ChatMessage::user_text("x".repeat(5000)),
            ChatMessage::assistant_text("old answer"),
            ChatMessage::user_text("current task"),
        ];
        assert!(prepare(&mut messages, None, Some(2048), Some(256)).unwrap() > 0);
        assert_eq!(messages[0].content.as_text(), "project instructions");
        assert_eq!(messages.last().unwrap().content.as_text(), "current task");
        assert!(messages
            .iter()
            .any(|m| m.content.as_text().contains("omitted")));
    }

    #[test]
    fn context_pruning_keeps_tool_batches_and_results_together() {
        let batch = |id: &str| ChatMessage {
            role: "assistant".into(),
            content: "".into(),
            tool_call_id: None,
            tool_calls: Some(vec![
                json!({"id":id,"type":"function","function":{"name":"read_file","arguments":"{}"}}),
            ]),
        };
        let result = |id: &str, text: String| ChatMessage {
            role: "tool".into(),
            content: text.into(),
            tool_calls: None,
            tool_call_id: Some(id.into()),
        };
        let mut messages = vec![
            ChatMessage::system("instructions"),
            ChatMessage::user_text("task"),
            batch("old"),
            result("old", "x".repeat(5000)),
            batch("latest"),
            result("latest", "evidence".into()),
        ];
        assert!(prepare(&mut messages, None, Some(2048), Some(256)).unwrap() > 0);
        validate_pairs(&messages).unwrap();
        assert!(!messages
            .iter()
            .any(|m| m.tool_call_id.as_deref() == Some("old")));
        assert_eq!(
            messages.last().unwrap().tool_call_id.as_deref(),
            Some("latest")
        );
    }

    #[test]
    fn tool_schemas_and_output_reserve_are_included_in_budget() {
        let mut messages = vec![
            ChatMessage::system("instructions"),
            ChatMessage::user_text("task"),
        ];
        let tools = vec![
            json!({"type":"function","function":{"name":"read_file","description":"x".repeat(4000)}}),
        ];
        assert!(prepare(&mut messages, Some(&tools), Some(2048), Some(256)).is_err());
    }

    #[test]
    fn oversized_instructions_and_unfinished_calls_are_not_silently_discarded() {
        let mut messages = vec![
            ChatMessage::system("x".repeat(4000)),
            ChatMessage::user_text("task"),
        ];
        assert!(prepare(&mut messages, None, Some(2048), Some(256)).is_err());
        assert!(prepare(&mut messages, None, None, Some(256)).is_err());
        let message = ChatMessage {
            role: "assistant".into(),
            content: "".into(),
            tool_calls: Some(vec![json!({"id":"a"})]),
            tool_call_id: None,
        };
        assert!(validate_pairs(&[message]).is_err());
    }
}
