import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X } from 'lucide-react';
import Prism from 'prismjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import 'prismjs/components/prism-yaml';

export interface PreviewItem {
  id: string;
  name: string;
  detail: string;
  text?: string;
  language?: string;
  imageUrl?: string;
  pdfUrl?: string;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video';
}

export function QuickLookPreview({ items, selectedId, onSelect, onClose }: {
  items: PreviewItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const index = items.findIndex(item => item.id === selectedId);
  const item = items[index];
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  if (!item) return null;
  const extension = item.name.split('.').pop()?.toLowerCase() || '';
  const language = item.language || ({ ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', py: 'python', rs: 'rust', md: 'markdown', sh: 'bash' } as Record<string, string>)[extension] || extension;
  const grammar = Prism.languages[language];
  const rows: string[][] = [];
  if ((extension === 'csv' || extension === 'tsv') && item.text !== undefined) {
    const delimiter = extension === 'tsv' ? '\t' : ',';
    let row: string[] = [], cell = '', quoted = false;
    for (let i = 0; i < item.text.length; i++) {
      const char = item.text[i];
      if (char === '"') {
        if (quoted && item.text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && (char === delimiter || char === '\n')) {
        row.push(cell.replace(/\r$/, '')); cell = '';
        if (char === '\n') { rows.push(row); row = []; }
      } else cell += char;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  }
  return createPortal(
    <dialog ref={dialog} aria-label={`Quick Look: ${item.name}`} onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        if (event.target instanceof HTMLIFrameElement) return;
        if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); onSelect(items[index - 1].id); }
        if (event.key === 'ArrowRight' && index < items.length - 1) { event.preventDefault(); onSelect(items[index + 1].id); }
        if (event.key === ' ' && event.target === event.currentTarget) { event.preventDefault(); onClose(); }
      }}
      className="quick-look m-0 p-0 w-screen h-[100dvh] max-w-none max-h-none border-0 rounded-none bg-transparent text-[var(--text-main)] outline-none overflow-hidden"
    >
      <button autoFocus onClick={onClose} aria-label="Close preview" className="fixed top-5 right-5 z-10 p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-[var(--accent)]"><X size={20} /></button>
      <div className="h-full w-full px-6 py-16 sm:px-16 overflow-auto select-text" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
        {item.imageUrl ? <div className="h-full flex items-center justify-center pointer-events-none"><img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain pointer-events-auto" /></div>
          : item.pdfUrl ? <object aria-label={item.name} data={item.pdfUrl} type="application/pdf" className="w-full h-full border-0"><div className="h-full flex flex-col items-center justify-center gap-3"><p className="text-sm">This browser cannot display PDF files inline.</p><a href={item.pdfUrl} download={item.name} className="text-sm text-[var(--accent)] underline">Download {item.name}</a></div></object>
          : item.mediaUrl ? <div className="h-full flex items-center justify-center">{item.mediaType === 'video' ? <video key={item.id} src={item.mediaUrl} controls className="max-w-full max-h-full" /> : <audio key={item.id} src={item.mediaUrl} controls aria-label={item.name} />}</div>
          : rows.length ? <table className="mx-auto text-sm border-collapse"><thead><tr>{rows[0].map((cell, i) => <th key={i} className="text-left px-5 py-3 font-medium border-b border-[var(--border-strong)]">{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="px-5 py-3 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">{cell}</td>)}</tr>)}</tbody></table>
          : extension === 'md' && item.text !== undefined ? <div className="quick-look-markdown max-w-3xl mx-auto text-sm leading-7"><ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown></div>
          : item.text !== undefined ? <pre className="quick-look-code w-fit min-w-0 max-w-full mx-auto text-sm leading-7 whitespace-pre-wrap break-words font-mono">{grammar ? <code dangerouslySetInnerHTML={{ __html: Prism.highlight(item.text, grammar, language) }} /> : item.text}</pre>
          : <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]"><FileText size={48} strokeWidth={1} /><p className="text-sm">No preview available</p><p className="text-sm text-[var(--text-main)]">{item.name}</p><p className="text-xs">{item.detail}</p><p className="text-xs">This format needs a dedicated viewer.</p></div>}
      </div>
      <style>{`.quick-look::backdrop { background: var(--bg-app); } .quick-look-markdown h1 { font-size: 2rem; font-weight: 600; margin-bottom: 1.5rem; } .quick-look-markdown h2 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 .75rem; } .quick-look-markdown p { margin-bottom: 1rem; } .quick-look-markdown ul { list-style: disc; padding-left: 1.5rem; } .quick-look-markdown pre { overflow: auto; padding: 1rem 0; } .quick-look-markdown a { color: var(--accent); text-decoration: underline; } .quick-look-code .token.comment { color: var(--text-muted); } .quick-look-code .token.keyword, .quick-look-code .token.tag { color: #b18be8; } .quick-look-code .token.string, .quick-look-code .token.attr-value { color: #ca975d; } .quick-look-code .token.number, .quick-look-code .token.inserted { color: #67b687; } .quick-look-code .token.deleted { color: #e07a83; }`}</style>
    </dialog>, document.body);
}
