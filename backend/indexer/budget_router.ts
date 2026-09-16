import type { ModelTier, RepoMapResult, ContextSlice } from './types';

/**
 * Adaptive Context Budget Router
 * Detects model capability tier and wraps indexer context in strict XML containers
 */
export class BudgetRouter {
  /**
   * Infers model tier based on parameter name or family
   * e.g. "qwen2.5-coder:1.5b" -> 'micro', "llama3.1:8b" -> 'standard', "qwen2.5-coder:32b" -> 'heavy'
   */
  public inferTier(modelName: string): ModelTier {
    const lower = modelName.toLowerCase();

    // Special name overrides
    if (lower.includes('smollm') || lower.includes('tiny')) return 'micro';
    if (
      lower.includes('r1') ||
      lower.includes('deepseek-v3') ||
      lower.includes('claude') ||
      lower.includes('gpt-4')
    ) {
      return 'heavy';
    }

    // Extract numeric parameter count with word-boundary regex
    const match = lower.match(/\b(\d+\.?\d*)b\b/i);
    if (match) {
      const params = parseFloat(match[1]);
      if (params < 4) return 'micro';
      if (params >= 20) return 'heavy';
      return 'standard';
    }

    // Default to standard (7B - 14B)
    return 'standard';
  }

  /**
   * Wraps repo map and active slices into model-appropriate structured XML prompt blocks
   */
  public formatContextForPrompt(
    repoMap: RepoMapResult,
    slices: ContextSlice[] = [],
    modelTier: ModelTier = repoMap.modelTier
  ): string {
    const blocks: string[] = [];

    // 1. REPO MAP CONTAINER
    if (repoMap.formattedMap) {
      blocks.push(
        `<codebase_structure tier="${modelTier}" total_files="${repoMap.indexedFilesCount}">\n${repoMap.formattedMap}\n</codebase_structure>`
      );
    }

    // 2. TARGET FILE SLICES (IF ATTACHED)
    if (slices.length > 0) {
      const sliceBlocks = slices.map((s) => {
        return `<file_slice path="${s.filePath}" lines="${s.startLine}-${s.endLine}">\n${s.code}\n</file_slice>`;
      });
      blocks.push(sliceBlocks.join('\n\n'));
    }

    return blocks.join('\n\n');
  }
}
