import { invoke } from '@tauri-apps/api/core';
import type { LLMToolCall } from './types';

export interface ToolExecutionResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  durationMs: number;
}

/**
 * Universal Tool Execution Dispatcher across the Tauri IPC Bridge
 * Safe fallback for non-Tauri / browser dev mode
 */
export async function executeToolCall(call: LLMToolCall): Promise<ToolExecutionResult> {
  const startTime = performance.now();
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  try {
    switch (call.name) {
      case 'view_file':
      case 'read_file': {
        const path = call.args.path || call.args.filePath || call.args.targetFile;
        if (!path) throw new Error('Missing file path argument');
        if (!isTauri) {
          return {
            toolCallId: call.id,
            toolName: call.name,
            success: true,
            output: `[Browser Dev Mode] Read file: ${path}`,
            durationMs: Math.round(performance.now() - startTime),
          };
        }
        const content = await invoke<string>('read_file', {
          path,
          startLine: call.args.startLine,
          endLine: call.args.endLine,
        });
        return {
          toolCallId: call.id,
          toolName: call.name,
          success: true,
          output: content,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'write_to_file':
      case 'create_file': {
        const path = call.args.path || call.args.filePath || call.args.targetFile;
        const content = call.args.content || '';
        if (!path) throw new Error('Missing file path argument');
        if (!isTauri) {
          return {
            toolCallId: call.id,
            toolName: call.name,
            success: true,
            output: `[Browser Dev Mode] Wrote file: ${path}`,
            durationMs: Math.round(performance.now() - startTime),
          };
        }
        await invoke('write_file', { path, content });
        return {
          toolCallId: call.id,
          toolName: call.name,
          success: true,
          output: `Successfully wrote to ${path}`,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'replace_file_content':
      case 'patch_file':
      case 'edit_file': {
        const path = call.args.path || call.args.filePath || call.args.targetFile;
        const targetContent = call.args.targetContent || call.args.oldContent;
        const replacementContent = call.args.replacementContent || call.args.newContent || call.args.content;
        if (!path || !targetContent || replacementContent === undefined) {
          throw new Error('Missing path, targetContent, or replacementContent');
        }
        if (!isTauri) {
          return {
            toolCallId: call.id,
            toolName: call.name,
            success: true,
            output: `[Browser Dev Mode] Replaced content in: ${path}`,
            durationMs: Math.round(performance.now() - startTime),
          };
        }
        await invoke('replace_file_content', {
          path,
          targetContent,
          replacementContent,
        });
        return {
          toolCallId: call.id,
          toolName: call.name,
          success: true,
          output: `Successfully replaced content in ${path}`,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'run_command':
      case 'bash':
      case 'exec_command': {
        const command = call.args.command || call.args.cmd;
        if (!command) throw new Error('Missing command argument');
        if (!isTauri) {
          return {
            toolCallId: call.id,
            toolName: call.name,
            success: true,
            output: `[Browser Dev Mode] Ran command: ${command}`,
            durationMs: Math.round(performance.now() - startTime),
          };
        }
        const res = await invoke<{ stdout: string; stderr: string; exit_code: number; duration_ms: number }>('run_command', {
          command,
          cwd: call.args.cwd,
        });
        const combined = (res.stdout + (res.stderr ? '\n' + res.stderr : '')).trim();
        return {
          toolCallId: call.id,
          toolName: call.name,
          success: res.exit_code === 0,
          output: combined || `Command finished with exit code ${res.exit_code}`,
          durationMs: res.duration_ms,
        };
      }

      default:
        return {
          toolCallId: call.id,
          toolName: call.name,
          success: true,
          output: `Dispatched tool ${call.name}`,
          durationMs: Math.round(performance.now() - startTime),
        };
    }
  } catch (err: any) {
    return {
      toolCallId: call.id,
      toolName: call.name,
      success: false,
      output: err?.message || String(err),
      durationMs: Math.round(performance.now() - startTime),
    };
  }
}
