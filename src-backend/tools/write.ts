/**
 * @file tools/write.ts
 * @description Core file creation and full overwrite tool.
 * 
 * CORE RULES:
 * 1. Validates destination path against `validatePath()` before writing.
 * 2. Automatically creates all required parent directories recursively (`mkdir -p`).
 * 3. Writes UTF-8 encoded text cleanly to disk.
 * 4. Returns confirmation with line count and byte size.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ToolContext, ToolResult } from '../types';
import { validatePath } from '../security/path-guard';

export interface WriteToolArgs {
  path: string;
  content: string;
}

/**
 * Creates or completely overwrites a file at the specified path.
 * 
 * @param callId Unique identifier for this tool call from the LLM.
 * @param rawArgs Arguments provided by the LLM (path, content).
 * @param context The active workspace execution context.
 * @returns Promise<ToolResult> describing the write outcome.
 */
export async function executeWrite(
  callId: string,
  rawArgs: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const filePath = (rawArgs.path || rawArgs.filePath || rawArgs.targetFile || '') as string;
  const content = typeof rawArgs.content === 'string' ? rawArgs.content : '';

  // 1. Validate destination path against security policies
  const pathCheck = validatePath(filePath, context.workspaceRoot);
  if (!pathCheck.allowed) {
    return {
      toolCallId: callId,
      toolName: 'write',
      success: false,
      output: '',
      error: pathCheck.reason || `Access denied to path: ${filePath}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const resolvedPath = pathCheck.resolvedPath;

    // 2. Ensure parent directory hierarchy exists
    const parentDir = path.dirname(resolvedPath);
    await fs.mkdir(parentDir, { recursive: true });

    // 3. Write file content
    await fs.writeFile(resolvedPath, content, 'utf-8');

    const linesCount = content.split('\n').length;
    const bytesCount = Buffer.byteLength(content, 'utf-8');

    return {
      toolCallId: callId,
      toolName: 'write',
      success: true,
      output: `Successfully wrote ${bytesCount} bytes (${linesCount} lines) to '${filePath}'.`,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolCallId: callId,
      toolName: 'write',
      success: false,
      output: '',
      error: `Failed to write file '${filePath}': ${message}`,
      durationMs: Date.now() - startTime,
    };
  }
}
