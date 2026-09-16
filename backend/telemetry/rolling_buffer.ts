import type { TelemetryDataPoint } from './types';

/**
 * Rolling Circular Buffer for real-time BTOP sparkline graphs
 */
export class RollingTelemetryBuffer {
  private buffer: TelemetryDataPoint[] = [];
  private capacity: number;

  constructor(capacity: number = 30) {
    this.capacity = capacity;
    // Pre-populate with flat baseline points
    const now = Date.now();
    for (let i = capacity - 1; i >= 0; i--) {
      this.buffer.push({
        time: now - i * 1000,
        cpu: 10,
        vram: 20,
      });
    }
  }

  public pushPoint(cpu: number, vram: number) {
    this.buffer.push({
      time: Date.now(),
      cpu: Math.max(0, Math.min(100, cpu)),
      vram: Math.max(0, Math.min(100, vram)),
    });

    if (this.buffer.length > this.capacity) {
      this.buffer.shift();
    }
  }

  public getPoints(): TelemetryDataPoint[] {
    return [...this.buffer];
  }

  public getLatest(): TelemetryDataPoint {
    return this.buffer[this.buffer.length - 1] || { time: Date.now(), cpu: 0, vram: 0 };
  }
}
