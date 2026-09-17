/**
 * LLM Inference & Streaming Types for Unfuse
 */

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
  rawBlock?: string;
}

export interface ChatMessage {
  role: Role;
  content: string;
  toolCalls?: LLMToolCall[];
  toolCallId?: string;
  name?: string;
}

export type InferenceProvider =
  | 'ollama'
  | 'llamacpp'
  | 'vllm'
  | 'openai-compatible';

export interface LLMConfig {
  provider: InferenceProvider;
  baseUrl: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  contextWindow?: number;
  stopTokens?: string[];
}

export interface GenerationMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  tokensPerSecond: number;
  timeToFirstTokenMs: number;
  totalDurationMs: number;
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onToolCall?: (toolCall: LLMToolCall) => void;
  onReasoning?: (thinking: string) => void;
  onMetrics?: (metrics: GenerationMetrics) => void;
  onDone?: (fullText: string, toolCalls: LLMToolCall[]) => void;
  onError?: (err: Error) => void;
}
