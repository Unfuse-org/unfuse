import React, { useEffect } from 'react';
import { LocalModelBlade } from './types';
import { getModelLogo } from './MountModelView';
import { resolveModelInfo } from './modelResolver';
import { X, ExternalLink } from 'lucide-react';

interface ModelInfoModalProps {
  model: LocalModelBlade | null;
  onClose: () => void;
}

export const ModelInfoModal: React.FC<ModelInfoModalProps> = ({ model, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!model) return null;

  const resolved = resolveModelInfo(
    {
      id: model.id,
      name: model.name,
      displayName: model.displayName,
      quantization: model.quantization || 'Q4_K_M',
      sizeGb: model.sizeGb,
      defaultRole: model.role,
      family: model.family,
    },
    model.provider
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-black border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-sans select-none text-white animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-white/10 flex items-start justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* LOGO BADGE */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shrink-0 shadow-md border border-white/20">
              {getModelLogo(model.family, model.provider, 24)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white tracking-tight truncate">
                {model.displayName}
              </h3>

              {/* ORANGE MODEL HUB LINK */}
              <a
                href={resolved.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11.5px] font-mono text-orange-400 hover:text-orange-300 transition-colors mt-0.5 group cursor-pointer"
              >
                <span className="truncate underline decoration-orange-400/40 group-hover:decoration-orange-300">
                  {resolved.link.replace(/^https?:\/\//, '')}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0 text-orange-400 group-hover:text-orange-300" />
              </a>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* DESCRIPTION */}
          <div className="text-xs text-white/70 leading-relaxed bg-white/[0.03] p-3 rounded-xl border border-white/[0.05]">
            {resolved.description}
          </div>

          {/* SPECS TABLE */}
          <div>
            <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-2 px-0.5 font-mono">
              Model Specifications
            </div>

            <div className="rounded-xl border border-white/10 overflow-hidden bg-black/40 text-[11px] font-mono">
              <table className="w-full text-left border-collapse">
                <tbody>
                  <tr className="border-b border-white/[0.06]">
                    <td className="py-2 px-3 text-white/40 w-1/3">Architecture</td>
                    <td className="py-2 px-3 text-white font-medium capitalize">{model.family}</td>
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="py-2 px-3 text-white/40">Parameters</td>
                    <td className="py-2 px-3 text-white font-medium">{resolved.parameters}</td>
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="py-2 px-3 text-white/40">Context Limit</td>
                    <td className="py-2 px-3 text-white font-medium">
                      {model.contextLength ? `${model.contextLength.toLocaleString()} tokens` : 'Auto (Model Native)'}
                    </td>
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="py-2 px-3 text-white/40">Quantization</td>
                    <td className="py-2 px-3 text-white font-medium">{model.quantization || 'Q4_K_M'}</td>
                  </tr>
                  <tr className="border-b border-white/[0.06]">
                    <td className="py-2 px-3 text-white/40">VRAM Allocation</td>
                    <td className="py-2 px-3 text-white font-medium">{model.sizeGb} GB</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-white/40">Runtime Server</td>
                    <td className="py-2 px-3 text-white font-medium uppercase">
                      {model.provider} <span className="text-white/40 lowercase">(:{model.port})</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
