/**
 * Pipeline execution types and state contracts.
 */

import { ActiveModelTarget } from '../components/chat/types';

export type ToolName = 'read' | 'write' | 'edit' | 'bash' | 'web_search' | 'fetch_web_page';

export type PipelineMode = 'single_turn' | 'sequential_relay' | 'segmented_tasks';

export interface PipelineStep {
  id: string;
  order: number;
  model: ActiveModelTarget;
  assignedDirective: string;
  allowedTools: ToolName[];
  dependsOnStepIds: string[];
}

export interface PipelinePlan {
  id: string;
  sessionId: string;
  originalPrompt: string;
  mode: PipelineMode;
  steps: PipelineStep[];
  workspaceRoot: string;
}

export interface StepArtifact {
  stepId: string;
  modelName: string;
  content: string;
  summary?: string;
  filesModified?: string[];
  timestamp: string;
  durationMs: number;
  tokensUsed: number;
}

export interface ExecutionState {
  planId: string;
  currentStepIndex: number;
  status: 'idle' | 'running' | 'paused_for_permission' | 'completed' | 'failed' | 'aborted';
  artifacts: Record<string, StepArtifact>;
  error?: string;
}

export type PipelineEvent =
  | { type: 'pipeline_start'; planId: string; totalSteps: number }
  | { type: 'step_start'; stepId: string; modelName: string; order: number }
  | { type: 'token_chunk'; stepId: string; chunk: string }
  | { type: 'thought_chunk'; stepId: string; thought: string }
  | { type: 'tool_pending'; stepId: string; tool: { id: string; name: string; args: Record<string, unknown> } }
  | { type: 'tool_result'; stepId: string; result: { toolCallId: string; toolName: string; success: boolean; output: string } }
  | { type: 'step_done'; stepId: string; artifact: StepArtifact }
  | { type: 'pipeline_done'; planId: string }
  | { type: 'pipeline_error'; planId: string; error: string };
