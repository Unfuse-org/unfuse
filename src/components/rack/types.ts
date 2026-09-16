export type LocalProvider = 'ollama' | 'lmstudio' | 'jan' | 'vllm' | 'mlx' | 'llamacpp';

export type ModelRole =
  | 'Coder'
  | 'Reasoning'
  | 'Vision / OCR'
  | 'General'
  | 'Embeddings'
  | 'Reranker'
  | 'Audio';

export type ModelFamily =
  | 'qwen'
  | 'deepseek'
  | 'llama'
  | 'mistral'
  | 'phi'
  | 'gemma'
  | 'minicpm'
  | 'cohere'
  | 'starcoder'
  | 'baai'
  | 'nomic'
  | 'whisper'
  | 'custom';

export interface LocalModelBlade {
  id: string;
  name: string;
  displayName: string;
  provider: LocalProvider;
  endpoint: string;
  port: number;
  quantization?: string;
  sizeGb: number;
  vramUsageGb: number;
  contextLength: number;
  tokensUsed: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
  speedTokPerSec: number;
  status: 'active' | 'loaded' | 'standby';
  role: ModelRole;
  family: ModelFamily;
}

export interface AvailableProviderModel {
  id: string;
  name: string;
  displayName: string;
  quantization: string;
  sizeGb: number;
  defaultRole: ModelRole;
  family: ModelFamily;
  contextLength?: number;
  tokensUsed?: number;
  description?: string;
  capabilities?: string[];
  link?: string;
  contextWindow?: string;
  parameters?: string;
}
