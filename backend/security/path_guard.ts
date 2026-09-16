import type { PathCheckResult } from './types';

/**
 * Zero-Trust Path Boundary Guard
 * Prevents file traversal attacks and directory escapes outside active workspace
 */
export class PathGuard {
  private workspaceRoot: string;
  private allowedExternalPaths = new Set<string>();

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = this.normalize(workspaceRoot);
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = this.normalize(root);
  }

  public allowPath(pathStr: string) {
    this.allowedExternalPaths.add(this.normalize(pathStr));
  }

  /**
   * Evaluates whether a path is safe to read or write
   */
  public async checkPath(targetPath: string): Promise<PathCheckResult> {
    const pathModule = await import('node:path');
    const fs = await import('node:fs/promises');

    let resolved = pathModule.resolve(this.workspaceRoot, targetPath);

    // Try resolving real symlink path if file exists
    try {
      resolved = await fs.realpath(resolved);
    } catch {
      // If file doesn't exist yet, resolve parent realpath
      try {
        const parent = pathModule.dirname(resolved);
        const realParent = await fs.realpath(parent);
        resolved = pathModule.join(realParent, pathModule.basename(resolved));
      } catch {}
    }

    const normalizedResolved = this.normalize(resolved);

    // 1. Check if inside workspace
    if (
      normalizedResolved === this.workspaceRoot ||
      normalizedResolved.startsWith(this.workspaceRoot + pathModule.sep)
    ) {
      return { allowed: true, resolvedPath: normalizedResolved };
    }

    // 2. Check if explicitly allowed
    for (const allowed of this.allowedExternalPaths) {
      if (
        normalizedResolved === allowed ||
        normalizedResolved.startsWith(allowed + pathModule.sep)
      ) {
        return { allowed: true, resolvedPath: normalizedResolved };
      }
    }

    // 3. Block access outside workspace
    return {
      allowed: false,
      resolvedPath: normalizedResolved,
      violation: {
        rule: 'path_traversal',
        target: targetPath,
        reason: `Access denied: Target path '${targetPath}' resolves outside workspace boundary '${this.workspaceRoot}'.`,
        timestamp: Date.now(),
      },
    };
  }

  private normalize(p: string): string {
    return p.replace(/[/\\]+$/, '');
  }
}
