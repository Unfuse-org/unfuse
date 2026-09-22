/**
 * @file tools/bash.ts
 * @description Secure interactive and background shell execution tool.
 * 
 * CORE RULES:
 * 1. ALWAYS executes with `cwd = workspaceRoot` — never anywhere else.
 * 2. Enforces default timeout (`BASH_DEFAULT_TIMEOUT_MS` = 120s), hard capped at `BASH_MAX_TIMEOUT_MS` (10m).
 * 3. Captures stdout and stderr in real-time, truncating safely at `MAX_OUTPUT_CHARS`.
 * 4. Supports detached background executions (`background: true`) for dev servers, compilers, and watchers.
 * 5. Uses proper process group termination on timeout to prevent orphaned child processes.
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { ToolContext, ToolResult } from '../types';
import { BASH_DEFAULT_TIMEOUT_MS, BASH_MAX_TIMEOUT_MS, MAX_OUTPUT_CHARS } from '../config/defaults';

export interface BashToolArgs {
  command: string;
  timeoutMs?: number;
  background?: boolean;
}

/**
 * Registry of active background processes for lifecycle management.
 */
interface BackgroundTask {
  id: string;
  command: string;
  process: ChildProcess;
  startedAt: number;
  outputBuffer: string[];
}

const backgroundTasks = new Map<string, BackgroundTask>();

/**
 * Executes a shell command inside the workspace directory with strict timeout and output safety.
 * 
 * @param callId Unique identifier for this tool call from the LLM.
 * @param rawArgs Arguments provided by the LLM (command, optional timeoutMs, optional background).
 * @param context The active workspace execution context.
 * @returns Promise<ToolResult> containing stdout, stderr, and exit status.
 */
export async function executeBash(
  callId: string,
  rawArgs: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const command = (rawArgs.command || rawArgs.cmd || rawArgs.commandLine || '') as string;
  const isBackground = Boolean(rawArgs.background || rawArgs.detached);
  
  const rawTimeout = typeof rawArgs.timeoutMs === 'number' ? rawArgs.timeoutMs : BASH_DEFAULT_TIMEOUT_MS;
  const timeoutMs = Math.min(Math.max(1000, rawTimeout), BASH_MAX_TIMEOUT_MS);

  if (!command || !command.trim()) {
    return {
      toolCallId: callId,
      toolName: 'bash',
      success: false,
      output: '',
      error: 'Empty shell command provided.',
      durationMs: Date.now() - startTime,
    };
  }

  const cwd = path.resolve(context.workspaceRoot);

  // ── 1. BACKGROUND EXECUTION BRANCH ──────────────────────────────────────────
  if (isBackground) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    try {
      const child = spawn(command, {
        cwd,
        shell: true,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const task: BackgroundTask = {
        id: taskId,
        command,
        process: child,
        startedAt: Date.now(),
        outputBuffer: [],
      };

      child.stdout?.on('data', (chunk: Buffer) => {
        task.outputBuffer.push(chunk.toString('utf-8'));
        if (task.outputBuffer.length > 500) task.outputBuffer.shift(); // keep buffer manageable
      });

      child.stderr?.on('data', (chunk: Buffer) => {
        task.outputBuffer.push(chunk.toString('utf-8'));
        if (task.outputBuffer.length > 500) task.outputBuffer.shift();
      });

      child.on('close', () => {
        backgroundTasks.delete(taskId);
      });

      child.unref();
      backgroundTasks.set(taskId, task);

      return {
        toolCallId: callId,
        toolName: 'bash',
        success: true,
        output: `Command started in background.\nTask ID: ${taskId}\nCommand: ${command}\nStatus: Running (detached)`,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        toolCallId: callId,
        toolName: 'bash',
        success: false,
        output: '',
        error: `Failed to spawn background command: ${message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ── 2. SYNCHRONOUS / INTERACTIVE COMMAND BRANCH ─────────────────────────────
  return new Promise<ToolResult>((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let isTimedOut = false;
    let isTruncated = false;

    // Use default shell across Unix / Windows
    const child = spawn(command, {
      cwd,
      shell: true,
      detached: process.platform !== 'win32', // enable process group kill on Unix
    });

    const timer = setTimeout(() => {
      isTimedOut = true;
      try {
        if (process.platform !== 'win32' && child.pid) {
          // Kill the whole process group
          process.kill(-child.pid, 'SIGKILL');
        } else {
          child.kill('SIGKILL');
        }
      } catch {
        child.kill();
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk: Buffer) => {
      if (stdoutData.length < MAX_OUTPUT_CHARS) {
        stdoutData += chunk.toString('utf-8');
      } else if (!isTruncated) {
        isTruncated = true;
        stdoutData += `\n... [Output truncated: exceeds ${MAX_OUTPUT_CHARS} characters]`;
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      if (stderrData.length < MAX_OUTPUT_CHARS) {
        stderrData += chunk.toString('utf-8');
      }
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({
        toolCallId: callId,
        toolName: 'bash',
        success: false,
        output: stdoutData,
        error: `Command execution error: ${err.message}`,
        durationMs: Date.now() - startTime,
      });
    });

    child.on('close', (code: number | null, signal: string | null) => {
      clearTimeout(timer);

      if (isTimedOut) {
        resolve({
          toolCallId: callId,
          toolName: 'bash',
          success: false,
          output: stdoutData,
          error: `Command timed out after ${timeoutMs / 1000} seconds. Process was terminated.`,
          durationMs: Date.now() - startTime,
        });
        return;
      }

      const success = code === 0;
      let combinedOutput = '';

      if (stdoutData) {
        combinedOutput += stdoutData;
      }
      if (stderrData) {
        combinedOutput += (combinedOutput ? '\n\n[STDERR]\n' : '') + stderrData;
      }

      if (!combinedOutput) {
        combinedOutput = success ? '(Command completed with no output)' : `(Command exited with code ${code})`;
      }

      resolve({
        toolCallId: callId,
        toolName: 'bash',
        success,
        output: combinedOutput,
        error: success ? undefined : `Process exited with code ${code || signal || 'unknown'}`,
        durationMs: Date.now() - startTime,
      });
    });
  });
}
