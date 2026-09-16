import { LLMClient } from './client';
import { ToolParser } from './tool_parser';
import { PromptBuilder } from './prompt_builder';
import type { ChatMessage, LLMConfig, StreamCallbacks, LLMToolCall, GenerationMetrics } from './types';

export * from './types';
export * from './client';
export * from './tool_parser';
export * from './prompt_builder';

/**
 * Main LLM Engine for Unit 01
 * Coordinates prompt assembly, SSE streaming, and dual-mode tool parsing
 */
export class LLMEngine {
  private client: LLMClient;
  public promptBuilder: PromptBuilder;
  public toolParser: ToolParser;

  constructor() {
    this.client = new LLMClient();
    this.promptBuilder = new PromptBuilder();
    this.toolParser = new ToolParser();
  }

  /**
   * Complete stream flow: builds system prompt with repo map context, streams tokens, parses tools, and emits metrics
   */
  public async streamChat(
    messages: ChatMessage[],
    config: LLMConfig,
    repoMapContext: string = '',
    callbacks: StreamCallbacks = {}
  ): Promise<{ fullText: string; toolCalls: LLMToolCall[]; metrics: GenerationMetrics }> {
    const formattedMessages = this.promptBuilder.buildPrompt(messages, repoMapContext, config);
    return this.client.streamChat(formattedMessages, config, callbacks);
  }
}
