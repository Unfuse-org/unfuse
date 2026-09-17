import type { ChatMessage, LLMConfig } from './types';

/**
 * Model-Aware System Prompt Builder
 */
export class PromptBuilder {
  /**
   * Build complete conversation messages array with system prompt & tools definition
   */
  public buildPrompt(
    messages: ChatMessage[],
    repoMapContext: string = '',
    config: Partial<LLMConfig> = {}
  ): ChatMessage[] {
    const modelLower = config.model?.toLowerCase() ?? '';
    const paramMatch = modelLower.match(/\b(\d+\.?\d*)b\b/i);
    const paramCount = paramMatch ? parseFloat(paramMatch[1]) : null;
    const isSmallModel =
      (paramCount !== null && paramCount < 4) ||
      modelLower.includes('smollm') ||
      modelLower.includes('tiny');

    const systemPrompt = isSmallModel
      ? this.buildMicroSystemPrompt(repoMapContext)
      : this.buildStandardSystemPrompt(repoMapContext);

    // Filter or insert system message at the top
    const cleanedMessages = messages.filter((m) => m.role !== 'system');
    return [{ role: 'system', content: systemPrompt }, ...cleanedMessages];
  }

  private buildMicroSystemPrompt(repoMapContext: string): string {
    return `You are Unfuse, a fast and concise local AI coding assistant.
You have direct access to local project tools. When you need to read or edit code, call a tool immediately.

TOOLS AVAILABLE:
- view_file: <tool_call name="view_file" path="src/file.ts"></tool_call>
- replace_file_content: <tool_call name="replace_file_content">{"path": "src/file.ts", "targetContent": "old", "replacementContent": "new"}</tool_call>
- write_to_file: <tool_call name="write_to_file">{"path": "src/new.ts", "content": "..."}</tool_call>
- grep_search: <tool_call name="grep_search">{"query": "pattern"}</tool_call>
- run_command: <tool_call name="run_command">{"command": "bun test"}</tool_call>

${repoMapContext ? `PROJECT CONTEXT:\n${repoMapContext}\n` : ''}
Always keep answers concise and precise.`;
  }

  private buildStandardSystemPrompt(repoMapContext: string): string {
    return `You are Unfuse, an autonomous local AI software engineering workstation.
You operate directly on the user's local workspace with zero cloud dependencies.

CAPABILITIES & TOOL USAGE:
1. Research First: Use grep_search, find_by_name, and view_file to locate and understand relevant files before making changes.
2. Surgical Edits: Prefer replace_file_content with exact target blocks over rewriting entire files.
3. Verification: Use run_command to run test suites or build scripts to verify your modifications.

${repoMapContext ? `WORKSPACE MAP & CONTEXT:\n${repoMapContext}\n` : ''}
Provide clean, concise reasoning, and execute tools decisively when required.`;
  }
}
