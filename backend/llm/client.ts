import { createParser, type EventSourceMessage } from 'eventsource-parser';
import type {
  ChatMessage,
  LLMConfig,
  StreamCallbacks,
  LLMToolCall,
  GenerationMetrics,
} from './types';
import { ToolParser } from './tool_parser';

/**
 * Universal Local Model Streaming Client
 * Connects to Ollama, Llama.cpp, and vLLM / OpenAI-compatible endpoints with SSE streaming
 */
export class LLMClient {
  private toolParser: ToolParser;

  constructor() {
    this.toolParser = new ToolParser();
  }

  /**
   * Stream a chat completion from local inference provider
   */
  public async streamChat(
    messages: ChatMessage[],
    config: LLMConfig,
    callbacks: StreamCallbacks = {},
    externalAbort?: AbortController
  ): Promise<{ fullText: string; toolCalls: LLMToolCall[]; metrics: GenerationMetrics }> {
    const startTime = performance.now();
    let firstTokenTime = 0;
    let completionTokens = 0;
    let accumulatedText = '';
    let reasoningText = '';
    const nativeToolCalls: any[] = [];

    const url = this.getEndpointUrl(config);
    const requestBody = this.formatRequestBody(messages, config);

    try {
      const abort = externalAbort ?? new AbortController();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API returned status ${response.status}: ${errText}`);
      }

      if (!response.body) {
        throw new Error('Response body is empty or not streamable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let providerUsage: { prompt_tokens?: number; completion_tokens?: number } | null = null;

      const isNativeOllama = config.provider === 'ollama' && !url.includes('/v1');

      if (isNativeOllama) {
        // NDJSON parsing path for native Ollama API
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const parsed = JSON.parse(trimmed);
              if (parsed.message?.content) {
                if (firstTokenTime === 0) firstTokenTime = performance.now();
                accumulatedText += parsed.message.content;
                if (callbacks.onToken) callbacks.onToken(parsed.message.content);
              }
              if (parsed.done && parsed.prompt_eval_count != null) {
                providerUsage = {
                  prompt_tokens: parsed.prompt_eval_count,
                  completion_tokens: parsed.eval_count,
                };
              }
            } catch {}
          }
        }
      } else {
        // SSE parsing path for OpenAI-compatible endpoints
        const parser = createParser((event: EventSourceMessage) => {
          if (event.data === '[DONE]') return;

          try {
            const parsed = JSON.parse(event.data);

            // Handle OpenAI delta format
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
              if (delta.content) {
                if (firstTokenTime === 0) firstTokenTime = performance.now();
                accumulatedText += delta.content;
                if (callbacks.onToken) callbacks.onToken(delta.content);
              }
              if (delta.reasoning_content || delta.reasoning) {
                const r = delta.reasoning_content || delta.reasoning;
                reasoningText += r;
                if (callbacks.onReasoning) callbacks.onReasoning(r);
              }
              if (delta.tool_calls) {
                nativeToolCalls.push(...delta.tool_calls);
              }
            }

            // Capture usage from final chunk if provider sends it
            if (parsed.usage) {
              providerUsage = {
                prompt_tokens: parsed.usage.prompt_tokens,
                completion_tokens: parsed.usage.completion_tokens,
              };
            }
          } catch {}
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          parser.feed(chunk);
        }
      }

      const endTime = performance.now();
      const totalDurationMs = Math.max(1, endTime - startTime);
      const ttftMs = firstTokenTime ? firstTokenTime - startTime : totalDurationMs;

      const promptTokens = providerUsage?.prompt_tokens
        ?? Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4);
      completionTokens = providerUsage?.completion_tokens
        ?? Math.ceil(accumulatedText.length / 4);
      const tokensPerSecond = Number(((completionTokens / totalDurationMs) * 1000).toFixed(1));

      const metrics: GenerationMetrics = {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        tokensPerSecond,
        timeToFirstTokenMs: Math.round(ttftMs),
        totalDurationMs: Math.round(totalDurationMs),
      };

      if (callbacks.onMetrics) callbacks.onMetrics(metrics);

      // Parse XML tool calls or Native JSON tool calls
      const { cleanText, toolCalls: xmlToolCalls } = this.toolParser.parseFromText(accumulatedText);
      const parsedNative = this.toolParser.parseFromNative(nativeToolCalls);
      const allToolCalls = [...parsedNative, ...xmlToolCalls];

      if (callbacks.onDone) callbacks.onDone(cleanText, allToolCalls);

      return {
        fullText: cleanText,
        toolCalls: allToolCalls,
        metrics,
      };
    } catch (err: any) {
      if (callbacks.onError) callbacks.onError(err);
      throw err;
    }
  }

  private getEndpointUrl(config: LLMConfig): string {
    const base = config.baseUrl.replace(/\/+$/, '');
    if (config.provider === 'ollama') {
      return base.endsWith('/v1') ? `${base}/chat/completions` : `${base}/api/chat`;
    }
    return `${base}/v1/chat/completions`;
  }

  private formatRequestBody(messages: ChatMessage[], config: LLMConfig): Record<string, any> {
    if (config.provider === 'ollama' && !config.baseUrl.includes('/v1')) {
      return {
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        options: {
          temperature: config.temperature ?? 0.2,
          top_p: config.topP ?? 0.9,
          num_ctx: config.contextWindow ?? 16384,
          stop: config.stopTokens,
        },
      };
    }

    return {
      model: config.model,
      messages,
      stream: true,
      temperature: config.temperature ?? 0.2,
      top_p: config.topP ?? 0.9,
      max_tokens: config.maxTokens ?? 4096,
      stop: config.stopTokens,
    };
  }
}
