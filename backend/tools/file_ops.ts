import { fdir } from 'fdir';
import type {
  ViewFileArgs,
  WriteFileArgs,
  ReplaceFileContentArgs,
  FindByNameArgs,
  ListDirArgs,
  ToolExecutionResult,
} from './types';
import { createUnifiedDiff, applyTargetReplacement } from './diff_engine';

/**
 * File Operations Tool Provider
 * Compatible with Node.js, Bun, and Tauri environments
 */
export class FileOpsEngine {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  public setWorkspaceRoot(root: string) {
    this.workspaceRoot = root;
  }

  public getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * View / Slice a file's content
   */
  public async viewFile(args: ViewFileArgs, rawContent?: string): Promise<ToolExecutionResult> {
    try {
      let content = rawContent;
      if (content === undefined) {
        const fs = await import('node:fs/promises');
        content = await fs.readFile(args.path, 'utf-8');
      }

      const lines = content.split('\n');
      const totalLines = lines.length;

      const start = Math.max(1, args.startLine ?? 1);
      const end = Math.min(totalLines, args.endLine ?? totalLines);

      const slicedLines = lines.slice(start - 1, end);
      const formatted = slicedLines
        .map((line, idx) => `${start + idx}: ${line}`)
        .join('\n');

      return {
        tool: 'view_file',
        success: true,
        data: {
          path: args.path,
          totalLines,
          startLine: start,
          endLine: end,
          content: formatted,
          rawSlice: slicedLines.join('\n'),
        },
      };
    } catch (err: any) {
      return {
        tool: 'view_file',
        success: false,
        error: `Failed to view file ${args.path}: ${err.message}`,
      };
    }
  }

  /**
   * Write or overwrite a file and return unified diff
   */
  public async writeFile(
    args: WriteFileArgs,
    existingContent?: string
  ): Promise<ToolExecutionResult> {
    try {
      const fs = await import('node:fs/promises');
      const pathModule = await import('node:path');

      let oldContent = existingContent ?? '';
      let fileExisted = false;
      try {
        if (existingContent === undefined) {
          oldContent = await fs.readFile(args.path, 'utf-8');
          fileExisted = true;
        } else {
          fileExisted = existingContent.length > 0;
        }
      } catch {
        oldContent = '';
        fileExisted = false;
      }

      // Check overwrite flag
      if (fileExisted && args.overwrite === false) {
        return {
          tool: 'write_to_file',
          success: false,
          error: `File '${args.path}' already exists and overwrite is set to false.`,
        };
      }

      // Ensure directory exists
      const dir = pathModule.dirname(args.path);
      await fs.mkdir(dir, { recursive: true });

      // Write file
      await fs.writeFile(args.path, args.content, 'utf-8');

      const diff = createUnifiedDiff(
        pathModule.basename(args.path),
        oldContent,
        args.content
      );

      return {
        tool: 'write_to_file',
        success: true,
        diff: {
          path: args.path,
          oldContent,
          newContent: args.content,
          unifiedDiff: diff.unifiedDiff,
        },
        data: {
          path: args.path,
          bytesWritten: Buffer.byteLength(args.content, 'utf-8'),
        },
      };
    } catch (err: any) {
      return {
        tool: 'write_to_file',
        success: false,
        error: `Failed to write file ${args.path}: ${err.message}`,
      };
    }
  }

  /**
   * Surgical search-and-replace edit on file content with optional line bounds
   */
  public async replaceFileContent(
    args: ReplaceFileContentArgs,
    currentContent?: string
  ): Promise<ToolExecutionResult> {
    try {
      const fs = await import('node:fs/promises');
      const pathModule = await import('node:path');

      let fileText = currentContent;
      if (fileText === undefined) {
        fileText = await fs.readFile(args.path, 'utf-8');
      }

      // If line bounds are specified, scope the target replacement
      let replaceTargetText = fileText;
      let linePrefix = '';
      let lineSuffix = '';

      if (args.startLine !== undefined && args.endLine !== undefined) {
        const lines = fileText.split('\n');
        const start = Math.max(1, args.startLine);
        const end = Math.min(lines.length, args.endLine);

        linePrefix = lines.slice(0, start - 1).join('\n') + (start > 1 ? '\n' : '');
        const targetLines = lines.slice(start - 1, end).join('\n');
        lineSuffix = (end < lines.length ? '\n' : '') + lines.slice(end).join('\n');

        const replaceRes = applyTargetReplacement(
          targetLines,
          args.targetContent,
          args.replacementContent,
          args.allowMultiple
        );

        if (!replaceRes.success || !replaceRes.newContent) {
          return {
            tool: 'replace_file_content',
            success: false,
            error: replaceRes.error || `Target content not found within specified lines ${start}-${end}`,
          };
        }

        const fullNewContent = linePrefix + replaceRes.newContent + lineSuffix;
        await fs.writeFile(args.path, fullNewContent, 'utf-8');

        const diff = createUnifiedDiff(
          pathModule.basename(args.path),
          fileText,
          fullNewContent
        );

        return {
          tool: 'replace_file_content',
          success: true,
          diff: {
            path: args.path,
            oldContent: fileText,
            newContent: fullNewContent,
            unifiedDiff: diff.unifiedDiff,
          },
        };
      }

      // Unbounded full-file replacement
      const replaceRes = applyTargetReplacement(
        fileText,
        args.targetContent,
        args.replacementContent,
        args.allowMultiple
      );

      if (!replaceRes.success || !replaceRes.newContent) {
        return {
          tool: 'replace_file_content',
          success: false,
          error: replaceRes.error || 'Failed to apply replacement content',
        };
      }

      await fs.writeFile(args.path, replaceRes.newContent, 'utf-8');

      const diff = createUnifiedDiff(
        pathModule.basename(args.path),
        fileText,
        replaceRes.newContent
      );

      return {
        tool: 'replace_file_content',
        success: true,
        diff: {
          path: args.path,
          oldContent: fileText,
          newContent: replaceRes.newContent,
          unifiedDiff: diff.unifiedDiff,
        },
      };
    } catch (err: any) {
      return {
        tool: 'replace_file_content',
        success: false,
        error: `Failed to edit file ${args.path}: ${err.message}`,
      };
    }
  }

  /**
   * Fast git-aware file finder using fdir with custom excludes and type filtering
   */
  public async findByName(args: FindByNameArgs): Promise<ToolExecutionResult> {
    try {
      const searchDir = args.directory || this.workspaceRoot;
      const defaultExcludes = ['node_modules', '.git', 'dist', 'target', '.next', '.cache'];
      const userExcludes = args.excludes || [];
      const allExcludes = [...defaultExcludes, ...userExcludes];

      const crawler = new fdir()
        .withRelativePaths()
        .exclude((dirName) => allExcludes.includes(dirName));

      if (args.maxDepth) {
        crawler.withMaxDepth(args.maxDepth);
      }

      const files = (await crawler.crawl(searchDir).withPromise()) as string[];

      const patternLower = args.pattern.toLowerCase();
      const matched = files.filter((f) => {
        const nameMatches = f.toLowerCase().includes(patternLower);
        return nameMatches;
      });

      return {
        tool: 'find_by_name',
        success: true,
        data: {
          directory: searchDir,
          matches: matched.slice(0, 50),
          totalMatches: matched.length,
        },
      };
    } catch (err: any) {
      return {
        tool: 'find_by_name',
        success: false,
        error: `Failed to search files in ${args.directory}: ${err.message}`,
      };
    }
  }

  /**
   * List directory children with size and item metadata
   */
  public async listDir(args: ListDirArgs): Promise<ToolExecutionResult> {
    try {
      const fs = await import('node:fs/promises');
      const pathModule = await import('node:path');

      const entries = await fs.readdir(args.directoryPath, { withFileTypes: true });
      const results = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = pathModule.join(args.directoryPath, entry.name);
          let size = 0;
          try {
            const stat = await fs.stat(fullPath);
            size = stat.size;
          } catch {}

          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
            size,
          };
        })
      );

      return {
        tool: 'list_dir',
        success: true,
        data: {
          directory: args.directoryPath,
          items: results,
        },
      };
    } catch (err: any) {
      return {
        tool: 'list_dir',
        success: false,
        error: `Failed to list directory ${args.directoryPath}: ${err.message}`,
      };
    }
  }
}
