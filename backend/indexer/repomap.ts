import type { FileIndexRecord, RepoMapOptions, RepoMapResult } from './types';

/**
 * Aider-style Repo Map Builder
 * Constructs a structural signature tree of the codebase ranked by symbol dependencies
 */
export class RepoMapBuilder {
  /**
   * Build formatted Repo Map from indexed file records
   */
  public buildMap(
    files: FileIndexRecord[],
    options: RepoMapOptions = {}
  ): RepoMapResult {
    const modelTier = options.modelTier || 'standard';
    const maxTokens = options.maxTokens || this.getDefaultBudget(modelTier);
    const focusFilesSet = new Set(options.focusFiles || []);

    // Calculate symbol reference weights (in-degree ranking)
    const symbolScores = this.calculateSymbolRanks(files);

    const outputLines: string[] = [];
    let totalSymbols = 0;
    let accumulatedChars = 0;

    // Sort files: focusFiles first, then by aggregated symbol rank
    const sortedFiles = [...files].sort((a, b) => {
      const isAFocused = focusFilesSet.has(a.path) || focusFilesSet.has(a.relativePath);
      const isBFocused = focusFilesSet.has(b.path) || focusFilesSet.has(b.relativePath);
      if (isAFocused && !isBFocused) return -1;
      if (!isAFocused && isBFocused) return 1;

      const scoreA = a.symbols.reduce((sum, s) => sum + (symbolScores.get(s.name) || 1), 0);
      const scoreB = b.symbols.reduce((sum, s) => sum + (symbolScores.get(s.name) || 1), 0);
      return scoreB - scoreA;
    });

    for (const file of sortedFiles) {
      if (file.symbols.length === 0) continue;

      const fileHeader = `\n${file.relativePath}:`;
      const fileSymbolLines: string[] = [];

      // Sort symbols in file by rank
      const rankedSymbols = [...file.symbols].sort((a, b) => {
        const rA = symbolScores.get(a.name) || 1;
        const rB = symbolScores.get(b.name) || 1;
        return rB - rA;
      });

      // Filter based on model tier density
      const allowedSymbols =
        modelTier === 'micro'
          ? rankedSymbols.filter((s) => s.isExported).slice(0, 4)
          : modelTier === 'standard'
          ? rankedSymbols.slice(0, 10)
          : rankedSymbols;

      for (const sym of allowedSymbols) {
        fileSymbolLines.push(`  │ ${sym.signature}`);
        totalSymbols++;
      }

      if (fileSymbolLines.length > 0) {
        outputLines.push(fileHeader);
        outputLines.push(...fileSymbolLines);
        accumulatedChars += fileHeader.length + fileSymbolLines.reduce((acc, l) => acc + l.length + 1, 0);
      }

      // Accurate token estimate for code (1 token ≈ 3.3 chars)
      const currentTokenEstimate = accumulatedChars / 3.3;
      if (currentTokenEstimate >= maxTokens) {
        break;
      }
    }

    const formattedMap = outputLines.join('\n').trim();
    const tokenCount = Math.ceil(formattedMap.length / 3.3);

    return {
      formattedMap,
      tokenCount,
      indexedFilesCount: sortedFiles.length,
      totalSymbolsCount: totalSymbols,
      modelTier,
    };
  }

  private getDefaultBudget(tier: 'micro' | 'standard' | 'heavy'): number {
    switch (tier) {
      case 'micro':
        return 750;
      case 'standard':
        return 2500;
      case 'heavy':
        return 8000;
    }
  }

  /**
   * Computes graph centrality / in-degree reference counts for symbols using fast token indexing
   */
  private calculateSymbolRanks(files: FileIndexRecord[]): Map<string, number> {
    const scores = new Map<string, number>();

    // Register all defined symbols
    for (const f of files) {
      for (const s of f.symbols) {
        scores.set(s.name, 1);
      }
    }

    // Index all import words across files into a frequency map
    const importWordCounts = new Map<string, number>();
    for (const f of files) {
      for (const imp of f.imports) {
        const words = imp.split(/[^a-zA-Z0-9_$]+/).filter((w) => w.length > 1);
        for (const w of words) {
          importWordCounts.set(w, (importWordCounts.get(w) || 0) + 1);
        }
      }
    }

    // Boost score based on exact import word matches
    for (const [symName, currentScore] of scores.entries()) {
      const matchCount = importWordCounts.get(symName) || 0;
      if (matchCount > 0) {
        scores.set(symName, currentScore + matchCount * 3);
      }
    }

    return scores;
  }
}
