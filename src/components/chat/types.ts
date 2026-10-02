import { LocalProvider, ModelFamily } from '../rack/types';

export interface ToolSource {
  title: string;
  url: string;
  domain?: string;
  snippet?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
  durationMs?: number;
  sources?: ToolSource[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelName?: string;
  modelFamily?: ModelFamily;
  provider?: LocalProvider;
  port?: number;
  speedTokPerSec?: number;
  thought?: string;
  thoughtDurationSec?: number;
  toolCalls?: ToolCall[];
  status?: 'idle' | 'streaming' | 'error';
  agentStatus?: string;
  images?: string[];
}

export interface ClarificationOption {
  id: string;
  label: string;
  description?: string;
  recommended?: boolean;
}

export interface ClarificationRequest {
  id: string;
  toolCallId?: string;
  modelName?: string;
  modelFamily?: ModelFamily;
  question: string;
  options: ClarificationOption[];
  allowCustomInput?: boolean;
  isMultiSelect?: boolean;
}

export interface ActiveModelTarget {
  id: string;
  name: string;
  displayName: string;
  provider: LocalProvider;
  port: number;
  family?: ModelFamily;
}

export interface HardwareTelemetry {
  cpu_usage_pct: number;
  cpu_cores: number;
  cpu_brand: string;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_usage_pct: number;
  swap_used_gb: number;
  swap_total_gb: number;
  gpu_name: string;
  gpu_vendor: string;
  vram_used_gb: number;
  vram_total_gb: number;
  vram_usage_pct: number;
  gpu_temp_c: number | null;
}

