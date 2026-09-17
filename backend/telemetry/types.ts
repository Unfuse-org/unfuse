/**
 * Hardware Telemetry & Performance Types for Unfuse
 */

export interface HardwareMetrics {
  cpuUsage: number; // 0 - 100%
  coreCount: number;
  memoryTotalGb: number;
  memoryUsedGb: number;
  memoryUsagePercent: number; // 0 - 100%
  vramTotalGb?: number;
  vramUsedGb?: number;
  vramUsagePercent?: number; // 0 - 100%
  isAppleSilicon: boolean;
  platform: 'darwin' | 'linux' | 'win32' | 'unknown';
  timestamp: number;
}

export interface TelemetryDataPoint {
  time: number;
  cpu: number;
  vram: number;
}

export interface GenerationStats {
  tokensPerSec: number;
  timeToFirstTokenMs: number;
  kvCachePercent: number;
  activeContextTokens: number;
}
