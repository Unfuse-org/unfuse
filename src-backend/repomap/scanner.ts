/**
 * @file repomap/scanner.ts
 * @description Workspace directory scanner generating a compact file tree for system prompt injection.
 * 
 * CORE RULES:
 * 1. Respects standard ignore rules: skips `node_modules`, `.git`, `dist`, `target`, `.next`, `.build`, etc.
 * 2. Produces a concise, token-efficient directory representation (under 300 tokens for average repos).
 * 3. Limits recursion depth and total entries to avoid context window pollution on massive repos.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'target',
  'vendor',
  '.cache',
  'coverage',
  '.turbo',
  '.idea',
  '.vscode',
]);

const MAX_TOTAL_FILES = 120;
const MAX_DEPTH = 4;

/**
 * Recursively scans the workspace to generate a compact ASCII directory tree.
 * 
 * @param rootDir The workspace root directory.
 * @returns Promise<string> Compact tree string ready for prompt injection.
 */
export async function generateWorkspaceTree(rootDir: string): Promise<string> {
  if (!rootDir) return '(No workspace root configured)';

  let fileCount = 0;
  const lines: string[] = [];

  async function walk(currentDir: string, depth: number, prefix: string): Promise<void> {
    if (depth > MAX_DEPTH || fileCount >= MAX_TOTAL_FILES) return;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      // Sort directories first, then files alphabetically
      entries.sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory() ? -1 : 1;
      });

      for (let i = 0; i < entries.length; i++) {
        if (fileCount >= MAX_TOTAL_FILES) {
          lines.push(`${prefix}... (additional files omitted)`);
          return;
        }

        const entry = entries[i];
        if (entry.name.startsWith('.') && entry.name !== '.env.example') {
          if (entry.name === '.git' || entry.name === '.github') {
            if (entry.name !== '.github') continue;
          }
        }

        if (entry.isDirectory()) {
          if (IGNORED_DIRECTORIES.has(entry.name)) continue;

          lines.push(`${prefix}📁 ${entry.name}/`);
          const nextPath = path.join(currentDir, entry.name);
          await walk(nextPath, depth + 1, `${prefix}  `);
        } else if (entry.isFile()) {
          fileCount++;
          lines.push(`${prefix}📄 ${entry.name}`);
        }
      }
    } catch {
      // Ignore unreadable subdirectories
    }
  }

  await walk(rootDir, 1, '');

  if (lines.length === 0) {
    return '(Empty workspace directory)';
  }

  return lines.join('\n');
}
