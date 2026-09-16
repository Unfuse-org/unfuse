import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Message } from './types';
import { getModelLogo } from '../rack/MountModelView';
import { CodeBlock } from './CodeBlock';
import { DiffViewer } from './DiffViewer';
import { ThoughtIcon } from './ThoughtIcon';
import { ToolCallItem } from './ToolCallItem';

const PROMPT_EASTER_EGG_COLORS = [
  // 1. Neon Violet
  'bg-purple-950/70 hover:bg-purple-900/70 text-purple-100 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  // 2. Matrix Cyber Emerald
  'bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-100 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  // 3. Electric Cyan
  'bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-100 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
  // 4. Sunset Tangerine
  'bg-orange-950/70 hover:bg-orange-900/70 text-orange-100 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.2)]',
  // 5. Hot Vaporwave Pink
  'bg-pink-950/70 hover:bg-pink-900/70 text-pink-100 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]',
  // 6. Crimson Rose
  'bg-rose-950/70 hover:bg-rose-900/70 text-rose-100 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
  // 7. Tokyo Amber Gold
  'bg-amber-950/70 hover:bg-amber-900/70 text-amber-100 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]',
  // 8. Deep Sky Blue
  'bg-sky-950/70 hover:bg-sky-900/70 text-sky-100 border-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.2)]',
  // 9. Acid Synth Lime
  'bg-lime-950/70 hover:bg-lime-900/70 text-lime-100 border-lime-400/50 shadow-[0_0_20px_rgba(132,204,22,0.2)]',
  // 10. Midnight Indigo
  'bg-indigo-950/70 hover:bg-indigo-900/70 text-indigo-100 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]',
  // 11. Laguna Teal
  'bg-teal-950/70 hover:bg-teal-900/70 text-teal-100 border-teal-400/50 shadow-[0_0_20px_rgba(20,184,166,0.2)]',
  // 12. Fuchsia Beam
  'bg-fuchsia-950/70 hover:bg-fuchsia-900/70 text-fuchsia-100 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]',
  // 13. Flame Red
  'bg-red-950/70 hover:bg-red-900/70 text-red-100 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]',
  // 14. Royal Cobalt Blue
  'bg-blue-950/70 hover:bg-blue-900/70 text-blue-100 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  // 15. Solar Yellow
  'bg-yellow-950/70 hover:bg-yellow-900/70 text-yellow-100 border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]',
  // 16. Mint Fresh
  'bg-emerald-900/60 hover:bg-emerald-800/60 text-teal-100 border-teal-300/50 shadow-[0_0_20px_rgba(52,211,153,0.2)]',
  // 17. Aurora Borealis Gradient
  'bg-gradient-to-r from-teal-950/80 to-purple-950/80 text-teal-100 border-teal-400/50 shadow-[0_0_20px_rgba(45,212,191,0.2)]',
  // 18. Synthwave Sunset Gradient
  'bg-gradient-to-r from-orange-950/80 to-pink-950/80 text-pink-100 border-pink-400/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]',
  // 19. Cosmic Nebula Gradient
  'bg-gradient-to-r from-indigo-950/80 to-cyan-950/80 text-cyan-100 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]',
  // 20. Platinum Chrome
  'bg-zinc-800/90 hover:bg-zinc-700/90 text-white border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.25)]',
];

interface MessageItemProps {
  message: Message;
  onRetry?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onRetry }) => {
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [colorIndex, setColorIndex] = useState<number | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePromptDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setColorIndex((prev) => {
      if (prev === null) return 0;
      if (prev >= PROMPT_EASTER_EGG_COLORS.length - 1) return null;
      return prev + 1;
    });
  };

  const renderFormattedUserContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_.:-]+|\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-sky-400 font-bold">
            {part}
          </span>
        );
      }
      if (part.startsWith('/') && part.includes('.')) {
        return (
          <span
            key={index}
            className="text-emerald-300 font-mono text-[12px] bg-emerald-500/10 border border-emerald-400/20 px-1 py-0.2 rounded inline-flex items-center mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // 1. USER MESSAGE (SLEEK BUBBLE CONTAINER ON THE RIGHT WITH 20-COLOR EASTER EGG)
  if (message.role === 'user') {
    const currentThemeClass =
      colorIndex !== null
        ? PROMPT_EASTER_EGG_COLORS[colorIndex]
        : 'bg-white/[0.06] hover:bg-white/[0.08] text-white/95 border-white/[0.08]';

    return (
      <div className="flex justify-end mb-8">
        <div
          onDoubleClick={handlePromptDoubleClick}
          className={`max-w-[85%] rounded-2xl rounded-tr-md px-4 py-3 border text-[13px] leading-relaxed shadow-sm transition-all duration-200 cursor-pointer select-text active:scale-[0.99] ${currentThemeClass}`}
          title="Double-click to change color (Easter Egg)"
        >
          <p className="whitespace-pre-wrap selection:bg-white/20">{renderFormattedUserContent(message.content)}</p>
        </div>
      </div>
    );
  }

  // 2. ASSISTANT MESSAGE (FLAT DIRECTLY ON CANVAS WITH NO BUBBLE)
  return (
    <div className="flex flex-col mb-10 text-[13.5px] text-white/90 min-w-0 max-w-full overflow-hidden">
      {/* ATTRIBUTION HEADER: LOGO, MODEL NAME, BOLD PORT, SPEED & TIME */}
      <div className="flex items-center justify-between mb-3.5 select-none min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* WHITE LOGO BADGE */}
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center p-0.5 shadow-sm border border-white/20 shrink-0">
            {getModelLogo(message.modelFamily || 'custom', 14)}
          </div>

          {/* MODEL NAME & BOLD PORT (NO COLON) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-sky-400 tracking-tight truncate">
              {message.modelName || 'Local Blade'}
            </span>
            {message.port && (
              <span className="text-[10.5px] font-mono font-bold text-white bg-white/[0.08] px-1.5 py-0.2 rounded border border-white/10 shrink-0">
                {message.port}
              </span>
            )}
          </div>
        </div>

        {/* SPEED & TIMESTAMP */}
        <div className="flex items-center gap-2 text-white/30 text-[11px] font-mono shrink-0">
          {message.speedTokPerSec && (
            <span className="text-white/50">{message.speedTokPerSec.toFixed(1)} tok/s</span>
          )}
          <span>·</span>
          <span>{message.timestamp}</span>
        </div>
      </div>

      {/* 1. UNBOXED COLLAPSIBLE REASONING / <THINK> PROCESS (OFFICIAL REASONING SVG) */}
      {message.thought && (
        <div className="mb-3.5 select-none min-w-0 max-w-full">
          <div
            onClick={() => setThoughtOpen(!thoughtOpen)}
            className="flex items-center gap-2 py-1 text-xs text-purple-300/80 hover:text-purple-200 transition-colors cursor-pointer w-fit"
          >
            <div className="text-purple-400/60">
              {thoughtOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </div>
            <ThoughtIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="font-mono text-[11.5px] font-medium tracking-tight">
              {message.thoughtDurationSec
                ? `Thought for ${message.thoughtDurationSec.toFixed(1)}s`
                : 'Reasoning Process'}
            </span>
          </div>

          {/* UNBOXED FLAT CANVAS THOUGHT CONTENT */}
          {thoughtOpen && (
            <div className="pl-6 pt-1.5 pb-1 text-[12px] text-white/40 leading-relaxed font-mono whitespace-pre-wrap break-words break-all border-l-2 border-purple-500/20 ml-1.5 my-1 min-w-0 max-w-full overflow-hidden">
              {message.thought}
            </div>
          )}
        </div>
      )}

      {/* 2. UNBOXED COLLAPSIBLE TOOL OPERATIONS (FILE OPS, TERMINAL, SEARCH) */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div className="mb-3.5 space-y-2 min-w-0 max-w-full overflow-hidden">
          {message.toolCalls.map((tool) => (
            <ToolCallItem key={tool.id} tool={tool} />
          ))}
        </div>
      )}

      {/* 3. MARKDOWN BODY (DIRECTLY ON CANVAS) */}
      {message.content ? (
        <>
          <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-white/90 space-y-3 font-sans break-words min-w-0 max-w-full overflow-hidden">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && match) {
                    if (match[1] === 'diff') {
                      const lines = codeString.split('\n');
                      const oldLines: string[] = [];
                      const newLines: string[] = [];
                      let targetFilename = 'src/engine/runtimeAdapter.ts';

                      lines.forEach((l) => {
                        if (l.startsWith('// ') && (l.includes('.') || l.includes('/'))) {
                          targetFilename = l.replace(/^\/\/\s*/, '').trim();
                          return;
                        }
                        if (l.startsWith('--- a/') || l.startsWith('+++ b/')) {
                          targetFilename = l.replace(/^(--- a\/|\+\+\+ b\/)/, '').trim();
                          return;
                        }

                        if (l.startsWith('+')) {
                          newLines.push(l.slice(1));
                        } else if (l.startsWith('-')) {
                          oldLines.push(l.slice(1));
                        } else {
                          const clean = l.startsWith(' ') ? l.slice(1) : l;
                          oldLines.push(clean);
                          newLines.push(clean);
                        }
                      });

                      return (
                        <DiffViewer
                          filename={targetFilename}
                          originalCode={oldLines.join('\n')}
                          modifiedCode={newLines.join('\n')}
                        />
                      );
                    }

                    // COLLAPSIBLE SYNTAX-HIGHLIGHTED CODE BLOCK WITH OFFICIAL BRAND ICON
                    return (
                      <CodeBlock
                        language={match[1]}
                        code={codeString}
                      />
                    );
                  }
                  return (
                    <code
                      className="px-1.5 py-0.5 rounded bg-white/[0.08] text-amber-200/90 font-mono text-[12px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="mb-3 text-[13.5px] leading-relaxed text-white/85">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="list-disc list-inside space-y-1.5 my-2.5 text-white/80">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="list-decimal list-inside space-y-1.5 my-2.5 text-white/80">{children}</ol>;
                },
                li({ children }) {
                  return <li className="text-[13.5px] text-white/80">{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="text-base font-bold text-white mt-4 mb-2">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="text-sm font-bold text-white mt-3 mb-1.5">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="text-xs font-semibold text-white/90 mt-2 mb-1">{children}</h3>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* 4. FOOTER ACTIONS */}
          <div className="flex items-center gap-2 mt-3 text-white/30 text-xs select-none">
            <button
              type="button"
              onClick={() => handleCopy(message.content)}
              className="p-1 rounded-md hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="p-1 rounded-md hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
                title="Regenerate"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
