import { FileOpsEngine } from './file_ops';
import { GrepEngine } from './grep';
import { TerminalEngine, type TerminalExecutionCallbacks } from './terminal';
import { SecurityEngine } from '../security';
import type {
  ToolName,
  ViewFileArgs,
  WriteFileArgs,
  ReplaceFileContentArgs,
  GrepSearchArgs,
  FindByNameArgs,
  ListDirArgs,
  RunCommandArgs,
  ToolExecutionResult,
} from './types';

export * from './types';
export * from './diff_engine';
export * from './file_ops';
export * from './grep';
export * from './terminal';

/**
 * Unified Agent Tool Executor
 * Central dispatcher executing agent operations across the workstation
 */
export class ToolExecutor {
  public fileOps: FileOpsEngine;
  public grep: GrepEngine;
  public terminal: TerminalEngine;
  public security: SecurityEngine;

  constructor(workspaceRoot: string = process.cwd()) {
    this.fileOps = new FileOpsEngine(workspaceRoot);
    this.grep = new GrepEngine(workspaceRoot);
    this.terminal = new TerminalEngine(workspaceRoot);
    this.security = new SecurityEngine(workspaceRoot);
  }

  public setWorkspace(workspaceRoot: string) {
    this.fileOps.setWorkspaceRoot(workspaceRoot);
    this.grep.setWorkspaceRoot(workspaceRoot);
    this.terminal.setDefaultCwd(workspaceRoot);
    this.security.setWorkspaceRoot(workspaceRoot);
  }

  /**
   * Execute any tool by name with arguments
   */
  public async execute(
    name: ToolName,
    args: any,
    terminalCallbacks?: TerminalExecutionCallbacks
  ): Promise<ToolExecutionResult> {
    switch (name) {
      case 'view_file':
      case 'write_to_file':
      case 'replace_file_content':
      case 'find_by_name':
      case 'list_dir': {
        const targetPath = args.path || args.directoryPath || args.directory;
        if (targetPath) {
          const pathCheck = await this.security.validatePath(targetPath);
          if (!pathCheck.allowed) {
            return {
              tool: name,
              success: false,
              error: pathCheck.violation?.reason || 'Path access denied by security policy',
            };
          }
        }

        if (name === 'view_file') return this.fileOps.viewFile(args as ViewFileArgs);
        if (name === 'write_to_file') return this.fileOps.writeFile(args as WriteFileArgs);
        if (name === 'replace_file_content') return this.fileOps.replaceFileContent(args as ReplaceFileContentArgs);
        if (name === 'find_by_name') return this.fileOps.findByName(args as FindByNameArgs);
        return this.fileOps.listDir(args as ListDirArgs);
      }

      case 'grep_search':
        return this.grep.search(args as GrepSearchArgs);

      case 'run_command': {
        const cmdCheck = this.security.validateCommand(args.command);
        if (!cmdCheck.allowed) {
          return {
            tool: name,
            success: false,
            error: cmdCheck.violation?.reason || 'Command blocked by security policy',
          };
        }
        return this.terminal.runCommand(args as RunCommandArgs, terminalCallbacks);
      }

      default:
        return {
          tool: name,
          success: false,
          error: `Unknown tool name: ${name}`,
        };
    }
  }
}
