/**
 * @file llm/client.ts
 * @description Universal streaming LLM client for all OpenAI-compatible local inference runners
 * (Ollama, LM Studio, Jan, Unsloth, vLLM, llama.cpp).
 * 
 * CORE RULES:
 * 1. Uses standard `fetch` with Server-Sent Events (SSE) streaming.
 * 2. Emits real-time token chunks to the UI via `onToken`.
 * 3. Extracts tool calls seamlessly via dual JSON + XML parsing.
 * 4. Supports `AbortSignal` for instantaneous user-triggered loop cancellation.
 * 5. Zero hardcoded model or provider checks.
 */

import { LLMConfig } from '../types';
import { LLMMessage, LLMResponse, OnTokenCallback, LLMUsage } from './types';
import { CORE_TOOL_SCHEMAS } from '../tools/registry';
import { assembleNativeToolCalls, extractThinking, parseXmlToolCalls } from './parser';

/**
 * Normalizes provider baseUrl to ensure it points cleanly to `/v1/chat/completions`.
 */
function normalizeCompletionsUrl(baseUrl: string): string {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  if (clean.endsWith('/chat/completions')) {
    return clean;
  }
  if (clean.endsWith('/v1')) {
    return `${clean}/chat/completions`;
  }
  return `${clean}/v1/chat/completions`;
}

/**
 * Sends a streaming chat completion request to the configured local LLM runner.
 * 
 * @param config Active LLM configuration (baseUrl, model, temperature, topP, maxTokens).
 * @param messages Full conversation history formatted as OpenAI chat messages.
 * @param onToken Optional callback triggered for every streamed text token.
 * @param signal Optional AbortSignal to cancel the stream in-flight.
 * @returns Promise<LLMResponse> containing the assembled text, thinking, and tool calls.
 */
export async function streamChatCompletion(
  config: LLMConfig,
  messages: LLMMessage[],
  onToken?: OnTokenCallback,
  signal?: AbortSignal
): Promise<LLMResponse> {
  const url = normalizeCompletionsUrl(config.baseUrl);

  const payload: Record<string, unknown> = {
    model: config.model,
    messages,
    stream: true,
    tools: CORE_TOOL_SCHEMAS,
    temperature: config.temperature !== undefined ? config.temperature : 0.2,
  };

  if (config.topP !== undefined) payload.top_p = config.topP;
  if (config.maxTokens !== undefined) payload.max_tokens = config.maxTokens;
  if (config.repetitionPenalty !== undefined) {
    // Both standard aliases for repeat penalty
    payload.repetition_penalty = config.repetitionPenalty;
    payload.frequency_penalty = config.repetitionPenalty > 1 ? (config.repetitionPenalty - 1) * 2 : 0;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `LLM Provider error (${response.status} ${response.statusText}): ${errorText || 'Server returned an error.'}`
    );
  }

  if (!response.body) {
    throw new Error('LLM Provider returned an empty response body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let accumulatedText = '';
  let finishReason = 'stop';
  let buffer = '';
  const nativeToolDeltas = new Map<number, { id: string; name: string; arguments: string }>();
  let usage: LLMUsage | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep remainder in buffer

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue; // Skip comments/heartbeats
      if (trimmed === 'data: [DONE]') continue;

      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed.choices?.[0];

          if (parsed.usage) {
            usage = {
              promptTokens: parsed.usage.prompt_tokens || 0,
              completionTokens: parsed.usage.completion_tokens || 0,
              totalTokens: parsed.usage.total_tokens || 0,
            };
          }

          if (choice) {
            if (choice.finish_reason) {
              finishReason = choice.finish_reason;
            }

            const delta = choice.delta;
            if (delta) {
              // 1. Text token streaming
              if (delta.content) {
                accumulatedText += delta.content;
                onToken?.(delta.content);
              }

              // 2. Native tool call delta streaming
              if (Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  const existing = nativeToolDeltas.get(idx) || { id: '', name: '', arguments: '' };
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.name += tc.function.name;
                  if (tc.function?.arguments) existing.arguments += tc.function.arguments;
                  nativeToolDeltas.set(idx, existing);
                }
              }
            }
          }
        } catch {
          // Skip invalid JSON lines in SSE stream
        }
      }
    }
  }

  // Extract thinking blocks if model used <think> tags
  const { text: cleanText, thinking } = extractThinking(accumulatedText);

  // 1. Check for native tool calls first
  let toolCalls = assembleNativeToolCalls(nativeToolDeltas);

  // 2. If no native tool calls were returned, parse for XML / Tagged tool calls in the text
  if (toolCalls.length === 0) {
    toolCalls = parseXmlToolCalls(accumulatedText);
  }

  // Fallback token estimation if provider did not return usage metrics
  if (!usage) {
    const promptLen = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    usage = {
      promptTokens: Math.ceil(promptLen / 4),
      completionTokens: Math.ceil(accumulatedText.length / 4),
      totalTokens: Math.ceil((promptLen + accumulatedText.length) / 4),
    };
  }

  return {
    text: cleanText,
    thinking,
    toolCalls,
    finishReason,
    usage,
  };
}
