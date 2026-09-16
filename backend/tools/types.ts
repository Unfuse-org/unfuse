/**
 * Universal Tool Type Definitions for Unit 01 Agent Operations
 */

export type ToolName =
  | 'view_file'
  | 'write_to_file'
  | 'replace_file_content'
  | 'grep_search'
  | 'find_by_name'
  | 'list_dir'
  | 'run_command'
  | 'undo_file';

export interface BaseToolCall {
  id: string;
  name: ToolName;
  description?: string;
}

export interface ViewFileArgs {
  path: string;
  startLine?: number;
  endLine?: number;
}

export interface WriteFileArgs {
  path: string;
  content: string;
  overwrite?: boolean;
}

export interface ReplaceFileContentArgs {
  path: string;
  targetContent: string;
  replacementContent: string;
  startLine?: number;
  endLine?: number;
  allowMultiple?: boolean;
}

export interface GrepSearchArgs {
  query: string;
  path?: string;
  isRegex?: boolean;
  caseInsensitive?: boolean;
  maxResults?: number;
  includes?: string[];
}

export interface FindByNameArgs {
  pattern: string;
  directory?: string;
  type?: 'file' | 'directory' | 'any';
  maxDepth?: number;
  excludes?: string[];
}

export interface ListDirArgs {
  directoryPath: string;
  maxDepth?: number;
}

export interface RunCommandArgs {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface UndoFileArgs {
  path: string;
  versionId?: string;
}

export interface ToolExecutionResult<T = any> {
  tool: ToolName;
  success: boolean;
  data?: T;
  error?: string;
  diff?: {
    oldContent: string;
    newContent: string;
    unifiedDiff: string;
    path: string;
  };
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}
