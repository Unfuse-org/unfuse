import React, { useState } from 'react';
import { diffLines, Change } from 'diff';
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-go';
import { Check, X, FileCode, ChevronDown, ChevronRight, Pencil, RotateCcw } from 'lucide-react';

interface DiffViewerProps {
  filename: string;
  originalCode: string;
  modifiedCode: string;
  onAccept?: () => void;
  onReject?: () => void;
  onModify?: (newCode: string) => void;
  onRevert?: (originalCode: string) => void;
  initialCollapsed?: boolean;
}

function detectLangFromFilename(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'bash';
    case 'md':
      return 'markdown';
    default:
      return 'typescript';
  }
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  filename,
  originalCode,
  modifiedCode,
  onAccept,
  onReject,
  onModify,
  onRevert,
  initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected' | 'modified'>('pending');
  const [isEditing, setIsEditing] = useState(false);
  const [currentModifiedCode, setCurrentModifiedCode] = useState(modifiedCode);

  const diffs: Change[] = diffLines(originalCode, currentModifiedCode);

  let additions = 0;
  let deletions = 0;
  diffs.forEach((part) => {
    const lineCount = part.value.replace(/\n$/, '').split('\n').length;
    if (part.added) additions += lineCount;
    if (part.removed) deletions += lineCount;
  });

  const lang = detectLangFromFilename(filename);
  const grammar = Prism.languages[lang] || Prism.languages.typescript || Prism.languages.javascript;

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('accepted');
    setIsEditing(false);
    onAccept?.();
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('rejected');
    setIsEditing(false);
    onReject?.();
  };

  const handleStartModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIsCollapsed(false);
  };

  const handleSaveModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setStatus('accepted');
    onModify?.(currentModifiedCode);
    onAccept?.();
  };

  const handleCancelModify = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setCurrentModifiedCode(modifiedCode);
  };

  const handleRevert = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatus('pending');
    setIsEditing(false);
    setCurrentModifiedCode(originalCode);
    onRevert?.(originalCode);
  };

  return (
    <div className="my-3 select-text w-full">
      {/* 1. UNBOXED FLAT HEADER ON CANVAS (NO RECTANGLE BORDER AROUND HEADER) */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between py-1 text-xs select-none cursor-pointer text-white/80 hover:text-white transition-colors"
      >
        {/* FILE INFO & PURE COLOURED STATS (NO BACKGROUND) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-white/40">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
          <FileCode className="w-3.5 h-3.5 text-amber-300/90 shrink-0" />
          <span className="font-mono font-medium text-white text-[12px] truncate">
            {filename}
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0 ml-1">
            {additions > 0 && (
              <span className="text-emerald-400 font-bold">
                +{additions}
              </span>
            )}
            {deletions > 0 && (
              <span className="text-rose-400 font-bold">
                -{deletions}
              </span>
            )}
          </div>
        </div>

        {/* ACTIONS & PURE COLOURED STATUS WORDS WITHOUT BACKGROUND */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            /* INLINE EDIT MODE ACTIONS */
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCancelModify}
                title="Cancel Edit"
                className="p-1 text-white/40 hover:text-rose-400 rounded transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <button
                type="button"
                onClick={handleSaveModify}
                title="Save & Accept"
                className="p-1 text-white/40 hover:text-emerald-400 rounded transition-colors cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : status === 'pending' ? (
            /* DEFAULT ACTION ICONS (NO SURROUNDING BOX) */
            <div className="flex items-center gap-1">
              {/* CROSS (REJECT) BUTTON */}
              <button
                type="button"
                onClick={handleReject}
                title="Reject changes"
                className="p-1 text-white/40 hover:text-rose-400 rounded transition-colors cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              {/* MODIFY (PENCIL) BUTTON */}
              <button
                type="button"
                onClick={handleStartModify}
                title="Modify code in-place"
                className="p-1 text-white/40 hover:text-amber-300 rounded transition-colors cursor-pointer active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              {/* TICK (ACCEPT) BUTTON */}
              <button
                type="button"
                onClick={handleAccept}
                title="Accept changes"
                className="p-1 text-white/40 hover:text-emerald-400 rounded transition-colors cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            /* PURE COLOURED WORDS WITHOUT BACKGROUND + 1-CLICK REVERT */
            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              <span
                className={`font-bold ${
                  status === 'accepted'
                    ? 'text-emerald-400'
                    : status === 'rejected'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}
              >
                {status.toUpperCase()}
              </span>

              {/* 1-CLICK REVERT BUTTON */}
              <button
                type="button"
                onClick={handleRevert}
                title="Revert back to original code"
                className="text-white/40 hover:text-white transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. RECTANGULAR CONTAINER WITH SUBTLE CURVED EDGES APPEARS FOR CODE ITSELF */}
      {!isCollapsed && (
        <div className="mt-1.5 border border-white/[0.08] bg-[#111113] rounded-lg overflow-hidden py-2 text-[12.5px] font-mono leading-relaxed shadow-sm">
          {isEditing ? (
            /* IN-PLACE TEXTAREA EDITOR */
            <div className="px-3 py-1 space-y-1">
              <div className="text-[10.5px] text-amber-300/70 font-mono select-none">
                Editing {filename} directly · Click ✓ to Save & Apply or ✕ to Cancel
              </div>
              <textarea
                value={currentModifiedCode}
                onChange={(e) => setCurrentModifiedCode(e.target.value)}
                rows={Math.max(4, currentModifiedCode.split('\n').length + 1)}
                className="w-full bg-[#121214] text-zinc-100 p-2.5 border border-white/15 outline-none font-mono text-[12.5px] leading-relaxed resize-y focus:border-white/30"
              />
            </div>
          ) : (
            /* STANDARD SYNTAX-HIGHLIGHTED DIFF VIEW */
            diffs.map((part, index) => {
              const lines = part.value.replace(/\n$/, '').split('\n');

              // ADDED LINES: GREEN DIFF TINT + FULL SYNTAX HIGHLIGHTING
              if (part.added) {
                return (
                  <div key={index} className="space-y-0.5 my-0.5">
                    {lines.map((line, lIdx) => {
                      const highlighted = Prism.highlight(line, grammar, lang);
                      return (
                        <div
                          key={lIdx}
                          className="flex bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-200 border-l-2 border-emerald-400 px-3 py-0.5 transition-colors"
                        >
                          <span className="w-6 shrink-0 text-emerald-400 font-bold select-none text-right pr-3 font-mono tabular-nums leading-relaxed">
                            +
                          </span>
                          <span
                            className="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed text-zinc-100"
                            dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // REMOVED LINES: RED DIFF TINT + FULL SYNTAX HIGHLIGHTING
              if (part.removed) {
                return (
                  <div key={index} className="space-y-0.5 my-0.5">
                    {lines.map((line, lIdx) => {
                      const highlighted = Prism.highlight(line, grammar, lang);
                      return (
                        <div
                          key={lIdx}
                          className="flex bg-rose-500/15 hover:bg-rose-500/20 text-rose-200 border-l-2 border-rose-400 px-3 py-0.5 transition-colors"
                        >
                          <span className="w-6 shrink-0 text-rose-400 font-bold select-none text-right pr-3 font-mono tabular-nums leading-relaxed">
                            -
                          </span>
                          <span
                            className="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed text-zinc-300 opacity-80"
                            dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // UNCHANGED CONTEXT LINES: NEUTRAL CANVAS BACKGROUND + SYNTAX HIGHLIGHTING
              return (
                <div key={index} className="space-y-0.5">
                  {lines.map((line, lIdx) => {
                    const highlighted = Prism.highlight(line, grammar, lang);
                    return (
                      <div key={lIdx} className="flex px-3 py-0.5 hover:bg-white/[0.02]">
                        <span className="w-6 shrink-0 text-white/20 select-none text-right pr-3 font-mono tabular-nums leading-relaxed">
                          &nbsp;
                        </span>
                        <span
                          className="flex-1 whitespace-pre-wrap break-words font-mono leading-relaxed text-zinc-200"
                          dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
