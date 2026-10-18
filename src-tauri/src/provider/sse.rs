use super::{
    CompletionReason, CompletionResponse, StreamChunk, ThinkTagParser, ToolCallAccumulator,
};
use serde_json::Value;

const MAX_FRAME_BYTES: usize = 1024 * 1024;
const MAX_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

#[derive(Default)]
pub(super) struct CompletionStream {
    buffer: Vec<u8>,
    data: String,
    think: ThinkTagParser,
    tools: ToolCallAccumulator,
    reason: Option<CompletionReason>,
    done: bool,
    received: usize,
    seen_response: bool,
}

impl CompletionStream {
    pub fn has_response(&self) -> bool {
        self.seen_response
    }
    pub fn feed(
        &mut self,
        bytes: &[u8],
        emit: &mut impl FnMut(StreamChunk),
    ) -> Result<bool, String> {
        self.received = self.received.saturating_add(bytes.len());
        if self.received > MAX_RESPONSE_BYTES {
            return Err("Model response exceeded 16 MiB".into());
        }
        self.buffer.extend_from_slice(bytes);
        while let Some(end) = self.buffer.iter().position(|&byte| byte == b'\n') {
            if end > MAX_FRAME_BYTES {
                return Err("SSE line exceeded 1 MiB".into());
            }
            let line = std::str::from_utf8(&self.buffer[..end])
                .map_err(|_| "Invalid UTF-8 in model stream")?
                .trim_end_matches('\r')
                .to_owned();
            self.buffer.drain(..=end);
            if line.is_empty() {
                if !self.data.is_empty() {
                    let data = std::mem::take(&mut self.data);
                    self.event(data.trim_end_matches('\n'), emit)?;
                    if self.done {
                        return Ok(true);
                    }
                }
            } else if let Some(value) = line.strip_prefix("data:") {
                self.data.push_str(value.strip_prefix(' ').unwrap_or(value));
                self.data.push('\n');
                if self.data.len() > MAX_FRAME_BYTES {
                    return Err("SSE event exceeded 1 MiB".into());
                }
            }
        }
        if self.buffer.len() > MAX_FRAME_BYTES {
            return Err("SSE line exceeded 1 MiB".into());
        }
        Ok(self.done)
    }

    fn event(&mut self, data: &str, emit: &mut impl FnMut(StreamChunk)) -> Result<(), String> {
        if data == "[DONE]" {
            self.done = true;
            return Ok(());
        }
        let frame: Value =
            serde_json::from_str(data).map_err(|e| format!("Malformed model SSE JSON: {e}"))?;
        if let Some(error) = frame.get("error") {
            return Err(format!("Model runner error: {error}"));
        }
        let choices = frame
            .get("choices")
            .and_then(Value::as_array)
            .ok_or("Missing choices in model response")?;
        let Some(choice) = choices.first() else {
            return Ok(());
        };
        if self.reason.is_some() {
            return Err("Model emitted content after its finish reason".into());
        }
        self.seen_response = true;
        let delta = &choice["delta"];
        if let Some(reasoning) = delta["reasoning_content"]
            .as_str()
            .or_else(|| delta["reasoning"].as_str())
        {
            if !reasoning.is_empty() {
                emit(StreamChunk::Thinking(reasoning.into()));
            }
        }
        if let Some(content) = delta["content"].as_str() {
            for chunk in self.think.parse(content) {
                emit(chunk);
            }
        }
        if let Some(calls) = delta["tool_calls"].as_array() {
            for call in calls {
                if call["index"].as_u64().is_none() {
                    return Err("Tool delta is missing its index".into());
                }
                self.tools.update(call);
            }
        }
        if let Some(reason) = choice["finish_reason"].as_str() {
            self.reason = Some(match reason {
                "stop" => CompletionReason::Stop,
                "tool_calls" => CompletionReason::ToolCalls,
                "length" => CompletionReason::Length,
                "content_filter" => CompletionReason::ContentFilter,
                _ => return Err(format!("Unsupported model finish reason: {reason}")),
            });
        }
        Ok(())
    }

    pub fn finish(
        mut self,
        emit: &mut impl FnMut(StreamChunk),
    ) -> Result<CompletionResponse, String> {
        if let Some(chunk) = self.think.flush() {
            emit(chunk);
        }
        if !self.data.is_empty() || self.buffer.iter().any(|byte| !byte.is_ascii_whitespace()) {
            return Err("Model stream ended inside an SSE event".into());
        }
        let reason = self
            .reason
            .ok_or("Model stream ended without a finish reason")?;
        emit(StreamChunk::Finished(reason));
        match reason {
            CompletionReason::Length => {
                return Err(
                    "Model output limit reached; incomplete tool calls were not executed".into(),
                )
            }
            CompletionReason::ContentFilter => {
                return Err("Model response blocked by content filter".into())
            }
            _ => {}
        }
        let calls = self.tools.finish()?;
        if reason == CompletionReason::ToolCalls && calls.is_empty() {
            return Err("Model finished with tool_calls but supplied no calls".into());
        }
        if reason == CompletionReason::Stop && !calls.is_empty() {
            return Err("Model returned tools with a conflicting stop reason".into());
        }
        let mut ids = std::collections::HashSet::new();
        for call in &calls {
            if call.id.is_empty() || call.name.is_empty() || !ids.insert(&call.id) {
                return Err("Model supplied a missing or duplicate tool identity".into());
            }
            let arguments: Value = serde_json::from_str(&call.arguments)
                .map_err(|e| format!("Incomplete arguments for {}: {e}", call.name))?;
            if !arguments.is_object() {
                return Err("Tool arguments must be a JSON object".into());
            }
            emit(StreamChunk::ToolCall(call.clone()));
        }
        emit(StreamChunk::Done);
        Ok(CompletionResponse {
            tool_calls: calls,
            reason,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::provider::AssembledToolCall;
    use serde_json::json;

    fn run(frames: &[Value]) -> Result<Vec<AssembledToolCall>, String> {
        let mut stream = CompletionStream::default();
        for frame in frames {
            stream.feed(format!("data:{frame}\n\n").as_bytes(), &mut |_| {})?;
        }
        stream
            .finish(&mut |_| {})
            .map(|response| response.tool_calls)
    }

    #[test]
    fn stop_reason_and_complete_tool_arguments_are_required() {
        assert!(run(&[json!({"choices":[{"delta":{"content":"partial"}}]})]).is_err());
        let tool = json!({"index":0,"id":"c","function":{"name":"bash","arguments":"{\"command\":\"echo hi\"}"}});
        assert!(run(&[
            json!({"choices":[{"delta":{"tool_calls":[tool]},"finish_reason":"length"}]})
        ])
        .unwrap_err()
        .contains("not executed"));
        assert!(run(&[json!({"choices":[{"delta":{},"finish_reason":"tool_calls"}]})]).is_err());
        assert!(run(&[json!({"choices":[{"delta":{},"finish_reason":"stop"}]})]).is_ok());
    }

    #[test]
    fn conflicting_streamed_ids_and_incomplete_arguments_are_rejected() {
        let first = json!({"index":0,"id":"one","function":{"name":"read_file","arguments":"{"}});
        let second = json!({"index":0,"id":"two","function":{"arguments":"}"}});
        assert!(run(&[
            json!({"choices":[{"delta":{"tool_calls":[first]}}]}),
            json!({"choices":[{"delta":{"tool_calls":[second]},"finish_reason":"tool_calls"}]}),
        ])
        .unwrap_err()
        .contains("changed a tool call ID"));
        assert!(run(&[json!({"choices":[{"delta":{"tool_calls":[{"index":0,"id":"a","function":{"name":"read_file","arguments":"{"}}]},"finish_reason":"tool_calls"}]})]).is_err());
    }

    #[test]
    fn split_utf8_comments_and_multiline_events() {
        let mut stream = CompletionStream::default();
        let wire = ":: ping\n\ndata: {\"choices\":\n data ignored\ndata: [{\"delta\":{\"content\":\"你好\"},\"finish_reason\":\"stop\"}]}\n\ndata:[DONE]\n\n";
        let mut text = String::new();
        let mut emit = |chunk| {
            if let StreamChunk::Text(delta) = chunk {
                text.push_str(&delta);
            }
        };
        for byte in wire.as_bytes() {
            stream.feed(&[*byte], &mut emit).unwrap();
        }
        stream.finish(&mut emit).unwrap();
        assert_eq!(text, "你好");
        let mut stream = CompletionStream::default();
        assert!(stream.feed(b"data: broken\n\n", &mut |_| {}).is_err());
    }
}
