/**
 * Tool policy gate and schema scoping for execution steps.
 */

import { ToolName } from '../types/pipeline';

export interface ToolFunctionParameter {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: ToolName;
    description: string;
    parameters: ToolFunctionParameter;
  };
}

export const CORE_TOOL_SCHEMAS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'read',
      description: 'Read the contents of a file or list a directory from the workspace or user home (~/...), optionally within a specific 1-indexed line range.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The relative or absolute path to the file or directory to read (supports workspace paths or ~/home paths).',
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
      description: 'Create a new file or completely overwrite an existing file in the workspace or home directory (~/...).',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file to create or overwrite (supports workspace paths or ~/home paths).',
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
      description: 'Replace a specific target text chunk in an existing file with new content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The path of the file to modify.',
          },
          target: {
            type: 'string',
            description: 'The exact string to be replaced.',
          },
          replacement: {
            type: 'string',
            description: 'The replacement text content.',
          },
          startLine: {
            type: 'integer',
            description: 'Optional 1-indexed line number where replacement begins.',
          },
          endLine: {
            type: 'integer',
            description: 'Optional 1-indexed line number where replacement ends (inclusive).',
          },
        },
        required: ['path', 'target', 'replacement'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command inside the workspace directory (or inspect user directories).',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command line string to execute.',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for real-time information, documentation, libraries, or news.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up on the web.',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_web_page',
      description: 'Fetch and read the readable text content of a public URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The HTTP or HTTPS URL to fetch.',
          },
        },
        required: ['url'],
      },
    },
  },
];

/**
 * Returns schemas strictly scoped to the allowed tools list.
 * If empty or undefined, returns undefined to omit the tools parameter entirely.
 */
export function getScopedToolSchemas(allowedTools?: ToolName[]): ToolDefinition[] | undefined {
  if (!allowedTools || allowedTools.length === 0) {
    return undefined;
  }
  return CORE_TOOL_SCHEMAS.filter((schema) => allowedTools.includes(schema.function.name));
}
