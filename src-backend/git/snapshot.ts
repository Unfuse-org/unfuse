/**
 * @file git/snapshot.ts
 * @description Git-native atomic commit and undo system.
 * 
 * CORE ARCHITECTURE:
 * 1. Commits are atomic per completed user prompt turn (NOT before every individual tool call).
 *    When the agent finishes applying changes across multiple files for a request, it creates
 *    ONE clean, descriptive Git commit.
 * 2. If the user clicks "Undo" or types `/undo`, `undoLastTurn()` runs `git reset --hard HEAD~1`,
 *    cleanly rolling the entire codebase back to before that prompt was processed.
 * 3. Keeps `git log` clean, readable, and free of intermediate micro-commit noise.
 * 4. Silently no-ops if the workspace is not a Git repository or has no uncommitted changes.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Creates a single atomic Git commit at the end of a completed agent turn.
 * 
 * @param workspaceRoot The root directory of the workspace where Git commands should be executed.
 * @param promptSummary A concise summary or title of the user's prompt (e.g. 'update navbar dark mode').
 * @returns Promise<boolean> indicating if a commit was created (true) or skipped (false).
 */
export async function commitTurnSnapshot(
  workspaceRoot: string,
  promptSummary: string
): Promise<boolean> {
  if (!workspaceRoot || typeof workspaceRoot !== 'string') {
    return false;
  }

  const cwd = path.resolve(workspaceRoot);

  try {
    // 1. Verify if the directory is inside a valid git repository
    await execAsync('git rev-parse --is-inside-work-tree', { cwd });

    // 2. Stage all modified, created, and deleted files
    await execAsync('git add -A', { cwd });

    // 3. Check if there are staged changes to commit
    try {
      // If `git diff --cached --quiet` exits with code 0, there are no changes staged
      await execAsync('git diff --cached --quiet', { cwd });
      return false; // Working tree is clean, no changes made
    } catch {
      // Exit code != 0 means there are staged diffs ready for commit
    }

    // 4. Create the clean turn commit
    const cleanSummary = promptSummary.trim().replace(/[\r\n]+/g, ' ').slice(0, 100);
    const commitMessage = `unfuse: ${cleanSummary || 'applied changes'}`;

    // Use --no-verify so local linters/pre-commit hooks don't abort turn commits
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}" --no-verify`, { cwd });

    return true;
  } catch {
    // Silently ignore all git errors (not a git repo, git not installed, etc.)
    return false;
  }
}

/**
 * Undoes the most recent turn's Git commit, reverting the workspace to the previous commit.
 * Equivalent to Aider's `/undo` command (`git reset --hard HEAD~1`).
 * 
 * @param workspaceRoot The root directory of the workspace.
 * @returns Promise<boolean> indicating if the undo was successful.
 */
export async function undoLastTurn(workspaceRoot: string): Promise<boolean> {
  if (!workspaceRoot || typeof workspaceRoot !== 'string') {
    return false;
  }

  const cwd = path.resolve(workspaceRoot);

  try {
    // Verify inside a git repo and has at least one commit
    await execAsync('git rev-parse --is-inside-work-tree', { cwd });
    
    // Reset hard to HEAD~1
    await execAsync('git reset --hard HEAD~1', { cwd });
    return true;
  } catch {
    return false;
  }
}
