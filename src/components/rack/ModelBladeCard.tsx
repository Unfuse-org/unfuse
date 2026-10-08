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
  const hasKnownContext = typeof model.contextLength === 'number' && model.contextLength > 0;
  const contextLength = hasKnownContext ? model.contextLength : null;
  const tokensUsed = model.tokensUsed || 0;
  const percentUsed = contextLength ? Math.min(100, Math.round((tokensUsed / contextLength) * 100)) : 0;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl p-3 select-none transition-all group shadow-sm">
      {/* TOP ROW: LOGO, MODEL NAME, PORT & CONFIG BUTTON */}
      <div className="flex items-center gap-2.5">
        {/* WHITE LOGO BADGE (CLICKABLE EASTER EGG FOR MODEL INFO) */}
        <button
          type="button"
          onClick={() => onOpenInfo?.(model)}
          className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shrink-0 hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm"
          title="Click for Model Info"
        >
          {getModelLogo(model.family, model.provider, 16)}
        </button>

        {/* MODEL NAME & PORT ALIGNED HORIZONTALLY ON THE SAME LEVEL */}
        <div className="flex items-center justify-between min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-[var(--text-main)] tracking-tight truncate">
            {model.displayName}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-[11px] text-[var(--text-main)] font-mono font-bold">
              {model.port}
            </span>

            {/* CONFIG GEAR BUTTON */}
            <button
              type="button"
              onClick={() => onOpenConfig?.(model)}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors cursor-pointer"
              aria-label={`Configure ${model.displayName}`} title="Configure model"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}><span className="capitalize">{model.provider}</span><span>{model.status === 'active' ? 'Default in rack' : 'Connected'}</span></div>
      {/* DOWNSIDE: SMALL CONTEXT WINDOW BAR */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-[9.5px] font-mono mb-1.5 text-[var(--text-muted)]">
          <span>Context usage</span>
          <span className="text-[var(--text-muted)]">
            {tokensUsed.toLocaleString()} / {contextLength ? contextLength.toLocaleString() : 'Auto'}
          </span>
        </div>

        {/* PROGRESS BAR TRACK */}
        <div className="h-1 w-full bg-[var(--bg-active)] rounded-full overflow-hidden">
          {/* PROGRESS BAR FILL */}
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
            style={{ width: contextLength ? `${Math.max(tokensUsed > 0 ? 2 : 0, percentUsed)}%` : tokensUsed > 0 ? '100%' : '0%' }}
          />
        </div>
      </div>
    </div>
  );
};
