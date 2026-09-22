/**
 * @file permissions/gate.ts
 * @description In-memory permission gate pausing agent execution loops until user approval is received.
 * 
 * CORE RULES:
 * 1. Pauses the async agent loop and registers a pending promise.
 * 2. Emits a `tool_pending` event to the UI containing the exact tool call and arguments.
 * 3. Resolves when the user clicks 'Allow', 'Auto-Allow', 'Modify', or 'Reject'.
 * 4. Auto-rejects after `PERMISSION_GATE_TIMEOUT_MS` (5 minutes) if abandoned, preventing hanging loops.
 */

import { ToolCallRequest, PermissionResolution } from '../types';
import { PERMISSION_GATE_TIMEOUT_MS } from '../config/defaults';

interface PendingRequest {
  tool: ToolCallRequest;
  sessionId: string;
  resolve: (res: PermissionResolution) => void;
  timer: NodeJS.Timeout;
}

const pendingRequests = new Map<string, PendingRequest>();

/**
 * Requests user authorization before a tool call executes.
 * Pauses the agent loop until the UI emits a resolution or timeout occurs.
 * 
 * @param sessionId The active session identifier.
 * @param tool The tool call requested by the model.
 * @param onEmitPending Callback to emit the `tool_pending` event to the UI.
 * @returns Promise<PermissionResolution> containing the user's decision.
 */
export function requestPermission(
  sessionId: string,
  tool: ToolCallRequest,
  onEmitPending: (tool: ToolCallRequest) => void
): Promise<PermissionResolution> {
  return new Promise<PermissionResolution>((resolve) => {
    // 1. Setup auto-reject timer to prevent zombie processes
    const timer = setTimeout(() => {
      pendingRequests.delete(tool.id);
      resolve({
        decision: 'reject',
      });
    }, PERMISSION_GATE_TIMEOUT_MS);

    // 2. Register pending request in memory
    pendingRequests.set(tool.id, {
      tool,
      sessionId,
      resolve: (resolution: PermissionResolution) => {
        clearTimeout(timer);
        resolve(resolution);
      },
      timer,
    });

    // 3. Notify frontend UI that a tool is waiting for permission
    onEmitPending(tool);
  });
}

/**
 * Resolves a pending tool permission when the user makes a decision in the UI.
 * 
 * @param callId The unique tool call identifier.
 * @param resolution The decision payload (allow, auto_allow, modify, reject).
 * @returns boolean true if the pending request was found and resolved, false otherwise.
 */
export function resolvePermission(callId: string, resolution: PermissionResolution): boolean {
  const pending = pendingRequests.get(callId);
  if (!pending) {
    return false;
  }

  pendingRequests.delete(callId);
  pending.resolve(resolution);
  return true;
}

/**
 * Rejects and clears all pending permission requests for a given session (e.g. on agent Stop).
 * 
 * @param sessionId The session identifier to cancel.
 */
export function cancelSessionPermissions(sessionId: string): void {
  for (const [id, pending] of pendingRequests.entries()) {
    if (pending.sessionId === sessionId) {
      clearTimeout(pending.timer);
      pending.resolve({ decision: 'reject' });
      pendingRequests.delete(id);
    }
  }
}
