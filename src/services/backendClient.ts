import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface AgentConfig {
  sessionId?: string;
  workspaceRoot?: string;
  allowedTools?: string[];
  llmConfig: {
    baseUrl: string;
    model: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    repetitionPenalty?: number;
  };
}

export type BackendEvent =
  | { type: 'token_chunk'; chunk: string; sessionId?: string }
  | { type: 'text_chunk'; chunk: string; sessionId?: string }
  | { type: 'agent_status'; status: string; sessionId?: string }
  | { type: 'tokens_update'; totalTokens: number; model?: string; sessionId?: string }
  /** Emitted when a tool call is blocked at the permission gate — UI should render approval buttons. */
  | { type: 'tool_call_pending'; id: string; tool: string; toolClass: string; arguments: string; sessionId?: string }
  /** Emitted when the gate clears and the tool begins executing. */
  | { type: 'tool_pending'; tool: { id: string; name: string; args: Record<string, unknown> }; sessionId?: string }
  | { type: 'tool_result'; result: { toolCallId: string; toolName: string; success: boolean; output?: string; error?: string; durationMs?: number }; sessionId?: string }
  | { type: 'agent_done'; sessionId?: string }
  | { type: 'agent_error'; error: string; sessionId?: string };

export const backendClient = {
  /**
   * Dispatches an agent turn to the native Rust backend or fallback direct provider.
   */
  async sendChatMessage(
    config: AgentConfig,
    prompt: string,
    onEvent: (event: BackendEvent) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);

    if (isTauri) {
      let unlisten: UnlistenFn | null = null;
      try {
        unlisten = await listen<any>('agent_event', (event) => {
          const payload = event.payload;
          if (!payload) return;

          switch (payload.type) {
            case 'turn_started':
              onEvent({
                type: 'agent_status',
                status: 'Thinking & analyzing...',
                sessionId: payload.payload.session_id,
              });
              break;
            case 'thinking_delta':
              onEvent({
                type: 'token_chunk',
                chunk: `<think>${payload.payload.delta}</think>`,
                sessionId: config.sessionId,
              });
              break;
            case 'content_delta':
              onEvent({
                type: 'token_chunk',
                chunk: payload.payload.delta,
                sessionId: config.sessionId,
              });
              break;
            // Tool call is blocked at the permission gate — show approval UI
            case 'tool_call_pending':
              onEvent({
                type: 'tool_call_pending',
                id: payload.payload.id,
                tool: payload.payload.tool,
                toolClass: payload.payload.tool_class,
                arguments: payload.payload.arguments,
                sessionId: config.sessionId,
              });
              break;
            case 'tool_call_started': {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(payload.payload.arguments);
              } catch {
                args = {};
              }
              onEvent({
                type: 'tool_pending',
                tool: { id: payload.payload.id, name: payload.payload.tool, args },
                sessionId: config.sessionId,
              });
              break;
            }
            case 'tool_call_completed':
              onEvent({
                type: 'tool_result',
                result: {
                  toolCallId: payload.payload.id,
                  toolName: payload.payload.tool,
                  success: !payload.payload.is_error,
                  output: payload.payload.is_error ? undefined : payload.payload.output,
                  error: payload.payload.is_error ? payload.payload.output : undefined,
                },
                sessionId: config.sessionId,
              });
              break;
            case 'turn_completed':
              onEvent({ type: 'agent_done', sessionId: config.sessionId });
              break;
            case 'turn_cancelled':
              onEvent({ type: 'agent_error', error: payload.payload.reason, sessionId: config.sessionId });
              break;
            case 'turn_error':
              onEvent({ type: 'agent_error', error: payload.payload.error, sessionId: config.sessionId });
              break;
          }
        });

        if (signal) {
          signal.addEventListener('abort', () => {
            backendClient.stopSession(config.sessionId);
          });
        }

        await invoke('run_agent_turn', {
          workspaceRoot: config.workspaceRoot || '.',
          sessionId: config.sessionId || `sess-${Date.now()}`,
          prompt,
          llmConfig: {
            provider: 'custom',
            base_url: config.llmConfig.baseUrl,
            api_key: null,
            model: config.llmConfig.model,
            temperature: config.llmConfig.temperature ?? 0.0,
            max_tokens: config.llmConfig.maxTokens ?? 4096,
            timeout_secs: 120,
          },
        });
      } finally {
        if (unlisten) unlisten();
      }
    } else {
      // Standalone browser dev mode fallback
      onEvent({ type: 'agent_status', status: 'Browser dev mode: simulated turn', sessionId: config.sessionId });
      onEvent({
        type: 'token_chunk',
        chunk: `[Unfuse Native Desktop]: Running in web browser mock mode.\nPrompt: "${prompt}"\nModel: ${config.llmConfig.model}`,
        sessionId: config.sessionId,
      });
      onEvent({ type: 'agent_done', sessionId: config.sessionId });
    }
  },

  /**
   * Signals the cancellation token for the active session.
   */
  stopSession(sessionId?: string): void {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    if (isTauri && sessionId) {
      invoke('cancel_agent_turn', { sessionId }).catch(console.warn);
    }
  },

  /**
   * Delivers the user's decision for a blocked tool call to the Rust permission gate.
   *
   * @param callId      The tool call ID awaiting permission.
   * @param decision    'allow' | 'auto_allow' | 'modify' | 'reject'
   * @param modifiedArgs Optional new arguments object or JSON string when decision is 'modify'
   * @param toolClass   Optional tool class string ('bash' | 'write' | 'edit' | 'read')
   * @param sessionId   Optional session ID (defaults to active gate if omitted)
   * @param rejectReason Optional reason string when rejecting
   */
  async resolvePermission(
    callId: string,
    decision: 'allow' | 'auto_allow' | 'modify' | 'reject',
    modifiedArgs?: Record<string, unknown> | string,
    toolClass?: string,
    sessionId?: string,
    rejectReason?: string,
  ): Promise<boolean> {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    if (!isTauri) return false;
    try {
      const argsStr = modifiedArgs
        ? typeof modifiedArgs === 'string'
          ? modifiedArgs
          : JSON.stringify(modifiedArgs)
        : null;
      return await invoke<boolean>('resolve_tool_permission', {
        sessionId: sessionId ?? null,
        callId,
        decision,
        toolClass: toolClass ?? null,
        modifiedArgs: argsStr,
        rejectReason: rejectReason ?? null,
      });
    } catch (e) {
      console.error('resolve_tool_permission failed:', e);
      return false;
    }
  },

  /**
   * Hot-swaps the gate policy for a session (e.g. user toggles "Auto-approve writes" in Settings).
   */
  async updateSessionPolicy(
    sessionId: string,
    policy: {
      writeRequiresApproval: boolean;
      editRequiresApproval: boolean;
      bashRequiresApproval: boolean;
    }
  ): Promise<void> {
    const isTauri = typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__);
    if (!isTauri) return;
    try {
      await invoke('update_session_policy', {
        sessionId,
        writeRequiresApproval: policy.writeRequiresApproval,
        editRequiresApproval: policy.editRequiresApproval,
        bashRequiresApproval: policy.bashRequiresApproval,
      });
    } catch (e) {
      console.error('update_session_policy failed:', e);
    }
  },
};

