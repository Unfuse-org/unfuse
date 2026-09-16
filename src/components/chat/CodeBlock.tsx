import React, { useState } from 'react';
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
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { LanguageIcon } from './LanguageIcon';

interface CodeBlockProps {
  language: string;
  code: string;
  filename?: string;
  initialCollapsed?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  filename,
  initialCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanLang = (language || 'typescript').toLowerCase().replace('language-', '');
  const grammar = Prism.languages[cleanLang] || Prism.languages.typescript || Prism.languages.javascript;
  const lines = code.split('\n');

  return (
    <div className="my-3 select-text w-full">
      {/* 1. UNBOXED FLAT CODE HEADER ON CANVAS */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between py-1 text-xs font-mono text-white/50 select-none cursor-pointer hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-white/40">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>

          {/* OFFICIAL LANGUAGE BRAND ICON */}
          <LanguageIcon language={cleanLang} size={15} className="w-3.5 h-3.5 shrink-0" />

          {filename ? (
            <span className="text-zinc-200 font-medium text-[11.5px] truncate">
              {filename}
            </span>
          ) : (
            <span className="text-white/40 text-[11px] capitalize">
              {cleanLang}
            </span>
          )}

          <span className="text-white/30 text-[10.5px] ml-1">
            ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
          </span>
        </div>

        {/* 1-CLICK COPY BUTTON */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-1 py-0.5 text-white/40 hover:text-white transition-colors cursor-pointer text-[11px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* 2. RECTANGULAR CONTAINER WITH SUBTLE CURVED EDGES APPEARS FOR CODE ITSELF */}
      {!isCollapsed && (
        <div className="mt-1.5 border border-white/[0.08] bg-[#111113] rounded-lg overflow-hidden py-2.5 px-1 font-mono text-[12.5px] leading-relaxed select-text shadow-sm">
          {lines.map((line, idx) => {
            const highlightedLine = Prism.highlight(line, grammar, cleanLang);
            return (
              <div key={idx} className="flex hover:bg-white/[0.02] transition-colors">
                {/* LINE NUMBER (NO VERTICAL DIVIDER LINE, NO BACKGROUND COLOR) */}
                <span className="w-8 shrink-0 text-white/25 select-none text-right pr-3.5 font-mono tabular-nums text-[11.5px] leading-relaxed">
                  {idx + 1}
                </span>
                {/* CODE LINE (WRAPS NATURALLY WITHOUT HORIZONTAL SCROLL) */}
                <span
                  className="flex-1 whitespace-pre-wrap break-words text-zinc-100 font-mono leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
