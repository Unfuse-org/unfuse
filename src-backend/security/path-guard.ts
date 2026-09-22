/**
 * @file security/path-guard.ts
 * @description Path boundary validation and security policy guard for all filesystem-touching tools
 * (read, write, edit).
 * 
 * THREE-TIER PATH EVALUATION:
 * Tier 1 (Hard Block): Path matches a sensitive pattern (.env, ~/.ssh, etc.) -> HARD REJECT (never shown in UI).
 * Tier 2 (Safe Workspace): Path resolves cleanly inside the user's workspaceRoot -> ALLOWED.
 * Tier 3 (External Scope): Path is outside the workspace root but not sensitive -> REQUIRES PERMISSION from the user.
 */

import * as path from 'path';
import * as os from 'os';
import { isSensitivePath } from './sensitive-patterns';

export interface PathValidationResult {
  allowed: boolean;
  resolvedPath: string;
  requiresPermission?: boolean;
  reason?: string;
}

/**
 * Expands leading tildes (~) to the user's home directory.
 */
function expandTilde(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

/**
 * Validates a candidate file path against the active workspace boundary and security policies.
 * 
 * @param candidatePath The raw path string supplied by the model or user.
 * @param workspaceRoot The canonical root directory of the current project workspace.
 * @returns PathValidationResult describing whether the path is allowed, requires permission, or is hard-blocked.
 */
export function validatePath(candidatePath: string, workspaceRoot: string): PathValidationResult {
  if (!candidatePath || typeof candidatePath !== 'string' || !candidatePath.trim()) {
    return {
      allowed: false,
      resolvedPath: '',
      reason: 'Empty or invalid file path provided.',
    };
  }

  // 1. Expand tildes and resolve to absolute path
  const expanded = expandTilde(candidatePath.trim());
  const canonicalRoot = path.resolve(expandTilde(workspaceRoot));
  const resolvedPath = path.isAbsolute(expanded)
    ? path.normalize(expanded)
    : path.resolve(canonicalRoot, expanded);

  // 2. TIER 1: Hard Security Block Check (Sensitive files & credentials)
  if (isSensitivePath(resolvedPath) || isSensitivePath(candidatePath)) {
    return {
      allowed: false,
      resolvedPath,
      requiresPermission: false,
      reason: `Access Denied: '${path.basename(resolvedPath)}' is a protected sensitive file or directory.`,
    };
  }

  // 3. TIER 2 & 3: Workspace Boundary Check
  const relativeFromRoot = path.relative(canonicalRoot, resolvedPath);
  const isInsideWorkspace =
    !relativeFromRoot.startsWith('..') && !path.isAbsolute(relativeFromRoot);

  if (isInsideWorkspace) {
    // Tier 2: Path is safely located inside the active project
    return {
      allowed: true,
      resolvedPath,
    };
  }

  // Tier 3: Path is outside project directory -> must ask user via permission gate
  return {
    allowed: false,
    resolvedPath,
    requiresPermission: true,
    reason: `The path '${resolvedPath}' is outside your active workspace directory ('${canonicalRoot}').`,
  };
}
