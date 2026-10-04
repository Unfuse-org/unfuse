export type LocalProvider = 'ollama' | 'lmstudio' | 'vllm' | 'unsloth' | 'llamacpp' | 'mlx';

export type CapabilityStatus = 'Supported' | 'Unsupported' | 'Unknown';
export type CapabilitySource = 'Runtime' | 'Fallback';

export interface ModelCapabilities {
  image_input: CapabilityStatus;
  source: CapabilitySource;
}

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
  sizeBytes?: number;
  contextLength?: number;
  tokensUsed: number;
  temperature?: number;
  topP?: number;
  repetitionPenalty?: number;
  maxTokens?: number;
  speedTokPerSec: number;
  status: 'active' | 'loaded' | 'standby';
  family: ModelFamily;
  capabilities?: ModelCapabilities;
  apiKey?: string;
}

export interface AvailableProviderModel {
  id: string;
  name: string;
  displayName: string;
  quantization: string;
  sizeBytes?: number;
  family: ModelFamily;
  contextLength?: number;
  tokensUsed?: number;
  description?: string;
  capabilities?: ModelCapabilities;
  apiKey?: string;
  link?: string;
  contextWindow?: string;
  parameters?: string;
}
