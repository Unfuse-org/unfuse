import { PathGuard } from './path_guard';
import { CommandGuard } from './command_guard';
import { SecretRedactor } from './secret_redactor';
import type { PathCheckResult, CommandCheckResult, SecurityViolation } from './types';

export * from './types';
export * from './path_guard';
export * from './command_guard';
export * from './secret_redactor';

/**
 * Main Security Engine for Unfuse
 * Coordinates zero-trust path isolation, command safety, and secret redaction
 */
export class SecurityEngine {
  public pathGuard: PathGuard;
  public commandGuard: CommandGuard;
  public redactor: SecretRedactor;

  constructor(workspaceRoot: string = process.cwd()) {
    this.pathGuard = new PathGuard(workspaceRoot);
    this.commandGuard = new CommandGuard();
    this.redactor = new SecretRedactor();
  }

  public setWorkspaceRoot(root: string) {
    this.pathGuard.setWorkspaceRoot(root);
  }

  public async validatePath(path: string): Promise<PathCheckResult> {
    return this.pathGuard.checkPath(path);
  }

  public validateCommand(command: string): CommandCheckResult {
    return this.commandGuard.checkCommand(command);
  }

  public sanitizeOutput(text: string): string {
    return this.redactor.redact(text);
  }
}
