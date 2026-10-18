use super::{
    AssembledToolCall, ChatMessage, CompletionReason, CompletionResponse, ContentPart,
    MessageContent, ProviderConfig, StreamChunk, ThinkTagParser,
};
use serde_json::{json, Value};

pub(super) fn payload(
    config: &ProviderConfig,
    messages: &[ChatMessage],
    tools: Option<&[Value]>,
) -> Result<Value, String> {
    let mut history = Vec::new();
    let mut tool_names = std::collections::HashMap::new();
    for message in messages {
        let mut row = json!({"role":message.role,"content":message.content.as_text()});
        if let MessageContent::Parts(parts) = &message.content {
            let mut images = Vec::new();
            for part in parts {
                match part {
                    ContentPart::Text { .. } => {}
                    ContentPart::ImageUrl { image_url } => {
                        let (_, bytes) = image_url.url.split_once(',').filter(|(header, _)| header.starts_with("data:image/") && header.ends_with(";base64"))
                            .ok_or("Ollama image input requires an inline base64 image; remote media URLs are not supported by this adapter")?;
                        use base64::Engine;
                        base64::engine::general_purpose::STANDARD
                            .decode(bytes)
                            .map_err(|_| "Invalid base64 image")?;
                        images.push(bytes);
                    }
                    _ => {
                        return Err(
                            "This provider adapter does not support audio or video input".into(),
                        )
                    }
                }
            }
            if !images.is_empty() {
                row["images"] = json!(images);
            }
        }
        if let Some(calls) = &message.tool_calls {
            let mut native = Vec::new();
            for call in calls {
                let id = call["id"].as_str().ok_or("Missing tool call ID")?;
                let name = call["function"]["name"]
                    .as_str()
                    .ok_or("Missing tool call name")?;
                let args: Value = serde_json::from_str(
                    call["function"]["arguments"]
                        .as_str()
                        .ok_or("Tool arguments must be JSON text")?,
                )
                .map_err(|_| "Invalid tool argument JSON")?;
                if !args.is_object() {
                    return Err("Tool arguments must be an object".into());
                }
                tool_names.insert(id, name);
                native.push(
                    json!({"id":id,"type":"function","function":{"name":name,"arguments":args}}),
                );
            }
            row["tool_calls"] = json!(native);
        }
        if message.role == "tool" {
            let id = message
                .tool_call_id
                .as_deref()
                .ok_or("Missing tool result ID")?;
            row["tool_name"] = json!(tool_names
                .get(id)
                .ok_or("Tool result has no matching assistant call")?);
            row["tool_call_id"] = json!(id);
        }
        history.push(row);
    }
    let mut result = json!({"model":config.model,"messages":history,"stream":true,"truncate":false,"shift":false,
        "options":{"num_ctx":config.context_window.ok_or("Ollama requires an explicit active context allocation")?,"num_predict":config.max_tokens.unwrap_or(2048)}});
    if let Some(temperature) = config.temperature {
        result["options"]["temperature"] = json!(temperature);
    }
    if let Some(tools) = tools.filter(|t| !t.is_empty()) {
        result["tools"] = json!(tools);
    }
    Ok(result)
}

#[derive(Default)]
pub(super) struct OllamaStream {
    buffer: Vec<u8>,
    received: usize,
    seen: bool,
    done: bool,
    reason: Option<CompletionReason>,
    calls: Vec<AssembledToolCall>,
    think: ThinkTagParser,
}
impl OllamaStream {
    pub fn has_response(&self) -> bool {
        self.seen
    }
    pub fn feed(
        &mut self,
        bytes: &[u8],
        emit: &mut impl FnMut(StreamChunk),
    ) -> Result<bool, String> {
        self.received = self.received.saturating_add(bytes.len());
        if self.received > 16 * 1024 * 1024 {
            return Err("Ollama response exceeded 16 MiB".into());
        }
        self.buffer.extend_from_slice(bytes);
        while let Some(end) = self.buffer.iter().position(|&b| b == b'\n') {
            if end > 1024 * 1024 {
                return Err("Ollama frame exceeded 1 MiB".into());
            }
            let line: Vec<_> = self.buffer.drain(..=end).collect();
            if line.iter().all(u8::is_ascii_whitespace) {
                continue;
            }
            self.event(&line, emit)?;
        }
        if self.buffer.len() > 1024 * 1024 {
            return Err("Ollama frame exceeded 1 MiB".into());
        }
        Ok(self.done)
    }
    fn event(&mut self, bytes: &[u8], emit: &mut impl FnMut(StreamChunk)) -> Result<(), String> {
        if self.done {
            return Err("Ollama emitted content after completion".into());
        }
        let frame: Value =
            serde_json::from_slice(bytes).map_err(|_| "Malformed Ollama stream JSON")?;
        if frame.get("error").is_some() {
            return Err("Ollama reported a generation error; inspect the runner logs".into());
        }
        let done = frame["done"]
            .as_bool()
            .ok_or("Ollama response is missing done flag")?;
        let message = frame
            .get("message")
            .filter(|m| m.is_object())
            .ok_or("Ollama response is missing its message")?;
        self.seen = true;
        if let Some(thinking) = message["thinking"].as_str().filter(|s| !s.is_empty()) {
            emit(StreamChunk::Thinking(thinking.into()));
        }
        if let Some(text) = message["content"].as_str() {
            for chunk in self.think.parse(text) {
                emit(chunk);
            }
        }
        if let Some(calls) = message.get("tool_calls") {
            for call in calls
                .as_array()
                .ok_or("Ollama tool_calls is not an array")?
            {
                let function = &call["function"];
                let name = function["name"]
                    .as_str()
                    .filter(|s| !s.is_empty())
                    .ok_or("Ollama returned a tool without a name")?;
                let args = function
                    .get("arguments")
                    .filter(|v| v.is_object())
                    .ok_or("Ollama tool arguments must be a complete JSON object")?;
                let id = match call.get("id") {
                    None | Some(Value::Null) => {
                        format!("ollama-{}", crate::storage::event::generate_event_id())
                    }
                    Some(value) => value
                        .as_str()
                        .filter(|s| !s.is_empty())
                        .ok_or("Ollama returned an invalid tool ID")?
                        .into(),
                };
                if self.calls.iter().any(|c| c.id == id) {
                    return Err("Ollama returned duplicate tool IDs".into());
                }
                self.calls.push(AssembledToolCall {
                    id,
                    name: name.into(),
                    arguments: args.to_string(),
                });
            }
        }
        if done {
            self.reason = Some(match frame["done_reason"].as_str() {
                Some("stop") => {
                    if self.calls.is_empty() {
                        CompletionReason::Stop
                    } else {
                        CompletionReason::ToolCalls
                    }
                }
                Some("length") => CompletionReason::Length,
                _ => {
                    return Err(
                        "Ollama returned an unsupported or missing completion reason".into(),
                    )
                }
            });
            self.done = true;
        }
        Ok(())
    }
    pub fn finish(
        mut self,
        emit: &mut impl FnMut(StreamChunk),
    ) -> Result<CompletionResponse, String> {
        if self.buffer.iter().any(|b| !b.is_ascii_whitespace()) {
            let remaining = std::mem::take(&mut self.buffer);
            self.event(&remaining, emit)?;
        }
        let reason = self
            .reason
            .ok_or("Ollama stream ended without a completion reason")?;
        if let Some(chunk) = self.think.flush() {
            emit(chunk);
        }
        emit(StreamChunk::Finished(reason));
        if reason == CompletionReason::Length {
            return Err(
                "Ollama output limit reached; incomplete tool calls were not executed".into(),
            );
        }
        for call in &self.calls {
            emit(StreamChunk::ToolCall(call.clone()));
        }
        emit(StreamChunk::Done);
        Ok(CompletionResponse {
            tool_calls: self.calls,
            reason,
        })
    }
}
