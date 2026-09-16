import { ProjectScanner, detectLanguage } from './scanner';
import { ASTParser } from './ast_parser';
import { RepoMapBuilder } from './repomap';
import { BudgetRouter } from './budget_router';
import type {
  FileIndexRecord,
  ModelTier,
  RepoMapOptions,
  RepoMapResult,
  ContextSlice,
} from './types';

export * from './types';
export * from './scanner';
export * from './ast_parser';
export * from './repomap';
export * from './budget_router';

/**
 * Main Codebase Indexer Engine for Unit 01
 * Coordinates file scanning, AST parsing, dependency graph, and adaptive prompt context
 */
export class CodebaseIndexer {
  private scanner: ProjectScanner;
  private parser: ASTParser;
  private repoMapBuilder: RepoMapBuilder;
  public budgetRouter: BudgetRouter;
  private fileCache = new Map<string, FileIndexRecord>();
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.scanner = new ProjectScanner(workspaceRoot);
    this.parser = new ASTParser();
    this.repoMapBuilder = new RepoMapBuilder();
    this.budgetRouter = new BudgetRouter();
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
    this.scanner.setWorkspaceRoot(root);
    this.fileCache.clear();
  }

  /**
   * Scans and indexes all project files in background
   */
  public async indexWorkspace(): Promise<{ totalFiles: number; totalSymbols: number }> {
    const fs = await import('node:fs/promises');
    const pathModule = await import('node:path');

    const filePaths = await this.scanner.scanFiles();
    let totalSymbols = 0;

    for (const fullPath of filePaths) {
      try {
        const stats = await fs.stat(fullPath);
        const relPath = pathModule.relative(this.workspaceRoot, fullPath);
        const lang = detectLanguage(fullPath);

        // Read content
        const code = await fs.readFile(fullPath, 'utf-8');
        const { symbols, imports, exports } = this.parser.parseSymbols(code, lang);

        const record: FileIndexRecord = {
          path: fullPath,
          relativePath: relPath,
          language: lang,
          symbols,
          imports,
          exports,
          lineCount: code.split('\n').length,
          byteSize: stats.size,
          lastModified: stats.mtimeMs,
        };

        this.fileCache.set(fullPath, record);
        totalSymbols += symbols.length;
      } catch {}
    }

    return { totalFiles: this.fileCache.size, totalSymbols };
  }

  /**
   * Generates adaptive Repo Map tailored to active model
   */
  public getRepoMap(options: RepoMapOptions = {}): RepoMapResult {
    const records = Array.from(this.fileCache.values());
    return this.repoMapBuilder.buildMap(records, options);
  }

  /**
   * Generates complete structured XML context prompt for an active model
   */
  public getPromptContext(
    activeModelName: string,
    attachedSlices: ContextSlice[] = []
  ): string {
    const tier = this.budgetRouter.inferTier(activeModelName);
    const repoMap = this.getRepoMap({ modelTier: tier });
    return this.budgetRouter.formatContextForPrompt(repoMap, attachedSlices, tier);
  }
}
