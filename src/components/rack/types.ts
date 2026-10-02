export type LocalProvider = 'ollama' | 'lmstudio' | 'vllm' | 'unsloth' | 'llamacpp' | 'mlx';

export type CapabilityStatus = 'Supported' | 'Unsupported' | 'Unknown';
export type CapabilitySource = 'Runtime' | 'Fallback';

export interface ModelCapabilities {
  image_input: CapabilityStatus;
  source: CapabilitySource;
}

export type ModelRole =
  | 'VL'
  | 'Coder'
  | 'Reasoning'
  | 'Vision / OCR'
  | 'General'
  | 'Embeddings'
  | 'Reranker'
  | 'Audio';

/** Model family is dynamic — comes from Ollama API `details.family` or inferred from model name. */
export type ModelFamily = string;

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
  contextLength?: number;
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
