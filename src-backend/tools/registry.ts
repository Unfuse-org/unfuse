/**
 * @file tools/registry.ts
 * @description Master tool registry defining schemas and dispatch execution for all 4 core tools.
 * 
 * CORE RULES:
 * 1. Exports clean, standard OpenAI-compatible tool JSON schemas for `read`, `write`, `edit`, and `bash`.
 * 2. Normalizes tool alias variations emitted by diverse open-source models (e.g. `read_file` -> `read`).
 * 3. Dispatches invocations to the respective tool implementations (`executeRead`, `executeWrite`, etc.).
 * 4. Zero external runtime dependencies beyond native Node.js.
 */

import { ToolContext, ToolResult } from '../types';
import { executeRead } from './read';
import { executeWrite } from './write';
import { executeEdit } from './edit';
import { executeBash } from './bash';

/**
 * Standard OpenAI Function Calling schemas passed in the `tools: [...]` array
 * to Ollama, LM Studio, Jan, Unsloth, vLLM, and llama.cpp.
 */
export const CORE_TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read the contents of a file from the workspace, optionally within a specific 1-indexed line range.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The relative or absolute path to the file to read.',
          },
          startLine: {
            type: 'integer',
            description: 'Optional 1-indexed line number to start reading from.',
          },
          endLine: {
            type: 'integer',
            description: 'Optional 1-indexed line number to stop reading at (inclusive).',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write',
      description: 'Create a new file or completely overwrite an existing file in the workspace. Missing parent directories are created automatically.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file to create or overwrite.',
          },
          content: {
            type: 'string',
            description: 'The complete text content to write into the file.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit',
      description: 'Replace a specific line range in an existing file with new content. Preserves original line endings.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file to modify.',
          },
          startLine: {
            type: 'integer',
            description: 'The 1-indexed line number where replacement begins.',
          },
          endLine: {
            type: 'integer',
            description: 'The 1-indexed line number where replacement ends (inclusive).',
          },
          newContent: {
            type: 'string',
            description: 'The replacement text content.',
          },
        },
        required: ['path', 'startLine', 'endLine', 'newContent'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command inside the workspace directory. Always runs with cwd set to the project root.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command line string to execute.',
          },
          timeoutMs: {
            type: 'integer',
            description: 'Optional timeout in milliseconds (default: 120,000ms, max: 600,000ms).',
          },
          background: {
            type: 'boolean',
            description: 'Optional flag to run command detached in the background for dev servers or watchers.',
          },
        },
        required: ['command'],
      },
    },
  },
] as const;

/**
 * Clean XML representation of the core tool definitions injected into the System Prompt
 * for open-weights, reasoning, and local models that use XML / tagged tool calling.
 */
export const CORE_TOOL_XML_DEFINITIONS = `<tools>
  <tool name="read">
    <description>Read the contents of a file from the workspace, optionally within a specific line range.</description>
    <parameters>
      <parameter name="path" type="string" required="true">The relative or absolute file path to read.</parameter>
      <parameter name="startLine" type="integer" required="false">1-indexed line to start reading.</parameter>
      <parameter name="endLine" type="integer" required="false">1-indexed line to stop reading (inclusive).</parameter>
    </parameters>
  </tool>
  <tool name="write">
    <description>Create a new file or completely overwrite an existing file in the workspace.</description>
    <parameters>
      <parameter name="path" type="string" required="true">The path of the file to create or overwrite.</parameter>
      <parameter name="content" type="string" required="true">The complete text content to write.</parameter>
    </parameters>
  </tool>
  <tool name="edit">
    <description>Replace a specific line range in an existing file with new content.</description>
    <parameters>
      <parameter name="path" type="string" required="true">The path of the file to modify.</parameter>
      <parameter name="startLine" type="integer" required="true">1-indexed line where replacement begins.</parameter>
      <parameter name="endLine" type="integer" required="true">1-indexed line where replacement ends (inclusive).</parameter>
      <parameter name="newContent" type="string" required="true">The replacement text content.</parameter>
    </parameters>
  </tool>
  <tool name="bash">
    <description>Execute a shell command inside the workspace root directory.</description>
    <parameters>
      <parameter name="command" type="string" required="true">The shell command to execute.</parameter>
      <parameter name="timeoutMs" type="integer" required="false">Timeout in ms (default 120,000).</parameter>
      <parameter name="background" type="boolean" required="false">Run detached in background.</parameter>
    </parameters>
  </tool>
</tools>`;

/**
 * Normalizes tool name aliases to the 4 canonical tool names.
 */
function normalizeToolName(rawName: string): 'read' | 'write' | 'edit' | 'bash' | string {
  const lower = (rawName || '').toLowerCase().trim().replace(/^functions\./, '');

  if (lower === 'read' || lower === 'read_file' || lower === 'view_file' || lower === 'cat') {
    return 'read';
  }
  if (lower === 'write' || lower === 'write_file' || lower === 'write_to_file' || lower === 'create_file') {
    return 'write';
  }
  if (lower === 'edit' || lower === 'edit_file' || lower === 'replace_file_content' || lower === 'patch_file') {
    return 'edit';
  }
  if (lower === 'bash' || lower === 'run_command' || lower === 'execute_command' || lower === 'terminal' || lower === 'sh') {
    return 'bash';
  }

  return lower;
}

/**
 * Master tool execution dispatcher.
 * 
 * @param toolName The name of the tool invoked by the LLM.
 * @param callId Unique identifier for this tool call.
 * @param args Arguments parsed from the LLM response.
 * @param context Active workspace execution context.
 * @returns Promise<ToolResult>
 */
export async function executeTool(
  toolName: string,
  callId: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const canonical = normalizeToolName(toolName);

  switch (canonical) {
    case 'read':
      return executeRead(callId, args, context);
    case 'write':
      return executeWrite(callId, args, context);
    case 'edit':
      return executeEdit(callId, args, context);
    case 'bash':
      return executeBash(callId, args, context);
    default:
      return {
        toolCallId: callId,
        toolName,
        success: false,
        output: '',
        error: `Unknown tool '${toolName}'. Supported tools are: read, write, edit, bash.`,
        durationMs: 0,
      };
  }
}
