import React, { useState, useRef, useEffect } from 'react';
import { ActiveModelTarget, HardwareTelemetry } from './types';
import { nativeGetTelemetry } from '../../services/tauriBridge';

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

  const [telemetry, setTelemetry] = useState<HardwareTelemetry>({
    cpu_usage_pct: 0,
    cpu_cores: 8,
    cpu_brand: 'Apple Silicon / Host Hardware',
    ram_used_gb: 0,
    ram_total_gb: 16.0,
    ram_usage_pct: 0,
    swap_used_gb: 0,
    swap_total_gb: 0,
    gpu_name: 'Apple Silicon / Metal Unified GPU',
    gpu_vendor: 'Apple',
    vram_used_gb: 0,
    vram_total_gb: 12.0,
    vram_usage_pct: 0,
    gpu_temp_c: 41,
  });

  const [cpuHistory, setCpuHistory] = useState<number[]>([
    10, 12, 15, 14, 18, 16, 20, 22, 18, 15, 14, 16, 19, 18, 16, 18, 20,
  ]);
  const [vramHistory, setVramHistory] = useState<number[]>([
    30, 30, 31, 31, 31, 31, 31, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32,
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      const stats = await nativeGetTelemetry();
      if (!stats || !mounted) return;
      setTelemetry((prev) => ({
        ...prev,
        ...stats,
      }));
      setCpuHistory((prev) => [...prev.slice(1), stats.cpu_usage_pct]);
      setVramHistory((prev) => [...prev.slice(1), stats.vram_usage_pct]);
    };

    fetchStats();
    const interval = setInterval(fetchStats, isOpen || isStreaming ? 1200 : 3500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOpen, isStreaming]);



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
      const x = (idx / Math.max(data.length - 1, 1)) * width;
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
                stopColor={isSpike ? '#ef4444' : '#38bdf8'}
                stopOpacity={isSpike ? 0.4 : 0.25}
              />
              <stop
                offset="100%"
                stopColor={isSpike ? '#ef4444' : '#38bdf8'}
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

  const cpuVal = Math.round(telemetry.cpu_usage_pct);
  const vramVal = Math.round(telemetry.vram_usage_pct);
  const isAppleSilicon = telemetry.gpu_vendor === 'Apple Silicon';
  const isNvidia = telemetry.gpu_vendor === 'NVIDIA';
  const isAmd = telemetry.gpu_vendor === 'AMD';

  return (
    <div className="relative inline-flex items-center justify-center w-full h-full">
      {/* 2 MINIMAL CIRCULAR INDICATORS IN TOOLBAR */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Open Real Hardware Telemetry HUD"
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
              stroke={cpuVal > 75 ? '#ef4444' : '#38bdf8'}
              strokeWidth="2"
              strokeDasharray={37.7}
              strokeDashoffset={37.7 - (37.7 * Math.min(cpuVal, 100)) / 100}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          {isStreaming && (
            <span className="absolute w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>

        {/* CIRCLE 2: VRAM / RAM RING */}
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
              stroke={vramVal > 85 ? '#ef4444' : '#a855f7'}
              strokeWidth="2"
              strokeDasharray={37.7}
              strokeDashoffset={37.7 - (37.7 * Math.min(vramVal, 100)) / 100}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
        </div>

        <span className="text-[10.5px] font-mono text-white/60 group-hover:text-white transition-colors">
          {vramVal}%
        </span>
      </button>

      {/* FULL-SCREEN CENTERED MODAL POPUP WITH BLURRED BACKDROP */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          {/* MODAL CARD */}
          <div
            ref={popoverRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[500px] bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] p-5 animate-in zoom-in-95 duration-150 font-mono text-xs select-none relative"
          >
            {/* HEADER: HARDWARE VENDOR BADGE & TITLE */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-sm text-white tracking-tight">HARDWARE TELEMETRY</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10.5px] font-semibold text-white/90">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAppleSilicon
                      ? 'bg-purple-400'
                      : isNvidia
                      ? 'bg-emerald-400'
                      : isAmd
                      ? 'bg-red-400'
                      : 'bg-sky-400'
                  }`}
                />
                {telemetry.gpu_vendor}
              </div>
            </div>

            {/* MAIN METRICS: CPU & VRAM/RAM ROLLING GRAPHS */}
            <div className="grid grid-cols-2 gap-3 mb-3.5">
              {/* CPU CARD */}
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-white/80">CPU LOAD</span>
                  <span
                    className={`font-bold text-xs ${
                      cpuVal > 75 ? 'text-red-400' : 'text-sky-400'
                    }`}
                  >
                    {cpuVal}%
                  </span>
                </div>

                {renderRollingGraph(
                  cpuHistory,
                  cpuVal > 75,
                  'cpuGradModal',
                  cpuVal > 75 ? '#ef4444' : '#38bdf8'
                )}

                <div className="flex items-center justify-between text-[10px] text-white/50 font-mono mt-0.5">
                  <span className="truncate max-w-[120px]">{telemetry.cpu_cores} Cores</span>
                  <span className="text-white/70 truncate max-w-[90px]">{telemetry.cpu_brand}</span>
                </div>
              </div>

              {/* VRAM / RAM CARD */}
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-white/80">
                    {isAppleSilicon ? 'UNIFIED MEMORY' : isNvidia || isAmd ? 'VRAM ALLOCATION' : 'SYSTEM RAM'}
                  </span>
                  <span
                    className={`font-bold text-xs ${
                      vramVal > 85 ? 'text-red-400' : 'text-purple-400'
                    }`}
                  >
                    {telemetry.vram_used_gb} / {telemetry.vram_total_gb} GB
                  </span>
                </div>

                {renderRollingGraph(
                  vramHistory,
                  vramVal > 85,
                  'vramGradModal',
                  vramVal > 85 ? '#ef4444' : '#a855f7'
                )}

                <div className="flex items-center justify-between text-[10px] text-white/50 font-mono mt-0.5">
                  <span>Usage</span>
                  <span className="text-white/80 font-semibold">{vramVal}%</span>
                </div>
              </div>
            </div>

            {/* SECONDARY HARDWARE DETAILS GRID */}
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {/* GPU MODEL */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-white/40 text-[9.5px] uppercase tracking-wider mb-1">
                  Active Accelerator
                </div>
                <div className="text-white/90 font-medium text-[11px] truncate">
                  {telemetry.gpu_name}
                </div>
              </div>

              {/* HOST RAM & SWAP */}
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-white/40 text-[9.5px] uppercase tracking-wider mb-1">
                  Host RAM / Swap
                </div>
                <div className="text-white/90 font-medium text-[11px]">
                  {telemetry.ram_used_gb} GB RAM · {telemetry.swap_used_gb} GB Swap
                </div>
              </div>
            </div>

            {/* PERFORMANCE HUD ROW */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-center">
              <div>
                <div className="text-white/40 text-[9.5px] uppercase tracking-wider mb-0.5">
                  LLM Streaming
                </div>
                <div className={`font-bold text-xs ${isStreaming ? 'text-emerald-400' : 'text-white/60'}`}>
                  {isStreaming ? 'Active Engine' : 'Idle'}
                </div>
              </div>
              <div>
                <div className="text-white/40 text-[9.5px] uppercase tracking-wider mb-0.5">
                  Hardware Mode
                </div>
                <div className="text-white font-bold text-xs truncate">
                  {isAppleSilicon ? 'Metal / AMX' : isNvidia ? 'CUDA Core' : isAmd ? 'ROCm / HIP' : 'AVX-512 / CPU'}
                </div>
              </div>
              <div>
                <div className="text-white/40 text-[9.5px] uppercase tracking-wider mb-0.5">
                  Device Temp
                </div>
                <div className="text-white font-bold text-xs">
                  {telemetry.gpu_temp_c !== null ? `${telemetry.gpu_temp_c}°C` : 'Nominal'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
