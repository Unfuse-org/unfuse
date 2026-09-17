import { ToolExecutor } from './tools';
import { CodebaseIndexer } from './indexer';
import { LLMEngine } from './llm';
import { DatabaseEngine } from './database';
import { SecurityEngine } from './security';
import { TelemetryEngine } from './telemetry';

export * from './tools';
export * from './indexer';
export * from './llm';
export * from './database';
export * from './security';
export * from './telemetry';

/**
 * Unfuse Master Backend Orchestrator
 * Unites agent tools, indexer, local model inference, database, security, and hardware telemetry
 */
export class UnfuseBackend {
  public tools: ToolExecutor;
  public indexer: CodebaseIndexer;
  public llm: LLMEngine;
  public db: DatabaseEngine;
  public security: SecurityEngine;
  public telemetry: TelemetryEngine;
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.tools = new ToolExecutor(workspaceRoot);
    this.indexer = new CodebaseIndexer(workspaceRoot);
    this.llm = new LLMEngine();
    this.db = new DatabaseEngine();
    this.security = new SecurityEngine(workspaceRoot);
    this.telemetry = new TelemetryEngine();
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
    this.tools.setWorkspace(root);
    this.indexer.setWorkspaceRoot(root);
    this.security.setWorkspaceRoot(root);
    // TODO: propagate root to this.telemetry and this.db when they gain root-dependent state (e.g. persistence paths)
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }
}

export function createBackend(workspaceRoot?: string): UnfuseBackend {
  return new UnfuseBackend(workspaceRoot);
}
