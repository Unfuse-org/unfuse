import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { LocalModelBlade } from './types';
import { ModelBladeCard } from './ModelBladeCard';
import { MountModelView } from './MountModelView';
import { ModelInfoModal } from './ModelInfoModal';
import { BladeConfigView } from './BladeConfigView';

export interface RackPanelProps {
  models: LocalModelBlade[];
  onModelsChange: (models: LocalModelBlade[]) => void;
}

export const RackPanel: React.FC<RackPanelProps> = ({ models, onModelsChange }) => {
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [isMountingOpen, setIsMountingOpen] = useState(false);
  const [selectedInfoModel, setSelectedInfoModel] = useState<LocalModelBlade | null>(null);
  const [editingModel, setEditingModel] = useState<LocalModelBlade | null>(null);

  // Listen for live streaming token updates to animate context window progress bar
  React.useEffect(() => {
    const handleTokenUpdate = (
      e: CustomEvent<{ modelName: string; tokensUsed: number; speedTokPerSec?: number }>
    ) => {
      if (!e.detail) return;
      const { modelName, tokensUsed, speedTokPerSec } = e.detail;
      onModelsChange(
        models.map((m) => {
          if (m.name === modelName || m.displayName === modelName || models.length === 1) {
            return {
              ...m,
              tokensUsed: Math.max(m.tokensUsed || 0, tokensUsed),
              speedTokPerSec: speedTokPerSec !== undefined ? speedTokPerSec : m.speedTokPerSec,
            };
          }
          return m;
        })
      );
    };

    window.addEventListener('unfuse-tokens-update', handleTokenUpdate as EventListener);
    return () => {
      window.removeEventListener('unfuse-tokens-update', handleTokenUpdate as EventListener);
    };
  }, [models, onModelsChange]);

  const handleSetPrimary = (id: string) => {
    onModelsChange(
      models.map((m) => ({
        ...m,
        status: m.id === id ? 'active' : m.status === 'active' ? 'loaded' : m.status,
      }))
    );
  };

  const handleSaveConfig = (updated: LocalModelBlade) => {
    onModelsChange(
      models.map((m) => {
        if (m.id === updated.id) {
          return updated;
        }
        // If the updated model became active primary, demote other active models to loaded
        if (updated.status === 'active' && m.status === 'active') {
          return { ...m, status: 'loaded' };
        }
        return m;
      })
    );
  };

  const handleUnload = (id: string) => {
    // Unloading frees the model slot from the rack
    onModelsChange(models.filter((m) => m.id !== id));
  };

  const handleEject = (id: string) => {
    onModelsChange(models.filter((m) => m.id !== id));
  };

  const handleMountModel = (newModel: LocalModelBlade) => {
    if (models.length >= 6 || models.some(model => model.provider === newModel.provider)) return;
    onModelsChange([...models, newModel]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-panel)] overflow-hidden text-[var(--text-main)] select-none relative">
      {/* 1. BLADE CONFIG VIEW IN-PANEL */}
      {editingModel ? (
        <BladeConfigView
          model={editingModel}
          customIcon={customIcons[editingModel.id]}
          onIconChange={icon => setCustomIcons(current => ({ ...current, [editingModel.id]: icon ?? '' }))}
          onClose={() => setEditingModel(null)}
          onSave={handleSaveConfig}
          onUnload={handleUnload}
        />
      ) : isMountingOpen ? (
        /* 2. MOUNTING VIEW IN-PANEL */
        <MountModelView
          onClose={() => setIsMountingOpen(false)}
          onMountModel={handleMountModel}
          mountedModels={models}
        />
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3">
            {models.length === 0 ? <div className="flex flex-col items-center justify-center h-full min-h-40 px-6 text-center"><Plus size={24} strokeWidth={1.4} className="text-[var(--text-muted)] mb-3" /><p className="text-sm">Add your first model</p><p className="text-[11px] leading-5 mt-2 text-[var(--text-muted)]">Choose a model from your local inference provider.</p></div> : <div className="space-y-1">{models.map(model => <ModelBladeCard customIcon={customIcons[model.id]} key={model.id} model={model} onOpenInfo={setSelectedInfoModel} onOpenConfig={setEditingModel} onSetPrimary={handleSetPrimary} onUnload={handleUnload} onEject={handleEject} />)}</div>}
          </div>
          <div className="shrink-0 px-3 pb-3 pt-2"><button disabled={models.length >= 6} onClick={() => setIsMountingOpen(true)} className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] transition-colors"><Plus size={14} />Add model</button></div>

    </>
  )}

      {/* EASTER EGG: MODEL INFO POPUP MODAL (CENTERED IN APP) */}
      <ModelInfoModal
        model={selectedInfoModel}
        onClose={() => setSelectedInfoModel(null)}
      />
</div>
  );
};
