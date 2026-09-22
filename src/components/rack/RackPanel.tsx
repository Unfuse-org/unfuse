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
    // Guard: Ensure only one model per provider is mounted
    const filtered = models.filter((m) => m.provider !== newModel.provider);
    const isFirst = filtered.length === 0;
    onModelsChange([...filtered, { ...newModel, status: isFirst ? 'active' : 'loaded' }]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#161618] overflow-hidden text-white/90 select-none relative">
      {/* 1. BLADE CONFIG VIEW IN-PANEL */}
      {editingModel ? (
        <BladeConfigView
          model={editingModel}
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
          {/* TOP DRAG REGION & CENTERED PIXEL HEADER */}
          <div
            className="h-10 w-full flex-shrink-0 flex items-center justify-center cursor-default pt-2"
            data-tauri-drag-region
          >
            {models.length > 0 && (
              <h2 className="font-['Press_Start_2P',monospace] text-[12.5px] text-white tracking-wide uppercase text-center select-none pt-1">
                Active Models
              </h2>
            )}
          </div>

          {models.length === 0 ? (
        /* 2. INITIAL EMPTY STATE: BIG + WITH SMALL 'LOAD MODELS' TEXT */
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <button
            type="button"
            onClick={() => setIsMountingOpen(true)}
            className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl hover:bg-white/[0.04] active:scale-95 transition-all duration-150 cursor-pointer"
          >
            {/* BIG + ICON */}
            <div className="w-12 h-12 rounded-xl bg-white/[0.04] group-hover:bg-white/[0.08] border border-white/10 group-hover:border-white/25 flex items-center justify-center transition-all duration-150 shadow-sm">
              <Plus className="w-6 h-6 text-white/40 group-hover:text-white transition-colors" strokeWidth={1.5} />
            </div>

            {/* SMALL TEXT */}
            <span className="text-[11px] font-medium text-white/40 group-hover:text-white/80 transition-colors tracking-tight">
              Load models
            </span>
          </button>
        </div>
      ) : (
        /* 3. MOUNTED MODEL BLADES STACK */
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 flex flex-col">
          {/* MODEL CARDS */}
          {models.map((model) => (
            <ModelBladeCard
              key={model.id}
              model={model}
              onOpenInfo={setSelectedInfoModel}
              onOpenConfig={setEditingModel}
              onSetPrimary={handleSetPrimary}
              onUnload={handleUnload}
              onEject={handleEject}
            />
          ))}

          {/* ADD MODEL BUTTON (PIXEL FONT, NO ICON) */}
          <button
            onClick={() => setIsMountingOpen(true)}
            className="w-full py-2.5 mt-1 rounded-xl border border-dashed border-white/10 hover:border-white/25 hover:bg-white/[0.03] text-white/40 hover:text-white transition-all flex items-center justify-center font-['Press_Start_2P',monospace] text-[8.5px] tracking-wider uppercase cursor-pointer"
          >
            Add Model
          </button>
        </div>
      )}
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
