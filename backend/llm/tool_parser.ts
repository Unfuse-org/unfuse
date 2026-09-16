import type { LLMToolCall } from './types';

/**
 * Universal Dual-Mode Tool Parser
 * Extracts tool calls from:
 * 1. Native OpenAI-style JSON tool_calls
 * 2. XML tags: <tool_call name="...">{"arg": "val"}</tool_call>
 * 3. Markdown codeblocks: ```bash command ``` or ```edit_file path="..." ... ```
 */
export class ToolParser {
  /**
   * Parse XML/Markdown tool calls from streaming or completed model text
   */
  public parseFromText(text: string): {
    cleanText: string;
    toolCalls: LLMToolCall[];
  } {
    const toolCalls: LLMToolCall[] = [];
    let cleanText = text;

    // 1. XML <tool_call name="tool_name"> ... </tool_call>
    const xmlRegex = /<tool_call\s+name=["']([^"']+)["'](?:\s+path=["']([^"']+)["'])?>([\s\S]*?)<\/tool_call>/gi;
    let match: RegExpExecArray | null;

    while ((match = xmlRegex.exec(text)) !== null) {
      const toolName = match[1];
      const inlinePath = match[2];
      const rawBody = match[3].trim();

      let parsedArgs: Record<string, any> = {};
      try {
        parsedArgs = JSON.parse(rawBody);
      } catch {
        // If not valid JSON, treat rawBody as command, content, or query
        if (inlinePath) parsedArgs.path = inlinePath;
        if (toolName.includes('command') || toolName.includes('run') || toolName.includes('bash')) {
          parsedArgs.command = rawBody;
        } else if (toolName.includes('search') || toolName.includes('grep')) {
          parsedArgs.query = rawBody;
        } else if (toolName.includes('write') || toolName.includes('edit')) {
          parsedArgs.content = rawBody;
        } else {
          parsedArgs.raw = rawBody;
        }
      }

      if (inlinePath && !parsedArgs.path) {
        parsedArgs.path = inlinePath;
      }

      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: toolName,
        args: parsedArgs,
        rawBlock: match[0],
      });
    }

    // 2. Direct XML convenience tags: <edit_file path="..."> ... </edit_file>
    const editFileRegex = /<edit_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/edit_file>/gi;
    while ((match = editFileRegex.exec(text)) !== null) {
      toolCalls.push({
        id: `call_edit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: 'replace_file_content',
        args: {
          path: match[1],
          content: match[2].trim(),
        },
        rawBlock: match[0],
      });
    }

    // 3. Direct XML convenience tags: <view_file path="..."> or <read_file path="...">
    const readFileRegex = /<(?:view_file|read_file)\s+path=["']([^"']+)["'](?:\s+lines=["'](\d+)-(\d+)["'])?\s*\/?>/gi;
    while ((match = readFileRegex.exec(text)) !== null) {
      toolCalls.push({
        id: `call_read_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: 'view_file',
        args: {
          path: match[1],
          startLine: match[2] ? parseInt(match[2], 10) : undefined,
          endLine: match[3] ? parseInt(match[3], 10) : undefined,
        },
        rawBlock: match[0],
      });
    }

    // Strip tool call tags from visible text
    cleanText = cleanText
      .replace(xmlRegex, '')
      .replace(editFileRegex, '')
      .replace(readFileRegex, '')
      .trim();

    return { cleanText, toolCalls };
  }

  /**
   * Convert native OpenAI tool_calls objects to standardized LLMToolCall format
   */
  public parseFromNative(openAiToolCalls: any[]): LLMToolCall[] {
    if (!Array.isArray(openAiToolCalls)) return [];

    return openAiToolCalls.map((tc, idx) => {
      let args: Record<string, any> = {};
      try {
        args =
          typeof tc.function?.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function?.arguments || {};
      } catch {
        args = { raw: tc.function?.arguments };
      }

      return {
        id: tc.id || `call_native_${Date.now()}_${idx}`,
        name: tc.function?.name || 'unknown_tool',
        args,
      };
    });
  }
}
