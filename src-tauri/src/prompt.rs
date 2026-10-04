use std::path::Path;
use std::fs;

pub struct PromptIngestor;

impl PromptIngestor {
    /// The core identity of the Unfuse agent.
    fn get_core_identity() -> String {
        "You are Unfuse, an expert autonomous AI coding assistant. You are precise, surgical in your edits, and follow project-specific guidelines strictly. You have access to a suite of developer and integration tools, and you always prioritize correctness over speed.".to_string()
    }

    /// Reads the project-specific rules from AGENTS.md if it exists in the workspace root.
    fn get_project_rules(workspace_root: &Path) -> Option<String> {
        let agents_md_path = workspace_root.join("AGENTS.md");
        if agents_md_path.exists() {
            fs::read_to_string(agents_md_path)
                .ok()
                .map(|content| format!("\n--- Project Guidelines (AGENTS.md) ---\n{}", content))
        } else {
            None
        }
    }

    /// Assembles the final system prompt by layering identity and project rules.
    pub fn assemble_system_prompt(workspace_root: &Path, custom_instruction: Option<&str>) -> String {
        let mut final_prompt = Self::get_core_identity();

        // Add project-specific rules from AGENTS.md
        if let Some(rules) = Self::get_project_rules(workspace_root) {
            final_prompt.push_str(&rules);
        }

        // Add a section for tool capabilities (simplified summary)
        final_prompt.push_str("\n\n--- Tool Capabilities ---\n\
            You have access to: read_file, write_file, edit_file, bash, web_search, web_extract, knowledge_search, and dev_ops.\n\
            Always inspect files before modifying them. Prefer edit_file for precise changes.");

        // If there's a custom instruction for this specific turn, append it at the end
        if let Some(instruction) = custom_instruction {
            final_prompt.push_str("\n\n--- Specific Turn Instruction ---\n");
            final_prompt.push_str(instruction);
        }

        final_prompt
    }
}
