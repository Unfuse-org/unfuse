/**
 * @file llm/types.ts
 * @description Type definitions for LLM communication, streaming payloads, and tool call representations.
 * 
 * CORE RULES:
 * 1. Strictly standard OpenAI-compatible message schemas.
 * 2. NO provider-specific or model-specific hardcoded types.
 * 3. Supports standard tool_calls, assistant messages, and streaming delta chunks.
 */

import { ToolCallRequest } from '../types';

/**
 * Standard chat message formatted for OpenAI /v1/chat/completions.
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

/**
 * Token usage metadata returned by the provider.
 */
export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Parsed outcome of a completed LLM streaming response.
 */
export interface LLMResponse {
  text: string;
  thinking?: string;
  toolCalls: ToolCallRequest[];
  finishReason?: string;
  usage?: LLMUsage;
}

/**
 * Callback invoked for every incoming token delta from the streaming HTTP response.
 */
export type OnTokenCallback = (token: string) => void;
