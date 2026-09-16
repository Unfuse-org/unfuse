import React, { useState, useEffect, useRef } from 'react';
import { Check, CornerDownLeft, Sparkles, X } from 'lucide-react';
import { ClarificationRequest } from './types';
import { getModelLogo } from '../rack/MountModelView';

interface ClarificationPanelProps {
  request: ClarificationRequest;
  onSubmit: (response: { selectedOptions: string[]; customText?: string }) => void;
  onDismiss: () => void;
}

export const ClarificationPanel: React.FC<ClarificationPanelProps> = ({
  request,
  onSubmit,
  onDismiss,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    // Default to recommended option if available
    const rec = request.options.find((o) => o.recommended);
    return rec ? [rec.id] : request.options[0] ? [request.options[0].id] : [];
  });
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [customText, setCustomText] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCustomSelected && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomSelected]);

  // Keyboard shortcut listener (1-9 for options, Enter to submit, Esc to dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleFinalSubmit();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleFinalSubmit();
        return;
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= request.options.length) {
        e.preventDefault();
        const opt = request.options[num - 1];
        if (opt) {
          handleToggleOption(opt.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, isCustomSelected, customText, request.options]);

  const handleToggleOption = (optId: string) => {
    setIsCustomSelected(false);
    if (request.isMultiSelect) {
      setSelectedIds((prev) =>
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
      );
    } else {
      setSelectedIds([optId]);
    }
  };

  const handleSelectCustom = () => {
    setIsCustomSelected(true);
    if (!request.isMultiSelect) {
      setSelectedIds([]);
    }
  };

  const handleFinalSubmit = () => {
    if (selectedIds.length === 0 && !customText.trim() && !isCustomSelected) {
      onDismiss();
      return;
    }
    onSubmit({
      selectedOptions: selectedIds,
      customText: isCustomSelected ? customText.trim() : undefined,
    });
  };

  return (
    <div className="w-full mb-3 rounded-2xl bg-[#1c1c20]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
      {/* HEADER: MODEL BADGE & QUESTION */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* MODEL LOGO BADGE */}
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5 shadow-sm border border-white/20 shrink-0">
            {getModelLogo(request.modelFamily || 'custom', 14)}
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sky-400 font-bold text-xs tracking-tight truncate">
              {request.modelName ? `@${request.modelFamily || request.modelName}` : '@model'}
            </span>
          </div>
        </div>

        {/* DISMISS / SKIP BUTTON */}
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Dismiss / Skip (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* QUESTION PROMPT */}
      <div className="text-[13.5px] font-medium text-white/95 leading-snug mb-3.5 pl-0.5">
        {request.question}
      </div>

      {/* OPTIONS LIST */}
      <div className="space-y-1.5 mb-3.5">
        {request.options.map((opt, idx) => {
          const isSelected = selectedIds.includes(opt.id) && !isCustomSelected;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleToggleOption(opt.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? 'bg-white/15 border-white/40 text-white shadow-sm'
                  : 'bg-white/[0.04] border-white/[0.08] text-white/75 hover:bg-white/[0.08] hover:border-white/20 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* HOTKEY BADGE */}
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-white text-black'
                      : 'bg-white/[0.08] text-white/50 border border-white/10'
                  }`}
                >
                  {idx + 1}
                </span>

                {/* OPTION LABEL & DESCRIPTION */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium leading-tight truncate">
                      {opt.label}
                    </span>
                    {opt.recommended && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-sky-400 bg-sky-500/10 border border-sky-400/20 px-1.5 py-0.2 rounded shrink-0">
                        <Sparkles className="w-2.5 h-2.5" />
                        Recommended
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <span className="text-[11.5px] text-white/45 truncate mt-0.5 font-sans">
                      {opt.description}
                    </span>
                  )}
                </div>
              </div>

              {/* SELECTION CHECKMARK */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-white border-white text-black'
                    : 'border-white/20 bg-transparent'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}

        {/* OPTIONAL CUSTOM WRITE-IN CHOICE */}
        {request.allowCustomInput !== false && (
          <div
            onClick={handleSelectCustom}
            className={`w-full text-left px-3 py-2 rounded-xl border transition-all duration-150 cursor-pointer ${
              isCustomSelected
                ? 'bg-white/15 border-white/40 text-white'
                : 'bg-white/[0.03] border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                  isCustomSelected
                    ? 'bg-white text-black'
                    : 'bg-white/[0.08] text-white/40 border border-white/10'
                }`}
              >
                +
              </span>
              <span className="text-[12.5px] font-medium flex-1">Write custom requirement...</span>
            </div>

            {isCustomSelected && (
              <div className="mt-2 pl-7 pr-1">
                <input
                  ref={customInputRef}
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Specify exact requirement or approach..."
                  className="w-full bg-black/40 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] font-mono text-white/35">
          Press <kbd className="px-1 py-0.5 rounded bg-white/[0.08] text-white/60">1</kbd>-<kbd className="px-1 py-0.5 rounded bg-white/[0.08] text-white/60">{request.options.length}</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/[0.08] text-white/60">Enter</kbd>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            Skip (Decide for me)
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-white/90 shadow-md transition-all cursor-pointer active:scale-95"
          >
            <span>Submit Choice</span>
            <CornerDownLeft className="w-3 h-3 text-black/70" />
          </button>
        </div>
      </div>
    </div>
  );
};
