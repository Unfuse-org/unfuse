import { fdir } from 'fdir';
import type { GrepSearchArgs, ToolExecutionResult } from './types';

export interface GrepMatchLine {
  file: string;
  lineNumber: number;
  lineContent: string;
}

/**
 * High-speed Codebase Search Engine
 * Uses Ripgrep binary if installed/available in PATH or falls back to fast stream scanning
 */
export class GrepEngine {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
  }

  public async search(args: GrepSearchArgs): Promise<ToolExecutionResult> {
    try {
      const searchPath = args.path || this.workspaceRoot;
      const maxResults = args.maxResults || 50;

      // 1. Attempt Ripgrep process execution
      const rgResult = await this.tryRipgrep(args, searchPath, maxResults);
      if (rgResult) {
        return {
          tool: 'grep_search',
          success: true,
          data: rgResult,
        };
      }

      // 2. High-performance In-Memory Crawler Fallback
      const fallbackResult = await this.fallbackSearch(args, searchPath, maxResults);
      return {
        tool: 'grep_search',
        success: true,
        data: fallbackResult,
      };
    } catch (err: any) {
      return {
        tool: 'grep_search',
        success: false,
        error: `Grep search failed: ${err.message}`,
      };
    }
  }

  private async tryRipgrep(
    args: GrepSearchArgs,
    searchPath: string,
    maxResults: number
  ): Promise<{ matches: GrepMatchLine[]; totalCount: number } | null> {
    try {
      const { spawn } = await import('node:child_process');

      const rgArgs = ['-n', '--no-heading', '--color=never', '-M', '500'];
      if (args.caseInsensitive) rgArgs.push('-i');
      if (!args.isRegex) rgArgs.push('-F');
      if (args.includes && args.includes.length > 0) {
        for (const inc of args.includes) {
          rgArgs.push('-g', inc);
        }
      }
      rgArgs.push('-m', String(maxResults));
      rgArgs.push(args.query);
      rgArgs.push(searchPath);

      return new Promise((resolve) => {
        const proc = spawn('rg', rgArgs);
        let stdout = '';

        proc.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0 || code === 1) {
            const lines = stdout.trim().split('\n').filter(Boolean);
            const matches: GrepMatchLine[] = [];

            for (const line of lines) {
              // Format: filename:linenumber:linecontent (handle Windows C:\ drive letters)
              const match = line.match(/^((?:[a-zA-Z]:)?[^:]+):(\d+):(.*)$/);
              if (match) {
                matches.push({
                  file: match[1],
                  lineNumber: parseInt(match[2], 10),
                  lineContent: match[3],
                });
              }
              if (matches.length >= maxResults) break;
            }

            resolve({ matches, totalCount: matches.length });
          } else {
            resolve(null);
          }
        });

        proc.on('error', () => resolve(null));
      });
    } catch {
      return null;
    }
  }

  private async fallbackSearch(
    args: GrepSearchArgs,
    searchPath: string,
    maxResults: number
  ): Promise<{ matches: GrepMatchLine[]; totalCount: number }> {
    const fs = await import('node:fs/promises');
    const pathModule = await import('node:path');

    const crawler = new fdir()
      .withFullPaths()
      .exclude((dirName) =>
        ['node_modules', '.git', 'dist', 'target', '.next', '.cache', 'build'].includes(
          dirName
        )
      );

    const files = (await crawler.crawl(searchPath).withPromise()) as string[];
    const matches: GrepMatchLine[] = [];

    const flags = args.caseInsensitive ? 'i' : '';
    let regex: RegExp;
    if (args.isRegex) {
      regex = new RegExp(args.query, flags);
    } else {
      const escaped = args.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(escaped, flags);
    }

    for (const filePath of files) {
      if (matches.length >= maxResults) break;

      // Filter includes if specified
      if (args.includes && args.includes.length > 0) {
        const matchesInclude = args.includes.some((inc) => {
          const clean = inc.replace(/^\*+/, '').replace(/\*+$/, '');
          return filePath.includes(clean);
        });
        if (!matchesInclude) continue;
      }

      // Skip binary files
      const ext = pathModule.extname(filePath).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.woff', '.woff2', '.ttf', '.lock', '.exe', '.wasm'].includes(ext)) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push({
              file: filePath,
              lineNumber: i + 1,
              lineContent: lines[i].slice(0, 300), // Cap line length
            });
            if (matches.length >= maxResults) break;
          }
        }
      } catch {}
    }

    return { matches, totalCount: matches.length };
  }
}
