import React from 'react';
import { LocalModelBlade } from './types';
import { getModelLogo } from './MountModelView';
import { Settings } from 'lucide-react';

interface ModelBladeCardProps {
  model: LocalModelBlade;
  onOpenInfo?: (model: LocalModelBlade) => void;
  onOpenConfig?: (model: LocalModelBlade) => void;
  onSetPrimary?: (id: string) => void;
  onUnload?: (id: string) => void;
  onEject?: (id: string) => void;
}

export const ModelBladeCard: React.FC<ModelBladeCardProps> = ({
  model,
  onOpenInfo,
  onOpenConfig,
}) => {
  const contextLength = model.contextLength || 32768;
  const tokensUsed = model.tokensUsed || 0;
  const percentUsed = Math.min(100, Math.round((tokensUsed / contextLength) * 100));

  return (
    <div className="bg-black border border-white/10 hover:border-white/20 rounded-xl p-3 select-none transition-all group">
      {/* TOP ROW: LOGO, MODEL NAME, PORT & CONFIG BUTTON */}
      <div className="flex items-center gap-2.5">
        {/* WHITE LOGO BADGE (CLICKABLE EASTER EGG FOR MODEL INFO) */}
        <button
          type="button"
          onClick={() => onOpenInfo?.(model)}
          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm"
          title="Click for Model Info"
        >
          {getModelLogo(model.family)}
        </button>

        {/* MODEL NAME & PORT ALIGNED HORIZONTALLY ON THE SAME LEVEL */}
        <div className="flex items-center justify-between min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-white tracking-tight truncate">
            {model.displayName}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] text-white font-mono font-bold">
              {model.port}
            </span>

            {/* CONFIG GEAR BUTTON */}
            <button
              type="button"
              onClick={() => onOpenConfig?.(model)}
              className="p-1 rounded-md text-white/25 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Configure blade & unload options"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* DOWNSIDE: SMALL CONTEXT WINDOW BAR */}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-[9.5px] font-mono mb-1.5 text-white/40">
          <span>Tokens</span>
          <span className="text-white/70">{tokensUsed.toLocaleString()} / {contextLength.toLocaleString()}</span>
        </div>

        {/* PROGRESS BAR TRACK */}
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          {/* PROGRESS BAR FILL */}
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${Math.max(tokensUsed > 0 ? 2 : 0, percentUsed)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
