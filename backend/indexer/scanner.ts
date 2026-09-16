import { fdir } from 'fdir';
import type { SupportedLanguage } from './types';

const IGNORED_DIRECTORIES = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '.next',
  '.cache',
  '.turbo',
  '.idea',
  '.vscode',
  'coverage',
  '.system_generated',
  'vendor',
];

const IGNORED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp4',
  '.mp3',
  '.zip',
  '.tar',
  '.gz',
  '.exe',
  '.wasm',
  '.lock',
  '.DS_Store',
];

export function detectLanguage(filePath: string): SupportedLanguage {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs'))
    return 'javascript';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.rs')) return 'rust';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.c') || lower.endsWith('.h') || lower.endsWith('.hpp'))
    return 'cpp';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.sass')) return 'css';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown';
  return 'unknown';
}

/**
 * Fast project file scanner
 */
export class ProjectScanner {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
  }

  public async scanFiles(): Promise<string[]> {
    try {
      const crawler = new fdir()
        .withFullPaths()
        .exclude((dirName) => IGNORED_DIRECTORIES.includes(dirName))
        .filter((filePath) => {
          const lower = filePath.toLowerCase();
          return !IGNORED_EXTENSIONS.some((ext) => lower.endsWith(ext.toLowerCase()));
        });

      const allFiles = (await crawler.crawl(this.workspaceRoot).withPromise()) as string[];
      return allFiles;
    } catch {
      return [];
    }
  }
}
