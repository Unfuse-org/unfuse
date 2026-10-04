use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::agent::{self};
use crate::provider::{ChatMessage, ProviderConfig};

/// Represents a model mentioned in a collaborative prompt.
#[derive(Debug, Clone)]
pub struct ModelMention {
    pub model_id: String,
    pub task_description: String,
}

pub struct Orchestrator;

impl Orchestrator {
    /// Parses the user prompt for @mentions and extracts the sequence of models and their tasks.
    pub fn parse_mentions(prompt: &str) -> Vec<ModelMention> {
        let mut mentions = Vec::new();
        let parts: Vec<&str> = prompt.split('@').collect();

        // The first part is before any @mention, skip it
        for part in &parts[1..] {
            let end_of_id = part.find(|c: char| c.is_whitespace() || c == ',' || c == '.' || c == '!')
                .unwrap_or(part.len());

            let model_id = &part[..end_of_id];
            let task_description = if end_of_id < part.len() {
                part[end_of_id..].trim()
            } else {
                ""
            };

            mentions.push(ModelMention {
                model_id: model_id.to_string(),
                task_description: task_description.to_string(),
            });
        }

        mentions
    }

    /// Builds the context-aware prompt for a specific model in the chain.
    fn build_collaboration_prompt(
        original_prompt: &str,
        blackboard: &HashMap<String, String>,
        current_mention: &ModelMention,
    ) -> String {
        let mut prompt = format!(
            "Original User Request:\n{}\n\n",
            original_prompt
        );

        if !blackboard.is_empty() {
            prompt.push_str("--- Collaborative Artifacts from other models ---\n");
            for (model_id, output) in blackboard {
                prompt.push_str(&format!(
                    "Artifact from @{}:\n{}\n\n",
                    model_id, output
                ));
            }
            prompt.push_str("----------------------------------------------\n\n");
        }

        prompt.push_str(&format!(
            "Current Task for @{}: {}\nPlease use the artifacts above to complete your part of the request.",
            current_mention.model_id, current_mention.task_description
        ));

        prompt
    }

    /// Executes the sequential chain of models.
    pub async fn run_collaborative_turn(
        app_handle: tauri::AppHandle,
        workspace_root: String,
        session_id: String,
        prompt: String,
        llm_configs: HashMap<String, crate::agent::LlmConfigPayload>,
    ) -> Result<Vec<ChatMessage>, String> {
        use tauri::Emitter;

        let path = PathBuf::from(workspace_root);
        let mentions = Self::parse_mentions(&prompt);

        if mentions.is_empty() {
            return Err("No @mentions found in prompt. Please specify which models should collaborate.".to_string());
        }

        let app_clone = app_handle.clone();
        let emit_event: agent::EventSink = Arc::new(move |event, payload| {
            let _ = app_clone.emit(event, payload);
        });

        let session = agent::get_or_create_session(&session_id);

        // The blackboard is a local cache for the turn, but we also persist it in the session state
        let mut blackboard = {
            let guard = session.lock().unwrap();
            guard.blackboard.clone()
        };

        let mut last_messages = Vec::new();

        for mention in mentions {
            // 1. Resolve ProviderConfig
            let config_payload = llm_configs.get(&mention.model_id)
                .ok_or_else(|| format!("Model @{} is not configured in this session", mention.model_id))?;
            let config = ProviderConfig::from(config_payload.clone());

            // 2. Build the prompt with artifacts
            let stage_prompt = Self::build_collaboration_prompt(&prompt, &blackboard, &mention);

            // 3. Execute the turn
            let stream_fn: agent::StreamFn = Box::new(
                |cfg, msgs, tools, on_chunk| {
                    crate::provider::stream_chat_completion(cfg, msgs, tools, on_chunk)
                }
            );

            let messages = agent::run_agent_loop_multimodal(
                &path,
                &session_id,
                &stage_prompt,
                None,
                &config,
                None,
                None,
                stream_fn,
                emit_event.clone(),
            )?;

            // 4. Capture final output as artifact
            let final_content = messages.last()
                .filter(|m| m.role == "assistant")
                .map(|m| m.content.as_text())
                .unwrap_or_else(|| "No output produced.".to_string());

            blackboard.insert(mention.model_id.clone(), final_content);
            last_messages = messages;
        }

        // Sync blackboard back to session state for persistence across turns
        {
            let mut guard = session.lock().unwrap();
            guard.blackboard = blackboard;
        }

        Ok(last_messages)
    }
}
