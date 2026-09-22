/**
 * @file ipc/bridge.ts
 * @description The single communication bridge between the Unfuse UI layer and the backend agent engine.
 * 
 * CORE RULES:
 * 1. Dispatches incoming UI actions (`sendMessage`, `resolvePermission`, `stopSession`, `undoTurn`) to the backend.
 * 2. Emits real-time typed events (`token_chunk`, `tool_pending`, `tool_result`, `agent_done`, `agent_error`) back to UI subscribers.
 * 3. Keeps UI and backend cleanly decoupled with zero hardcoded model assumptions.
 */

import {
  AgentConfig,
  BackendEvent,
  PermissionDecision,
  SessionState,
} from '../types';
import { runAgentLoop, stopAgentLoop } from '../agent/loop';
import { resolvePermission, cancelSessionPermissions } from '../permissions/gate';
import { getOrCreateSession, getSession } from '../session/store';
import { undoLastTurn } from '../git/snapshot';

export type BackendEventListener = (event: BackendEvent) => void;

class IPCBridge {
  private listeners: Set<BackendEventListener> = new Set();

  /**
   * Subscribes a listener function to receive all backend events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: BackendEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emits a typed event to all active UI subscribers.
   */
  public emit(event: BackendEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[IPC Bridge] Listener error:', err);
      }
    }
  }

  /**
   * Sends a user prompt to initiate or continue an agent execution turn.
   */
  public async sendMessage(
    config: AgentConfig,
    prompt: string
  ): Promise<void> {
    return runAgentLoop(config, prompt, (event) => this.emit(event));
  }

  /**
   * Resolves a pending tool permission gate request from the UI.
   */
  public resolveToolPermission(
    callId: string,
    decision: PermissionDecision,
    modifiedArgs?: Record<string, unknown>
  ): boolean {
    return resolvePermission(callId, { decision, modifiedArgs });
  }

  /**
   * Stops an active agent loop immediately.
   */
  public stopSession(sessionId: string): void {
    stopAgentLoop(sessionId);
    cancelSessionPermissions(sessionId);
  }

  /**
   * Undoes the last completed turn snapshot via git rollback.
   */
  public async undoTurn(workspaceRoot: string): Promise<boolean> {
    return undoLastTurn(workspaceRoot);
  }

  /**
   * Retrieves the current in-memory session state.
   */
  public getSessionState(sessionId: string): SessionState | undefined {
    return getSession(sessionId);
  }

  /**
   * Initializes or gets an active session.
   */
  public initSession(config: AgentConfig): SessionState {
    return getOrCreateSession(config.sessionId, config.workspaceRoot, config.llmConfig);
  }
}

// Export singleton instance for app-wide UI/backend communication
export const bridge = new IPCBridge();
