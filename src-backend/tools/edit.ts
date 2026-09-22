/**
 * @file tools/edit.ts
 * @description Targeted line-range replacement tool for surgical file modifications.
 * 
 * CORE RULES:
 * 1. Validates file path against `validatePath()` before reading or writing.
 * 2. Operates on 1-indexed line numbers (`startLine` and `endLine`).
 * 3. Replaces the exact targeted block of lines with `newContent`.
 * 4. Preserves the file's original line endings (`\r\n` vs `\n`).
 * 5. Returns clear line-level diff metrics for inspection.
 */

import * as fs from 'fs/promises';
import { ToolContext, ToolResult } from '../types';
import { validatePath } from '../security/path-guard';

export interface EditToolArgs {
  path: string;
  startLine: number;
  endLine: number;
  newContent: string;
}

/**
 * Replaces a specified range of lines in an existing file with new content.
 * 
 * @param callId Unique identifier for this tool call from the LLM.
 * @param rawArgs Arguments provided by the LLM (path, startLine, endLine, newContent).
 * @param context The active workspace execution context.
 * @returns Promise<ToolResult> describing the modification outcome.
 */
export async function executeEdit(
  callId: string,
  rawArgs: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const filePath = (rawArgs.path || rawArgs.filePath || rawArgs.targetFile || '') as string;
  const startLine = typeof rawArgs.startLine === 'number' ? Math.floor(rawArgs.startLine) : 1;
  const endLine = typeof rawArgs.endLine === 'number' ? Math.floor(rawArgs.endLine) : 1;
  const newContent = typeof rawArgs.newContent === 'string' ? rawArgs.newContent : (rawArgs.content as string) || '';

  // 1. Validate destination path against security policies
  const pathCheck = validatePath(filePath, context.workspaceRoot);
  if (!pathCheck.allowed) {
    return {
      toolCallId: callId,
      toolName: 'edit',
      success: false,
      output: '',
      error: pathCheck.reason || `Access denied to path: ${filePath}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    const resolvedPath = pathCheck.resolvedPath;

    // 2. Read existing file content
    const originalContent = await fs.readFile(resolvedPath, 'utf-8');
    const isCRLF = originalContent.includes('\r\n');
    const lines = originalContent.split(/\r?\n/);
    const totalLines = lines.length;

    // 3. Validate line ranges
    if (startLine < 1 || startLine > totalLines) {
      return {
        toolCallId: callId,
        toolName: 'edit',
        success: false,
        output: '',
        error: `Invalid startLine (${startLine}). File '${filePath}' has ${totalLines} total lines.`,
        durationMs: Date.now() - startTime,
      };
    }

    if (endLine < startLine || endLine > totalLines) {
      return {
        toolCallId: callId,
        toolName: 'edit',
        success: false,
        output: '',
        error: `Invalid endLine (${endLine}). Must be between startLine (${startLine}) and total lines (${totalLines}).`,
        durationMs: Date.now() - startTime,
      };
    }

    // 4. Construct updated line array
    const beforeLines = lines.slice(0, startLine - 1);
    const afterLines = lines.slice(endLine);
    const replacementLines = newContent.length > 0 ? newContent.split(/\r?\n/) : [];

    const updatedLines = [...beforeLines, ...replacementLines, ...afterLines];
    const lineEnding = isCRLF ? '\r\n' : '\n';
    const updatedContent = updatedLines.join(lineEnding);

    // 5. Write updated content to disk
    await fs.writeFile(resolvedPath, updatedContent, 'utf-8');

    const linesRemoved = endLine - startLine + 1;
    const linesAdded = replacementLines.length;

    return {
      toolCallId: callId,
      toolName: 'edit',
      success: true,
      output: `Successfully updated '${filePath}' (replaced lines ${startLine}-${endLine} [${linesRemoved} lines removed, ${linesAdded} lines added]). Total lines now: ${updatedLines.length}.`,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolCallId: callId,
      toolName: 'edit',
      success: false,
      output: '',
      error: `Failed to edit file '${filePath}': ${message}`,
      durationMs: Date.now() - startTime,
    };
  }
}
