import type { GenerationStats } from './types';

/**
 * Generation Metrics & Token Performance Tracker
 */
export class MetricsTracker {
  private currentStats: GenerationStats = {
    tokensPerSec: 0,
    timeToFirstTokenMs: 0,
    kvCachePercent: 0,
    activeContextTokens: 0,
  };

  public recordGeneration(
    tokensPerSec: number,
    ttftMs: number,
    contextTokens: number,
    maxContextTokens: number = 16384
  ) {
    const kvPercent = Math.min(100, Math.round((contextTokens / Math.max(1, maxContextTokens)) * 100));

    this.currentStats = {
      tokensPerSec: Number(tokensPerSec.toFixed(1)),
      timeToFirstTokenMs: Math.round(ttftMs),
      kvCachePercent: kvPercent,
      activeContextTokens: contextTokens,
    };
  }

  public getStats(): GenerationStats {
    return { ...this.currentStats };
  }
}
