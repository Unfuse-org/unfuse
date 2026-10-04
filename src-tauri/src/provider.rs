use std::collections::BTreeMap;
use std::io::{BufRead, BufReader};
use std::time::Duration;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub mod capability;
pub use capability::{CapabilitySource, CapabilityStatus, ModelCapabilities};

/// Strongly typed representation of message content for OpenAI-compatible APIs.
/// Serializes to a plain JSON string when Text, or an array of typed content parts when multimodal.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(untagged)]
pub enum MessageContent {
    Text(String),
    Parts(Vec<ContentPart>),
}

impl MessageContent {
    pub fn as_text(&self) -> String {
        match self {
            MessageContent::Text(s) => s.clone(),
            MessageContent::Parts(parts) => {
                let mut out = String::new();
                for p in parts {
                    if let ContentPart::Text { text } = p {
                        if !out.is_empty() {
                            out.push(' ');
                        }
                        out.push_str(text);
                    }
                }
                out
            }
        }
    }

    pub fn contains(&self, pat: &str) -> bool {
        match self {
            MessageContent::Text(s) => s.contains(pat),
            MessageContent::Parts(_) => self.as_text().contains(pat),
        }
    }
}

impl std::fmt::Display for MessageContent {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_text())
    }
}

impl PartialEq<str> for MessageContent {
    fn eq(&self, other: &str) -> bool {
        match self {
            MessageContent::Text(s) => s.as_str() == other,
            MessageContent::Parts(_) => self.as_text() == other,
        }
    }
}

impl PartialEq<&str> for MessageContent {
    fn eq(&self, other: &&str) -> bool {
        self == *other
    }
}

impl PartialEq<String> for MessageContent {
    fn eq(&self, other: &String) -> bool {
        self == other.as_str()
    }
}

impl From<String> for MessageContent {
    fn from(s: String) -> Self {
        MessageContent::Text(s)
    }
}

impl From<&str> for MessageContent {
    fn from(s: &str) -> Self {
        MessageContent::Text(s.to_string())
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(tag = "type")]
pub enum ContentPart {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: MediaUrlPayload },
    #[serde(rename = "audio_url")]
    AudioUrl { audio_url: MediaUrlPayload },
    #[serde(rename = "video_url")]
    VideoUrl { video_url: MediaUrlPayload },
}

/// Media payload containing data URL or HTTP URL according to OpenAI multimodal specification.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct MediaUrlPayload {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Backwards compatibility alias for image media payload.
pub type ImageUrlPayload = MediaUrlPayload;

/// Standard base64 encoding without external crate overhead.
use base64::{Engine as _, engine::general_purpose};

/// Helper to encode raw bytes to standard base64 string.
pub fn base64_encode(bytes: &[u8]) -> String {
    general_purpose::STANDARD.encode(bytes)
}

/// Converts a local image path reference or URL into an OpenAI-compatible data URL in memory.
/// Ensures session logs persist only lightweight paths, while wire transmissions receive base64 data.
pub fn load_image_ref_to_data_url(path_or_url: &str) -> String {
    let trimmed = path_or_url.trim();
    if trimmed.starts_with("data:") || trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return trimmed.to_string();
    }
    let clean_path = trimmed.strip_prefix("file://").unwrap_or(trimmed);
    let path = std::path::Path::new(clean_path);
    if let Ok(bytes) = std::fs::read(path) {
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase())
            .unwrap_or_default();
        let mime = match ext.as_str() {
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            "webp" => "image/webp",
            "gif" => "image/gif",
            _ => "image/png",
        };
        let b64 = base64_encode(&bytes);
        format!("data:{};base64,{}", mime, b64)
    } else {
        trimmed.to_string()
    }
}

/// Standard chat message representation for OpenAI-compatible APIs supporting text and vision.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ChatMessage {
    pub role: String,
    pub content: MessageContent,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
}

impl ChatMessage {
    pub fn system(text: impl Into<String>) -> Self {
        Self {
            role: "system".to_string(),
            content: MessageContent::Text(text.into()),
            tool_calls: None,
            tool_call_id: None,
        }
    }

    pub fn user_text(text: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: MessageContent::Text(text.into()),
            tool_calls: None,
            tool_call_id: None,
        }
    }

    pub fn user_multimodal(text: impl Into<String>, media_references: &[String]) -> Self {
        let mut parts = vec![ContentPart::Text {
            text: text.into(),
        }];
        for ref_str in media_references {
            let data_url = load_image_ref_to_data_url(ref_str);
            let ext = std::path::Path::new(ref_str)
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s.to_lowercase())
                .unwrap_or_default();

            let part = match ext.as_str() {
                "mp3" | "wav" | "ogg" => ContentPart::AudioUrl {
                    audio_url: MediaUrlPayload { url: data_url, detail: None },
                },
                "mp4" | "webm" | "mov" => ContentPart::VideoUrl {
                    video_url: MediaUrlPayload { url: data_url, detail: None },
                },
                _ => ContentPart::ImageUrl {
                    image_url: MediaUrlPayload { url: data_url, detail: None },
                },
            };
            parts.push(part);
        }
        Self {
            role: "user".to_string(),
            content: MessageContent::Parts(parts),
            tool_calls: None,
            tool_call_id: None,
        }
    }

    pub fn assistant_text(text: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: MessageContent::Text(text.into()),
            tool_calls: None,
            tool_call_id: None,
        }
    }
}

/// Configuration for connecting to any OpenAI-compatible local model runner:
/// Ollama, LM Studio, vLLM, llama.cpp, MLX, or Unsloth.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProviderConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub model: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub timeout_secs: Option<u64>,
}

/// A fully assembled tool call ready for execution by the agent engine.
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct AssembledToolCall {
    pub id: String,
    pub name: String,
    pub arguments: String,
}

/// Individual delta events emitted while streaming SSE from the model.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StreamChunk {
    /// Regular response text token.
    Text(String),
    /// Thinking / reasoning token (from reasoning_content, reasoning, or <think> tags).
    Thinking(String),
    /// Completed tool call.
    ToolCall(AssembledToolCall),
    /// Stream finished.
    Done,
}

/// State machine that extracts embedded `<think>...</think>` tags from `content`
/// for models/servers (like llama.cpp, MLX, and older Ollama) that do not emit
/// a dedicated `reasoning_content` field.
#[derive(Default)]
pub struct ThinkTagParser {
    pub in_think: bool,
    pub pending: String,
}

impl ThinkTagParser {
    pub fn new() -> Self {
        Self {
            in_think: false,
            pending: String::new(),
        }
    }

    pub fn parse(&mut self, text: &str) -> Vec<StreamChunk> {
        let mut chunks = Vec::new();
        let combined = if self.pending.is_empty() {
            text.to_string()
        } else {
            let mut s = std::mem::take(&mut self.pending);
            s.push_str(text);
            s
        };

        let mut remaining = combined.as_str();

        while !remaining.is_empty() {
            if !self.in_think {
                if let Some(idx) = remaining.find("<think>") {
                    let before = &remaining[..idx];
                    if !before.is_empty() {
                        chunks.push(StreamChunk::Text(before.to_string()));
                    }
                    self.in_think = true;
                    remaining = &remaining[idx + 7..];
                } else {
                    let tag = "<think>";
                    let mut matched_len = 0;
                    for k in (1..tag.len()).rev() {
                        if remaining.ends_with(&tag[..k]) {
                            matched_len = k;
                            break;
                        }
                    }
                    if matched_len > 0 {
                        let before = &remaining[..remaining.len() - matched_len];
                        if !before.is_empty() {
                            chunks.push(StreamChunk::Text(before.to_string()));
                        }
                        self.pending.push_str(&remaining[remaining.len() - matched_len..]);
                    } else {
                        chunks.push(StreamChunk::Text(remaining.to_string()));
                    }
                    break;
                }
            } else if let Some(idx) = remaining.find("</think>") {
                let before = &remaining[..idx];
                if !before.is_empty() {
                    chunks.push(StreamChunk::Thinking(before.to_string()));
                }
                self.in_think = false;
                remaining = &remaining[idx + 8..];
            } else {
                let tag = "</think>";
                let mut matched_len = 0;
                for k in (1..tag.len()).rev() {
                    if remaining.ends_with(&tag[..k]) {
                        matched_len = k;
                        break;
                    }
                }
                if matched_len > 0 {
                    let before = &remaining[..remaining.len() - matched_len];
                    if !before.is_empty() {
                        chunks.push(StreamChunk::Thinking(before.to_string()));
                    }
                    self.pending.push_str(&remaining[remaining.len() - matched_len..]);
                } else {
                    chunks.push(StreamChunk::Thinking(remaining.to_string()));
                }
                break;
            }
        }

        chunks
    }

    pub fn flush(&mut self) -> Option<StreamChunk> {
        if self.pending.is_empty() {
            None
        } else {
            let s = std::mem::take(&mut self.pending);
            if self.in_think {
                Some(StreamChunk::Thinking(s))
            } else {
                Some(StreamChunk::Text(s))
            }
        }
    }
}

/// Accumulator that stitches fragmented streaming `tool_calls` chunks into full calls.
#[derive(Default)]
struct ToolCallAccumulator {
    calls: BTreeMap<usize, AssembledToolCall>,
}

impl ToolCallAccumulator {
    fn update(&mut self, tc_chunk: &Value) {
        let index = tc_chunk["index"].as_u64().unwrap_or(0) as usize;
        let entry = self.calls.entry(index).or_insert_with(|| AssembledToolCall {
            id: format!("call_{}", index),
            name: String::new(),
            arguments: String::new(),
        });

        if let Some(id) = tc_chunk["id"].as_str() {
            if !id.is_empty() {
                entry.id = id.to_string();
            }
        }

        if let Some(func) = tc_chunk.get("function") {
            if let Some(name) = func["name"].as_str() {
                if !name.is_empty() {
                    if entry.name.is_empty() {
                        entry.name = name.to_string();
                    } else if entry.name != name {
                        if name.starts_with(&entry.name) {
                            entry.name = name.to_string();
                        } else {
                            entry.name.push_str(name);
                        }
                    }
                }
            }
            if let Some(args) = func["arguments"].as_str() {
                entry.arguments.push_str(args);
            }
        }
    }

    fn finish(self) -> Vec<AssembledToolCall> {
        self.calls
            .into_values()
            .filter(|c| !c.name.is_empty())
            .collect()
    }
}

/// Streams a chat completion request to an OpenAI-compatible endpoint over SSE.
///
/// Compatible with:
/// - **Ollama** (`http://localhost:11434`)
/// - **LM Studio** (`http://localhost:1234`)
/// - **vLLM** (`http://localhost:8000`)
/// - **llama.cpp** (`http://localhost:8080`)
/// - **MLX** (`http://localhost:8080`)
/// - **Unsloth** (`http://localhost:8000`)
///
/// Calls `on_chunk` with each `StreamChunk` (Text, Thinking, ToolCall, Done)
/// and returns the complete list of assembled tool calls.
pub fn stream_chat_completion<F>(
    config: &ProviderConfig,
    messages: &[ChatMessage],
    tools: Option<&[Value]>,
    mut on_chunk: F,
) -> Result<Vec<AssembledToolCall>, String>
where
    F: FnMut(StreamChunk),
{
    let endpoint = format!(
        "{}/v1/chat/completions",
        config.base_url.trim_end_matches('/')
    );

    let mut payload = json!({
        "model": config.model,
        "messages": messages,
        "stream": true,
        "temperature": config.temperature.unwrap_or(0.0),
    });

    if let Some(max_tokens) = config.max_tokens {
        payload["max_tokens"] = json!(max_tokens);
    }

    if let Some(tool_defs) = tools {
        if !tool_defs.is_empty() {
            payload["tools"] = json!(tool_defs);
            payload["tool_choice"] = json!("auto");
        }
    }

    let timeout_duration = Duration::from_secs(config.timeout_secs.unwrap_or(120).clamp(5, 600));

    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(10))
        .timeout_read(timeout_duration)
        .build();

    let mut request = agent
        .post(&endpoint)
        .set("Content-Type", "application/json");

    if let Some(ref key) = config.api_key {
        let trimmed = key.trim();
        if !trimmed.is_empty() {
            request = request.set("Authorization", &format!("Bearer {}", trimmed));
        }
    }

    let response = request
        .send_json(payload)
        .map_err(|e| format!("Failed to connect to model runner at '{}': {}", endpoint, e))?;

    let reader = BufReader::new(response.into_reader());
    let mut think_parser = ThinkTagParser::new();
    let mut tool_accumulator = ToolCallAccumulator::default();

    for line_res in reader.lines() {
        let line = line_res.map_err(|e| format!("SSE stream read error: {}", e))?;
        let trimmed = line.trim();

        // Skip empty lines and SSE ping comments
        if trimmed.is_empty() || trimmed.starts_with(':') {
            continue;
        }

        // Standard SSE payload begins with "data: "
        if let Some(raw_data) = trimmed.strip_prefix("data: ") {
            let data = raw_data.trim();

            if data == "[DONE]" {
                break;
            }

            let parsed: Value = match serde_json::from_str(data) {
                Ok(v) => v,
                Err(_) => continue, // Ignore malformed non-JSON frame
            };

            let choices = match parsed["choices"].as_array() {
                Some(arr) if !arr.is_empty() => arr,
                _ => continue,
            };

            let delta = &choices[0]["delta"];

            // 1. Check for dedicated reasoning fields (LM Studio, vLLM, DeepSeek models)
            let reasoning = delta["reasoning_content"]
                .as_str()
                .or_else(|| delta["reasoning"].as_str());

            if let Some(reason_text) = reasoning {
                if !reason_text.is_empty() {
                    on_chunk(StreamChunk::Thinking(reason_text.to_string()));
                }
            }

            // 2. Check for standard content (and parse embedded <think> tags for llama.cpp/MLX)
            if let Some(content) = delta["content"].as_str() {
                if !content.is_empty() {
                    for chunk in think_parser.parse(content) {
                        on_chunk(chunk);
                    }
                }
            }

            // 3. Accumulate incremental tool calls
            if let Some(tc_array) = delta["tool_calls"].as_array() {
                for tc_chunk in tc_array {
                    tool_accumulator.update(tc_chunk);
                }
            }
        }
    }

    if let Some(flushed) = think_parser.flush() {
        on_chunk(flushed);
    }

    let final_tools = tool_accumulator.finish();
    for tool_call in &final_tools {
        on_chunk(StreamChunk::ToolCall(tool_call.clone()));
    }

    on_chunk(StreamChunk::Done);
    Ok(final_tools)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_think_tag_parser_clean_text() {
        let mut parser = ThinkTagParser::new();
        let chunks = parser.parse("Hello, world! Here is some code.");
        assert_eq!(
            chunks,
            vec![StreamChunk::Text("Hello, world! Here is some code.".to_string())]
        );
        assert!(!parser.in_think);
    }

    #[test]
    fn test_think_tag_parser_with_tags() {
        let mut parser = ThinkTagParser::new();
        let chunks = parser.parse("<think>Let me reason</think>Here is the answer");
        assert_eq!(
            chunks,
            vec![
                StreamChunk::Thinking("Let me reason".to_string()),
                StreamChunk::Text("Here is the answer".to_string())
            ]
        );
        assert!(!parser.in_think);
    }

    #[test]
    fn test_think_tag_parser_across_chunks() {
        let mut parser = ThinkTagParser::new();
        let c1 = parser.parse("<think>Step 1");
        assert_eq!(c1, vec![StreamChunk::Thinking("Step 1".to_string())]);
        assert!(parser.in_think);

        let c2 = parser.parse(" and Step 2</think>Result");
        assert_eq!(
            c2,
            vec![
                StreamChunk::Thinking(" and Step 2".to_string()),
                StreamChunk::Text("Result".to_string())
            ]
        );
        assert!(!parser.in_think);
    }

    #[test]
    fn test_think_tag_parser_split_across_chunks() {
        // Test split <think> opening tag across chunks: "<th" then "ink>reasoning</think>output"
        let mut parser = ThinkTagParser::new();
        let c1 = parser.parse("Prefix <th");
        assert_eq!(c1, vec![StreamChunk::Text("Prefix ".to_string())]);
        assert_eq!(parser.pending, "<th");
        assert!(!parser.in_think);

        let c2 = parser.parse("ink>reasoning</think>output");
        assert_eq!(
            c2,
            vec![
                StreamChunk::Thinking("reasoning".to_string()),
                StreamChunk::Text("output".to_string()),
            ]
        );
        assert_eq!(parser.pending, "");
        assert!(!parser.in_think);

        // Test split </think> closing tag across chunks: "<think>inner</th" then "ink>outer"
        let mut parser2 = ThinkTagParser::new();
        let c3 = parser2.parse("<think>inner</th");
        assert_eq!(c3, vec![StreamChunk::Thinking("inner".to_string())]);
        assert_eq!(parser2.pending, "</th");
        assert!(parser2.in_think);

        let c4 = parser2.parse("ink>outer");
        assert_eq!(c4, vec![StreamChunk::Text("outer".to_string())]);
        assert_eq!(parser2.pending, "");
        assert!(!parser2.in_think);

        // Test split across 3 chunks: "<", "think>middle</th", "ink>end"
        let mut parser3 = ThinkTagParser::new();
        let r1 = parser3.parse("<");
        assert!(r1.is_empty());
        assert_eq!(parser3.pending, "<");

        let r2 = parser3.parse("think>middle</th");
        assert_eq!(r2, vec![StreamChunk::Thinking("middle".to_string())]);
        assert_eq!(parser3.pending, "</th");

        let r3 = parser3.parse("ink>end");
        assert_eq!(r3, vec![StreamChunk::Text("end".to_string())]);
        assert!(!parser3.in_think);

        // Test flush when partial tag prefix is never completed
        let mut parser4 = ThinkTagParser::new();
        let p1 = parser4.parse("Condition: x <");
        assert_eq!(p1, vec![StreamChunk::Text("Condition: x ".to_string())]);
        assert_eq!(parser4.pending, "<");
        let flushed = parser4.flush();
        assert_eq!(flushed, Some(StreamChunk::Text("<".to_string())));
    }

    #[test]
    fn test_tool_accumulator() {
        let mut accumulator = ToolCallAccumulator::default();

        let chunk1 = json!({
            "index": 0,
            "id": "call_abc",
            "function": { "name": "read_file", "arguments": "{\"path\":" }
        });
        accumulator.update(&chunk1);

        let chunk2 = json!({
            "index": 0,
            "function": { "arguments": " \"src/main.rs\"}" }
        });
        accumulator.update(&chunk2);

        let tools = accumulator.finish();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].id, "call_abc");
        assert_eq!(tools[0].name, "read_file");
        assert_eq!(tools[0].arguments, "{\"path\": \"src/main.rs\"}");
    }

    #[test]
    fn test_tool_accumulator_repeated_names() {
        let mut accumulator = ToolCallAccumulator::default();

        // Runner emits function.name in every delta chunk along with partial arguments
        let chunk1 = json!({
            "index": 0,
            "id": "call_123",
            "function": { "name": "read_file", "arguments": "{\"path\":" }
        });
        let chunk2 = json!({
            "index": 0,
            "function": { "name": "read_file", "arguments": " \"src/" }
        });
        let chunk3 = json!({
            "index": 0,
            "function": { "name": "read_file", "arguments": "main.rs\"}" }
        });

        accumulator.update(&chunk1);
        accumulator.update(&chunk2);
        accumulator.update(&chunk3);

        let tools = accumulator.finish();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].id, "call_123");
        assert_eq!(tools[0].name, "read_file", "Repeated function name must not be concatenated");
        assert_eq!(tools[0].arguments, "{\"path\": \"src/main.rs\"}", "Arguments must remain concatenated");
    }

    #[test]
    fn test_text_chat_message_wire_format() {
        let msg = ChatMessage::user_text("Hello, vision world!");
        let json_val = serde_json::to_value(&msg).unwrap();

        // Must serialize to standard string content in wire format
        assert_eq!(json_val["role"], "user");
        assert_eq!(json_val["content"], "Hello, vision world!");
        assert!(json_val["tool_calls"].is_null());

        // Roundtrip deserialization
        let deserialized: ChatMessage = serde_json::from_value(json_val).unwrap();
        assert_eq!(deserialized.role, "user");
        assert_eq!(deserialized.content, MessageContent::Text("Hello, vision world!".to_string()));
    }

    #[test]
    fn test_multimodal_chat_message_wire_format() {
        let image_data_url = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
        let msg = ChatMessage::user_multimodal(
            "What is in this diagram?",
            &[image_data_url.to_string()],
        );
        let json_val = serde_json::to_value(&msg).unwrap();

        assert_eq!(json_val["role"], "user");
        let content_arr = json_val["content"].as_array().expect("Must serialize as content array");
        assert_eq!(content_arr.len(), 2);

        assert_eq!(content_arr[0]["type"], "text");
        assert_eq!(content_arr[0]["text"], "What is in this diagram?");

        assert_eq!(content_arr[1]["type"], "image_url");
        assert_eq!(content_arr[1]["image_url"]["url"], image_data_url);

        // Roundtrip deserialization
        let deserialized: ChatMessage = serde_json::from_value(json_val).unwrap();
        assert_eq!(deserialized.role, "user");
        match &deserialized.content {
            MessageContent::Parts(parts) => {
                assert_eq!(parts.len(), 2);
                assert_eq!(parts[0], ContentPart::Text { text: "What is in this diagram?".to_string() });
                assert_eq!(parts[1], ContentPart::ImageUrl {
                    image_url: ImageUrlPayload {
                        url: image_data_url.to_string(),
                        detail: None,
                    }
                });
            }
            _ => panic!("Expected MessageContent::Parts"),
        }
    }

    #[test]
    fn test_base64_encode() {
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"f"), "Zg==");
        assert_eq!(base64_encode(b"fo"), "Zm8=");
        assert_eq!(base64_encode(b"foo"), "Zm9v");
        assert_eq!(base64_encode(b"foob"), "Zm9vYg==");
        assert_eq!(base64_encode(b"fooba"), "Zm9vYmE=");
        assert_eq!(base64_encode(b"foobar"), "Zm9vYmFy");
    }
}
