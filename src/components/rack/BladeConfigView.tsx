import React, { useState } from 'react';
import { LocalModelBlade } from './types';
import { getModelLogo } from './MountModelView';
import { ArrowLeft, PowerOff, Save, Check } from 'lucide-react';

interface BladeConfigViewProps {
  model: LocalModelBlade;
  onClose: () => void;
  onSave: (updated: LocalModelBlade) => void;
  onUnload: (id: string) => void;
}

const CONTEXT_PRESETS = [4096, 8192, 16384, 32768, 65536, 128000];
const MAX_TOKENS_PRESETS = [1024, 2048, 4096, 8192, 16384];

export const BladeConfigView: React.FC<BladeConfigViewProps> = ({
  model,
  onClose,
  onSave,
  onUnload,
}) => {
  const [contextLength, setContextLength] = useState<number>(model.contextLength || 32768);
  const [temperature, setTemperature] = useState<number>(
    model.temperature !== undefined ? model.temperature : 0.2
  );
  const [topP, setTopP] = useState<number>(model.topP !== undefined ? model.topP : 0.9);
  const [repetitionPenalty, setRepetitionPenalty] = useState<number>(
    model.repetitionPenalty !== undefined ? model.repetitionPenalty : 1.1
  );
  const [maxTokens, setMaxTokens] = useState<number>(
    model.maxTokens !== undefined ? model.maxTokens : 4096
  );
  const [isPrimary, setIsPrimary] = useState<boolean>(model.status === 'active');

  const handleSave = () => {
    onSave({
      ...model,
      contextLength,
      temperature,
      topP,
      repetitionPenalty,
      maxTokens,
      status: isPrimary ? 'active' : model.status === 'active' ? 'loaded' : model.status,
    });
    onClose();
  };

  const handleUnloadClick = () => {
    onUnload(model.id);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161618] px-3.5 pt-2.5 pb-3 text-white/90 overflow-y-auto select-none font-sans">
      {/* 1. TOP HEADER & MODEL IDENTITY (UNIFIED SINGLE BAR) */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]" data-tauri-drag-region>
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <button
            type="button"
            onClick={onClose}
            title="Back to Active Models"
            className="p-1 -ml-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* WHITE LOGO BADGE (ALIGNED AT SAME HEIGHT) */}
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5 shrink-0 shadow-sm border border-white/20">
            {getModelLogo(model.family, 14)}
          </div>

          {/* MODEL NAME & PORT ALIGNED ON EXACT HORIZONTAL BASELINE */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-xs font-bold text-white tracking-tight truncate">
              {model.displayName}
            </span>
            <span className="text-[10px] font-mono font-bold text-white bg-white/10 px-1.5 py-0.2 rounded border border-white/15 shrink-0">
              {model.port}
            </span>
          </div>
        </div>

        {/* PRIMARY TOGGLE PILL */}
        <button
          type="button"
          onClick={() => setIsPrimary(!isPrimary)}
          className={`h-5 px-2 rounded text-[9.5px] font-mono font-bold tracking-tight transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
            isPrimary
              ? 'bg-white text-black shadow-xs'
              : 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.12] border border-white/10'
          }`}
        >
          {isPrimary && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          <span>{isPrimary ? 'PRIMARY' : 'SET PRIMARY'}</span>
        </button>
      </div>

      {/* 2. UNIFIED HARDWARE INSPECTOR PARAMETERS */}
      <div className="flex-1 bg-black/40 border border-white/[0.08] rounded-xl p-3.5 space-y-4 shadow-sm">
        {/* CONTEXT LIMIT */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/80">Context Limit</span>
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {contextLength.toLocaleString()} tok
            </span>
          </div>

          <input
            type="range"
            min="2048"
            max="131072"
            step="2048"
            value={contextLength}
            onChange={(e) => setContextLength(Number(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-zinc-200 transition-all"
          />

          <div className="flex items-center justify-between mt-2.5 gap-1.5">
            {CONTEXT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setContextLength(preset)}
                className={`py-1 px-1.5 rounded-md text-[10px] font-mono transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                  contextLength === preset
                    ? 'bg-white text-black font-bold border-white shadow-sm'
                    : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
                }`}
              >
                {preset >= 1000 ? `${preset / 1024}k` : preset}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* TEMPERATURE */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/80">Temperature</span>
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {temperature.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-zinc-200 transition-all"
          />

          <div className="flex items-center justify-between mt-2.5 gap-1.5 text-[10.5px] font-medium">
            <button
              type="button"
              onClick={() => setTemperature(0.0)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                temperature === 0.0
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              0.00 Strict
            </button>
            <button
              type="button"
              onClick={() => setTemperature(0.2)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                temperature === 0.2
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              0.20 Code
            </button>
            <button
              type="button"
              onClick={() => setTemperature(0.7)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                temperature === 0.7
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              0.70 Chat
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* TOP-P SAMPLING */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/80">Top-P (Nucleus)</span>
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {topP.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(Number(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-zinc-200 transition-all"
          />

          <div className="flex items-center justify-between mt-2.5 gap-1.5 text-[10.5px] font-medium">
            <button
              type="button"
              onClick={() => setTopP(0.5)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                topP === 0.5
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              0.50 Focused
            </button>
            <button
              type="button"
              onClick={() => setTopP(0.9)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                topP === 0.9
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              0.90 Normal
            </button>
            <button
              type="button"
              onClick={() => setTopP(1.0)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                topP === 1.0
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              1.00 Max
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* REPETITION PENALTY */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/80">Repetition Penalty</span>
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {repetitionPenalty.toFixed(2)}
            </span>
          </div>

          <input
            type="range"
            min="1.0"
            max="1.3"
            step="0.02"
            value={repetitionPenalty}
            onChange={(e) => setRepetitionPenalty(Number(e.target.value))}
            className="w-full h-1 bg-white/15 rounded-lg appearance-none cursor-pointer accent-zinc-300 hover:accent-zinc-200 transition-all"
          />

          <div className="flex items-center justify-between mt-2.5 gap-1.5 text-[10.5px] font-medium">
            <button
              type="button"
              onClick={() => setRepetitionPenalty(1.0)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                repetitionPenalty === 1.0
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              1.00 Off
            </button>
            <button
              type="button"
              onClick={() => setRepetitionPenalty(1.1)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                repetitionPenalty === 1.1
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              1.10 Normal
            </button>
            <button
              type="button"
              onClick={() => setRepetitionPenalty(1.2)}
              className={`py-1 px-2 rounded-md transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                repetitionPenalty === 1.2
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
              }`}
            >
              1.20 Strict
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* MAX OUTPUT TOKENS */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/80">Max Output</span>
            <span className="text-[11px] font-mono font-bold text-white tabular-nums">
              {maxTokens.toLocaleString()} tok
            </span>
          </div>

          <div className="flex items-center justify-between gap-1.5 mt-2.5">
            {MAX_TOKENS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMaxTokens(preset)}
                className={`py-1 px-1.5 rounded-md text-[10px] font-mono transition-all cursor-pointer flex-1 text-center shadow-xs border ${
                  maxTokens === preset
                    ? 'bg-white text-black font-bold border-white shadow-sm'
                    : 'bg-[#1c1c20] hover:bg-[#28282e] border-white/[0.08] hover:border-white/20 text-zinc-300 hover:text-white'
                }`}
              >
                {preset >= 1024 ? `${preset / 1024}k` : preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM ACTIONS: STEALTH UNLOAD & SOLID WHITE SAVE */}
      <div className="pt-3 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleUnloadClick}
          className="flex-1 py-2 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-400 hover:text-red-300 active:scale-[0.98] font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title="Frees slot from rack without deleting model file"
        >
          <PowerOff className="w-3.5 h-3.5" />
          <span>Unload Blade</span>
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-white text-black hover:bg-white/90 active:scale-[0.98] font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Save Config</span>
        </button>
      </div>
    </div>
  );
};
