/**
 * @file services/tauriBridge.ts
 * @description In-memory Native Tauri IPC bridge for tool execution and Git snapshots.
 * 
 * CORE RULES:
 * 1. ZERO network ports — uses Tauri's native C-level in-memory message bridge (`invoke`).
 * 2. Provides direct access to the 4 Core Tools: `read`, `write`, `edit`, and `bash`.
 * 3. Provides atomic Git turn snapshotting and undo rollback.
 * 4. Includes seamless in-memory fallback for browser dev environments.
 */

import { invoke } from '@tauri-apps/api/core';

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

const isTauriEnvironment = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Executes the `read` tool via Tauri native IPC.
 */
export async function nativeReadFile(
  path: string,
  startLine?: number,
  endLine?: number
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  if (!isTauriEnvironment()) {
    return {
      success: true,
      output: `[Browser Dev Mode] Read file: ${path}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const output = await invoke<string>('read_file', {
      path,
      startLine: startLine ? Math.floor(startLine) : undefined,
      endLine: endLine ? Math.floor(endLine) : undefined,
    });
    return {
      success: true,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: '',
      error: msg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes the `write` tool via Tauri native IPC.
 */
export async function nativeWriteFile(
  path: string,
  content: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  if (!isTauriEnvironment()) {
    return {
      success: true,
      output: `[Browser Dev Mode] Successfully wrote ${content.length} bytes to '${path}'.`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const output = await invoke<string>('write_file', { path, content });
    return {
      success: true,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: '',
      error: msg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes the `edit` tool via Tauri native IPC.
 */
export async function nativeEditFile(
  path: string,
  target: string,
  replacement: string,
  startLine?: number,
  endLine?: number
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  if (!isTauriEnvironment()) {
    return {
      success: true,
      output: `[Browser Dev Mode] Successfully edited '${path}'.`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const output = await invoke<string>('edit_file', {
      path,
      target,
      replacement,
      startLine: startLine ? Math.floor(startLine) : undefined,
      endLine: endLine ? Math.floor(endLine) : undefined,
    });
    return {
      success: true,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: '',
      error: msg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes the `bash` shell tool via Tauri native IPC.
 */
export async function nativeRunCommand(
  command: string,
  cwd?: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  if (!isTauriEnvironment()) {
    return {
      success: true,
      output: `[Browser Dev Mode] Executed: ${command}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const output = await invoke<string>('run_command', { command, cwd });
    return {
      success: true,
      output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: '',
      error: msg,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Creates an atomic Git turn snapshot after completing a prompt.
 */
export async function nativeGitTurnCommit(
  workspaceRoot: string,
  prompt: string
): Promise<boolean> {
  if (!isTauriEnvironment()) return true;

  try {
    await invoke<string>('git_turn_commit', {
      workspaceRoot: workspaceRoot || '.',
      prompt,
    });
    return true;
  } catch (err) {
    console.warn('[Git Snapshot] Failed to commit turn:', err);
    return false;
  }
}

/**
 * Rolls back the workspace to the previous turn snapshot.
 */
export async function nativeGitUndo(workspaceRoot: string = '.'): Promise<boolean> {
  if (!isTauriEnvironment()) return true;

  try {
    const success = await invoke<boolean>('git_undo', {
      workspaceRoot: workspaceRoot || '.',
    });
    return !!success;
  } catch (err) {
    console.error('[Git Undo] Failed to rollback turn:', err);
    return false;
  }
}

/**
 * Reads real-time CPU, RAM, and hardware telemetry from the host operating system.
 */
export async function nativeGetTelemetry(): Promise<{
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
  gpu_temp_c: number;
} | null> {
  if (!isTauriEnvironment()) return null;

  try {
    return await invoke('get_system_telemetry');
  } catch (err) {
    console.warn('[Telemetry] Failed to read hardware metrics:', err);
    return null;
  }
}
