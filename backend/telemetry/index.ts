import { HardwarePoller } from './hardware';
import { RollingTelemetryBuffer } from './rolling_buffer';
import { MetricsTracker } from './metrics_tracker';
import type { HardwareMetrics, TelemetryDataPoint, GenerationStats } from './types';

export * from './types';
export * from './hardware';
export * from './rolling_buffer';
export * from './metrics_tracker';

/**
 * Main Telemetry Engine for Unfuse
 * Coordinates real-time hardware polling and BTOP sparkline area data
 */
export class TelemetryEngine {
  public poller: HardwarePoller;
  public buffer: RollingTelemetryBuffer;
  public metrics: MetricsTracker;
  private pollInterval: any = null;

  constructor() {
    this.poller = new HardwarePoller();
    this.buffer = new RollingTelemetryBuffer(30);
    this.metrics = new MetricsTracker();
  }

  /**
   * Starts background hardware polling (default 1s interval)
   */
  public startPolling(intervalMs: number = 1000, onUpdate?: (metrics: HardwareMetrics) => void) {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(async () => {
      try {
        const metrics = await this.poller.pollMetrics();
        this.buffer.pushPoint(metrics.cpuUsage, metrics.vramUsagePercent || metrics.memoryUsagePercent);
        if (onUpdate) onUpdate(metrics);
      } catch {}
    }, intervalMs);
    this.pollInterval.unref?.();
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
