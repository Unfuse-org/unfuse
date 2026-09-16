import React, { useState, useRef, useEffect } from 'react';
import { ActiveModelTarget } from './types';

interface BtopTelemetryPopoverProps {
  activeModel?: ActiveModelTarget;
  isStreaming?: boolean;
}

export const BtopTelemetryPopover: React.FC<BtopTelemetryPopoverProps> = ({
  activeModel,
  isStreaming = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Simulated live fluctuating telemetry & rolling history
  const [cpuUsage, setCpuUsage] = useState(28);
  const [vramUsageGb, setVramUsageGb] = useState(19.8);
  const totalVramGb = 36.0;
  const vramPercent = Math.round((vramUsageGb / totalVramGb) * 100);

  const [cpuHistory, setCpuHistory] = useState<number[]>([
    22, 24, 28, 25, 30, 27, 34, 38, 31, 28, 26, 29, 32, 28, 27, 30, 28,
  ]);
  const [vramHistory, setVramHistory] = useState<number[]>([
    53, 54, 55, 55, 55, 55, 55, 55, 55, 55, 55, 56, 55, 55, 55, 55, 55,
  ]);

  // Fluctuations and rolling history on timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.48) * 4;
        const target = isStreaming ? 64 : 28;
        const nextVal = Math.min(Math.max(Math.round(target + delta), 8), 98);
        setCpuHistory((hist) => [...hist.slice(1), nextVal]);
        return nextVal;
      });
      setVramUsageGb((prev) => {
        const delta = (Math.random() - 0.5) * 0.2;
        const nextGb = parseFloat(Math.min(Math.max(19.8 + delta, 14), 34).toFixed(1));
        const nextPct = Math.round((nextGb / totalVramGb) * 100);
        setVramHistory((hist) => [...hist.slice(1), nextPct]);
        return nextGb;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Helper to render authentic btop rolling area graph
  const renderRollingGraph = (
    data: number[],
    isSpike: boolean,
    gradientId: string,
    strokeColor: string
  ) => {
    const width = 200;
    const height = 44;
    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = Math.max(2, Math.min(height - 2, height - (val / 100) * (height - 6) - 3));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;

    return (
      <div className="w-full h-11 bg-white/[0.03] rounded-lg overflow-hidden relative mb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={isSpike ? '#ef4444' : '#ffffff'}
                stopOpacity={isSpike ? 0.4 : 0.2}
              />
              <stop
                offset="100%"
                stopColor={isSpike ? '#ef4444' : '#ffffff'}
                stopOpacity={0.0}
              />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  };

  // Close on outside click or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center justify-center w-full h-full">
      {/* 2 MINIMAL CIRCULAR INDICATORS IN TOOLBAR */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open System Telemetry HUD"
        className="flex items-center justify-center gap-1.5 w-full h-full transition-all cursor-pointer group active:scale-95"
      >
        {/* CIRCLE 1: CPU LOAD RING */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="2"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="transparent"
              stroke={cpuUsage > 70 ? '#ef4444' : '#f5f5f5'}
              strokeWidth="2"
              strokeDasharray={37.7}
              strokeDashoffset={37.7 - (37.7 * cpuUsage) / 100}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          {isStreaming && (
            <span className="absolute w-1 h-1 rounded-full bg-red-500 animate-ping" />
          )}
        </div>

        {/* CIRCLE 2: VRAM RING */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 16 16">
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="2"
            />
            <circle
              cx="8"
              cy="8"
              r="6"
              fill="transparent"
              stroke={vramPercent > 80 ? '#ef4444' : '#e5e5e5'}
              strokeWidth="2"
              strokeDasharray={37.7}
              strokeDashoffset={37.7 - (37.7 * vramPercent) / 100}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>

        <span className="text-[10.5px] font-mono text-white/60 group-hover:text-white transition-colors">
          {vramPercent}%
        </span>
      </button>

      {/* FULL-SCREEN CENTERED MODAL POPUP WITH BLURRED BACKDROP */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          {/* MODAL CARD */}
          <div
            ref={popoverRef}
            className="w-full max-w-[460px] bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-5 animate-in zoom-in-95 duration-150 font-mono text-xs select-none relative"
          >
            {/* MAIN METRICS: CPU & VRAM ROLLING GRAPHS */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* CPU CARD */}
              <div className="bg-white/[0.03] rounded-xl p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-white/80">CPU LOAD</span>
                  <span className={`font-bold text-xs ${cpuUsage > 70 ? 'text-red-400' : 'text-white'}`}>
                    {cpuUsage}%
                  </span>
                </div>

                {renderRollingGraph(
                  cpuHistory,
                  cpuUsage > 70,
                  'cpuGradModal',
                  cpuUsage > 70 ? '#ef4444' : '#f5f5f5'
                )}

                <div className="flex items-center justify-between text-[10px] text-white/40 font-mono mt-0.5">
                  <span>10 Cores</span>
                  <span className={cpuUsage > 70 ? 'text-red-400' : 'text-white/60'}>41°C · 34W</span>
                </div>
              </div>

              {/* VRAM CARD */}
              <div className="bg-white/[0.03] rounded-xl p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-white/80">UNIFIED VRAM</span>
                  <span className={`font-bold text-xs ${vramPercent > 80 ? 'text-red-400' : 'text-white'}`}>
                    {vramUsageGb} / {totalVramGb} GB
                  </span>
                </div>

                {renderRollingGraph(
                  vramHistory,
                  vramPercent > 80,
                  'vramGradModal',
                  vramPercent > 80 ? '#ef4444' : '#e5e5e5'
                )}

                <div className="flex items-center justify-between text-[10px] text-white/40 font-mono mt-0.5">
                  <span>Bandwidth</span>
                  <span className="text-white/80 font-semibold">154 GB/s</span>
                </div>
              </div>
            </div>

            {/* PERFORMANCE HUD ROW */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-white/[0.03] text-center">
              <div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">Speed</div>
                <div className="text-white font-bold text-xs">58.4 tok/s</div>
              </div>
              <div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">TTFT</div>
                <div className="text-white font-bold text-xs">140 ms</div>
              </div>
              <div>
                <div className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">KV Cache</div>
                <div className="text-white font-bold text-xs">1.4 GB</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
