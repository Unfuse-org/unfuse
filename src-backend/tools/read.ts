/**
 * @file tools/read.ts
 * @description Core file reading tool with line-range slicing, security path validation,
 * and output buffer truncation.
 * 
 * CORE RULES:
 * 1. Validates every requested path against `validatePath()` before touching disk.
 * 2. Supports optional 1-indexed `startLine` and `endLine` parameters.
 * 3. Truncates output cleanly at `MAX_OUTPUT_CHARS` to prevent context explosion.
 * 4. Formats line numbers (e.g. `1 | import React...`) to provide clear line references for edits.
 */

import * as fs from 'fs/promises';
import { ToolContext, ToolResult } from '../types';
import { validatePath } from '../security/path-guard';
import { MAX_OUTPUT_CHARS } from '../config/defaults';

export interface ReadToolArgs {
  path: string;
  startLine?: number;
  endLine?: number;
}

/**
 * Reads the content of a file within the workspace, optionally sliced to a specific line range.
 * 
 * @param callId Unique identifier for this tool call from the LLM.
 * @param rawArgs Arguments provided by the LLM (path, optional startLine, endLine).
 * @param context The active workspace execution context.
 * @returns Promise<ToolResult> containing file contents or error details.
 */
export async function executeRead(
  callId: string,
  rawArgs: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const filePath = (rawArgs.path || rawArgs.filePath || rawArgs.file || '') as string;
  const startLine = typeof rawArgs.startLine === 'number' ? Math.max(1, Math.floor(rawArgs.startLine)) : undefined;
  const endLine = typeof rawArgs.endLine === 'number' ? Math.max(1, Math.floor(rawArgs.endLine)) : undefined;

  // 1. Validate path against security guardrails
  const pathCheck = validatePath(filePath, context.workspaceRoot);
  if (!pathCheck.allowed) {
    return {
      toolCallId: callId,
      toolName: 'read',
      success: false,
      output: '',
      error: pathCheck.reason || `Access denied to path: ${filePath}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    // 2. Read raw file content
    const fullContent = await fs.readFile(pathCheck.resolvedPath, 'utf-8');
    const lines = fullContent.split(/\r?\n/);
    const totalLines = lines.length;

    // 3. Apply line range slicing if specified
    const fromLine = startLine ? Math.min(startLine, totalLines) : 1;
    const toLine = endLine ? Math.min(Math.max(fromLine, endLine), totalLines) : totalLines;

    const selectedLines = lines.slice(fromLine - 1, toLine);
    
    // Format output with 1-indexed line numbers for clarity
    const formatted = selectedLines
      .map((line, index) => {
        const lineNum = fromLine + index;
        return `${String(lineNum).padStart(4, ' ')} | ${line}`;
      })
      .join('\n');

    // 4. Truncate if output exceeds maximum character budget
    let output = formatted;
    if (output.length > MAX_OUTPUT_CHARS) {
      output = output.slice(0, MAX_OUTPUT_CHARS) + `\n\n... [Output truncated: exceeds ${MAX_OUTPUT_CHARS} characters]`;
    }

    const header = `[File: ${filePath} (${totalLines} total lines, showing lines ${fromLine}-${toLine})]\n\n`;

    return {
      toolCallId: callId,
      toolName: 'read',
      success: true,
      output: header + output,
      durationMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolCallId: callId,
      toolName: 'read',
      success: false,
      output: '',
      error: `Failed to read file '${filePath}': ${message}`,
      durationMs: Date.now() - startTime,
    };
  }
}
