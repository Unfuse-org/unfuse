/**
 * @file llm/parser.ts
 * @description Robust dual parser extracting tool calls from both native OpenAI JSON tool_calls
 * and open-weights XML / tag-based model output streams.
 * 
 * DUAL PARSING CAPABILITY:
 * 1. Native OpenAI JSON: Assembles streaming delta tool_calls arrays into validated JSON arguments.
 * 2. XML / Tagged text fallback: Detects `<tool_call>`, `<invoke>`, or markdown code blocks
 *    emitted by open-weights reasoning and coding models.
 * 3. Extracts `<think>...</think>` reasoning tokens cleanly into a separate channel for UI rendering.
 */

import { ToolCallRequest } from '../types';

/**
 * Extracts and separates `<think>...</think>` reasoning blocks from the main text.
 */
export function extractThinking(rawText: string): { text: string; thinking?: string } {
  const thinkMatch = rawText.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const cleanText = rawText.replace(/<think>[\s\S]*?<\/think>/i, '').trim();
    return { text: cleanText, thinking };
  }
  return { text: rawText };
}

/**
 * Safely parses a JSON string, returning null if invalid.
 */
function safeJsonParse(jsonStr: string): Record<string, unknown> | null {
  try {
    const clean = jsonStr.trim();
    if (!clean) return null;
    return JSON.parse(clean);
  } catch {
    // Attempt relaxed trailing comma cleanup
    try {
      const sanitized = jsonStr.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized);
    } catch {
      return null;
    }
  }
}

/**
 * Extracts XML / Tagged tool calls from raw assistant text.
 * 
 * Supports:
 * - `<tool_call>{"name": "read", "arguments": {...}}</tool_call>`
 * - `<invoke name="read"><parameter name="path">...</parameter></invoke>`
 * - ````tool_call\n{"name": "read", ...}\n````
 */
export function parseXmlToolCalls(text: string): ToolCallRequest[] {
  const toolCalls: ToolCallRequest[] = [];
  let callIndex = 0;

  // 1. Match `<tool_call> ... </tool_call>` or ````tool_call ... ````
  const toolCallRegex = /<(?:tool_call|function_call)>([\s\S]*?)<\/(?:tool_call|function_call)>/gi;
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(text)) !== null) {
    const body = match[1].trim();
    const parsed = safeJsonParse(body);
    if (parsed && typeof parsed === 'object') {
      const name = (parsed.name || parsed.tool || parsed.function || '') as string;
      const args = (parsed.arguments || parsed.args || parsed.parameters || {}) as Record<string, unknown>;
      if (name) {
        toolCalls.push({
          id: `call_xml_${Date.now()}_${++callIndex}`,
          name,
          args: typeof args === 'string' ? safeJsonParse(args) || {} : args,
        });
      }
    }
  }

  // 2. Match Anthropic-style `<invoke name="..."> ... </invoke>`
  const invokeRegex = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/gi;
  while ((match = invokeRegex.exec(text)) !== null) {
    const toolName = match[1].trim();
    const innerBody = match[2];
    const args: Record<string, unknown> = {};

    const paramRegex = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = paramRegex.exec(innerBody)) !== null) {
      const pName = pMatch[1].trim();
      const pValue = pMatch[2].trim();
      args[pName] = pValue;
    }

    if (toolName) {
      toolCalls.push({
        id: `call_xml_${Date.now()}_${++callIndex}`,
        name: toolName,
        args,
      });
    }
  }

  return toolCalls;
}

/**
 * Reassembles native OpenAI streaming delta tool call chunks into complete ToolCallRequest objects.
 * 
 * @param deltas Map of tool call index to accumulated raw JSON argument strings.
 * @returns Array of parsed ToolCallRequest objects.
 */
export function assembleNativeToolCalls(
  deltas: Map<number, { id: string; name: string; arguments: string }>
): ToolCallRequest[] {
  const results: ToolCallRequest[] = [];

  for (const [, item] of deltas.entries()) {
    if (!item.name) continue;

    const parsedArgs = safeJsonParse(item.arguments) || {};
    results.push({
      id: item.id || `call_native_${Date.now()}`,
      name: item.name,
      args: parsedArgs,
    });
  }

  return results;
}
