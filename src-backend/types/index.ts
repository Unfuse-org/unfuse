/**
 * @file types/index.ts
 * @description Core TypeScript type definitions and interfaces for the Unfuse backend harness.
 * 
 * CORE RULES:
 * 1. Contains strictly structural domain types.
 * 2. NO business logic, model-specific branding, or hardcoded provider enums.
 * 3. All types here are shared across agent loops, tool executors, permission gates, and IPC.
 */

/**
 * Configuration required to communicate with a local or OpenAI-compatible LLM endpoint.
 * Fully dynamic: baseUrl and model are supplied by the frontend active rack model.
 */
export interface LLMConfig {
  baseUrl: string;
  model: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
}

/**
 * Top-level configuration for an active agent execution session.
 */
export interface AgentConfig {
  sessionId: string;
  workspaceRoot: string;
  llmConfig: LLMConfig;
}

/**
 * Execution context injected into every tool invocation.
 */
export interface ToolContext {
  workspaceRoot: string;
  sessionId: string;
}

/**
 * Represents a tool call emitted by the LLM.
 */
export interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * Standardized result returned by any tool execution.
 */
export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

/**
 * User decision outcomes from the UI permission gate.
 */
export type PermissionDecision = 'allow' | 'auto_allow' | 'modify' | 'reject';

/**
 * Response payload received from the UI when a user resolves a pending tool call.
 */
export interface PermissionResolution {
  decision: PermissionDecision;
  modifiedArgs?: Record<string, unknown>;
}

/**
 * Message representation stored in session memory and serialized to JSONL.
 */
export interface SessionMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallRequest[];
  toolCallId?: string;
  timestamp: number;
}

/**
 * High-level session state maintained in memory during runtime.
 */
export interface SessionState {
  id: string;
  workspaceRoot: string;
  llmConfig: LLMConfig;
  messages: SessionMessage[];
  startedAt: number;
  autoAllowedTools: Set<string>;
}

/**
 * Union of all IPC events emitted by the backend to the frontend UI.
 */
export type BackendEvent =
  | { type: 'token_chunk'; sessionId: string; chunk: string }
  | { type: 'tool_pending'; sessionId: string; tool: ToolCallRequest }
  | { type: 'tool_result'; sessionId: string; result: ToolResult }
  | { type: 'agent_done'; sessionId: string; finalMessage?: string }
  | { type: 'agent_error'; sessionId: string; error: string };
