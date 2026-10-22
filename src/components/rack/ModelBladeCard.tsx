import React from 'react';
import { LocalModelBlade, LocalProvider } from './types';
import { getModelLogo } from './MountModelView';
import { ModelFamilyLogo, modelLogoCatalog } from '../chat/ModelIdentity';
import { ChevronRight, Info } from 'lucide-react';

interface ModelBladeCardProps {
  model: LocalModelBlade;
  customIcon?: string;
  onOpenInfo?: (model: LocalModelBlade) => void;
  onOpenConfig?: (model: LocalModelBlade) => void;
  onSetPrimary?: (id: string) => void;
  onUnload?: (id: string) => void;
  onEject?: (id: string) => void;
}
const runnerNames: Record<LocalProvider, string> = { ollama: 'Ollama', lmstudio: 'LM Studio', llamacpp: 'llama.cpp', vllm: 'vLLM', mlx: 'Apple MLX', unsloth: 'Unsloth' };

export const ModelBladeCard: React.FC<ModelBladeCardProps> = ({ model, customIcon, onOpenInfo, onOpenConfig }) => {
  const selectedLogo = modelLogoCatalog.find(logo => logo.url === customIcon);
  const capacity = model.contextBudget ?? (model.contextLength && model.contextLength > 0 ? model.contextLength : null);
  const used = Math.max(0, model.tokensUsed || 0);
  const percentage = capacity ? Math.min(100, used / capacity * 100) : 0;
  return <div className="group rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors">
    <div className="flex items-start"><button type="button" onClick={() => onOpenConfig?.(model)} aria-label={`Configure ${model.displayName}`} className="flex items-start gap-3 min-w-0 flex-1 text-left px-3 py-3.5 rounded-lg focus-visible:outline focus-visible:outline-[var(--accent)]">
      <span className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center">{selectedLogo ? <ModelFamilyLogo family={selectedLogo.key} size={22} /> : customIcon ? <img src={customIcon} alt="Custom model icon" className="w-6 h-6 object-contain" /> : getModelLogo(model.family, model.provider, 22, model.name)}</span>
      <span className="min-w-0 flex-1"><span className="flex gap-2 items-center"><span className="truncate text-[13px] font-medium text-[var(--text-main)]" title={model.displayName}>{model.displayName}</span>{model.status === 'active' && <span className="text-[9px] shrink-0 text-[var(--text-muted)]">Default</span>}</span><span className="block text-[11px] text-[var(--text-muted)] mt-1">{runnerNames[model.provider]}</span></span>
      <ChevronRight size={13} className="shrink-0 mt-1 text-[var(--text-muted)]" />
    </button>
    <button type="button" onClick={() => onOpenInfo?.(model)} aria-label={`Information about ${model.displayName}`} title="Model information" className="shrink-0 mr-2 mt-3 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-[var(--accent)]"><Info size={13} /></button>
    </div>
    <div className="px-3 pb-3 pl-12">
      <div className="flex justify-between gap-2 text-[10px] text-[var(--text-muted)] mb-2"><span>{capacity?'Context used':'Max context'}{capacity && <span className="ml-1.5 text-[var(--text-main)] tabular-nums">{Math.round(percentage)}%</span>}</span><span className="tabular-nums">{capacity ? `${used.toLocaleString()} / ${capacity.toLocaleString()}` : model.maxContextLength?.toLocaleString() ?? 'Not reported'}</span></div>
      {!capacity&&<p className="mb-2 text-[10px] text-[var(--text-muted)]">Set a context budget in model settings.</p>}
      <div role={capacity ? 'progressbar' : undefined} aria-label={`Reported context usage for ${model.displayName}`} aria-valuemin={capacity ? 0 : undefined} aria-valuemax={capacity ?? undefined} aria-valuenow={capacity ? Math.min(used, capacity) : undefined} className="relative h-1.5 rounded-full bg-[var(--bg-active)] overflow-hidden">
        <div className="absolute inset-0 origin-left rounded-full transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${percentage / 100})`, backgroundColor: percentage > 85 ? '#e56b6f' : percentage >= 60 ? '#d9a441' : '#48b88a' }} />
        <div aria-hidden="true" className="absolute inset-0 flex justify-evenly pointer-events-none">{[25, 50, 75].map(mark => <span key={mark} className="h-full w-px bg-[var(--bg-surface)] opacity-60" />)}</div>
      </div>
    </div>
  </div>;
};
