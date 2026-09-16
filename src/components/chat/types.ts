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
  family: ModelFamily;
}
