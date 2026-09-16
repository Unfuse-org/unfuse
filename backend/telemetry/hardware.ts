import type { HardwareMetrics } from './types';

/**
 * Cross-Platform Hardware Poller (macOS, Windows, Linux)
 * Computes CPU core load, RAM, and Apple Silicon Unified Memory/VRAM
 */
export class HardwarePoller {
  private prevCpuTimes: Array<{ idle: number; total: number }> | null = null;
  private isAppleSilicon: boolean;
  private platform: 'darwin' | 'linux' | 'win32' | 'unknown';
  private osModule: typeof import('node:os') | null = null;

  constructor() {
    this.platform = (process.platform as any) || 'unknown';
    this.isAppleSilicon =
      process.platform === 'darwin' &&
      (process.arch === 'arm64' || (process.env as any).PROCESSOR_ARCHITECTURE === 'ARM64');
  }

  private async getOs(): Promise<typeof import('node:os')> {
    if (!this.osModule) {
      this.osModule = await import('node:os');
    }
    return this.osModule;
  }

  /**
   * Poll current system hardware metrics
   */
  public async pollMetrics(): Promise<HardwareMetrics> {
    const os = await this.getOs();

    // 1. CPU Usage Calculation
    const cpus = os.cpus();
    const coreCount = cpus.length;
    let cpuPercent = 0;

    const currentTimes = cpus.map((c) => {
      const times = c.times;
      const total = times.user + times.nice + times.sys + times.idle + times.irq;
      return { idle: times.idle, total };
    });

    if (this.prevCpuTimes && this.prevCpuTimes.length === currentTimes.length) {
      let totalDiff = 0;
      let idleDiff = 0;

      for (let i = 0; i < currentTimes.length; i++) {
        totalDiff += currentTimes[i].total - this.prevCpuTimes[i].total;
        idleDiff += currentTimes[i].idle - this.prevCpuTimes[i].idle;
      }

      if (totalDiff > 0) {
        cpuPercent = Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 100)));
      }
    } else {
      // First poll approximation from load average
      const load = os.loadavg()[0];
      cpuPercent = Math.min(100, Math.round((load / Math.max(1, coreCount)) * 100));
    }

    this.prevCpuTimes = currentTimes;

    // 2. Memory & VRAM Calculation
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = Math.max(0, totalMemBytes - freeMemBytes);

    const totalGb = Number((totalMemBytes / (1024 * 1024 * 1024)).toFixed(1));
    const usedGb = Number((usedMemBytes / (1024 * 1024 * 1024)).toFixed(1));
    const memPercent = Math.round((usedMemBytes / Math.max(1, totalMemBytes)) * 100);

    // On Apple Silicon, Unified Memory serves as both RAM and GPU VRAM
    let vramTotalGb: number | undefined = totalGb;
    let vramUsedGb: number | undefined = usedGb;
    let vramPercent: number | undefined = memPercent;

    if (!this.isAppleSilicon) {
      vramTotalGb = undefined;
      vramUsedGb = undefined;
      vramPercent = undefined;
    }

    return {
      cpuUsage: cpuPercent,
      coreCount,
      memoryTotalGb: totalGb,
      memoryUsedGb: usedGb,
      memoryUsagePercent: memPercent,
      vramTotalGb,
      vramUsedGb,
      vramUsagePercent: vramPercent,
      isAppleSilicon: this.isAppleSilicon,
      platform: this.platform,
      timestamp: Date.now(),
    };
  }
}
