import React, { useMemo, useState } from 'react';
import { diffLines } from 'diff';
import { ChevronDown, ChevronRight, FileCode, WrapText } from 'lucide-react';

interface ChangesPanelProps {
  filename: string;
  originalCode: string;
  modifiedCode: string;
}

export const ChangesPanel: React.FC<ChangesPanelProps> = ({ filename, originalCode, modifiedCode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [query, setQuery] = useState('');
  const { rows, additions, deletions } = useMemo(() => {
    let oldLine = 1;
    let newLine = 1;
    let additions = 0;
    let deletions = 0;
    const rows = diffLines(originalCode, modifiedCode).flatMap((part) => {
      const lines = part.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      return lines.map((text) => {
        const type = part.added ? 'added' : part.removed ? 'removed' : 'context';
        if (part.added) additions++;
        if (part.removed) deletions++;
        return {
          text,
          type,
          oldLine: part.added ? null : oldLine++,
          newLine: part.removed ? null : newLine++,
        };
      });
    });
    return { rows, additions, deletions };
  }, [originalCode, modifiedCode]);
  const matches = filename.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <div className="flex-1 flex flex-col min-h-0 text-[var(--text-main)]">
      <header className="px-4 py-3 border-b flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-sm font-semibold">Changes</h2>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Sample diff · Git not connected</p>
        </div>
        <div className="text-xs font-mono flex gap-2 shrink-0">
          <span className="text-[#4ade80]">+{additions}</span>
          <span className="text-[#ff6369]">−{deletions}</span>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <aside className="lg:w-52 shrink-0 border-b lg:border-b-0 lg:border-r p-2"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
          <input type="search" aria-label="Filter changed files" placeholder="Filter files…"
            value={query} onChange={(event) => setQuery(event.target.value)}
            className="w-full px-2 py-2 text-xs bg-transparent outline-none rounded focus:ring-1 focus:ring-current mb-2" />
          <p className="px-2 text-[11px] text-[var(--text-muted)] mb-2">Changed files · 1</p>
          {matches ? (
            <button type="button" onClick={() => setCollapsed(false)} aria-current="true"
              className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-active)' }}>
              <FileCode size={14} className="shrink-0" />
              <span className="truncate flex-1" title={filename}>{filename}</span>
              <span className="text-[10px] text-[var(--text-muted)]">M</span>
            </button>
          ) : <p className="px-2 text-xs text-[var(--text-muted)]">No matching files.</p>}
        </aside>
        <section className="flex-1 min-w-0 min-h-0 flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
            <button type="button" onClick={() => setCollapsed((value) => !value)}
              aria-expanded={!collapsed} className="flex items-center gap-2 min-w-0 text-xs">
              {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="font-mono truncate" title={filename}>{filename}</span>
            </button>
            <button type="button" onClick={() => setWrap((value) => !value)}
              aria-pressed={wrap} title="Wrap lines" aria-label="Wrap diff lines"
              className="p-1.5 rounded hover:bg-[var(--bg-active)]"
              style={{ backgroundColor: wrap ? 'var(--bg-active)' : undefined }}>
              <WrapText size={15} />
            </button>
          </div>
          {!collapsed && (
            <div className="flex-1 min-h-0 overflow-auto select-text">
              <table className="w-full font-mono text-[11px] leading-6 border-collapse">
                <caption className="sr-only">Unified diff for {filename}. Old and new line numbers, followed by changes.</caption>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} style={{
                      backgroundColor: row.type === 'added' ? 'rgba(46,160,67,0.16)' : row.type === 'removed' ? 'rgba(248,81,73,0.16)' : undefined,
                    }}>
                      <td style={{ backgroundColor: row.type === 'added' ? 'rgba(46,160,67,0.24)' : row.type === 'removed' ? 'rgba(248,81,73,0.24)' : undefined }} className="w-9 min-w-[36px] px-2 text-right align-top select-none text-[var(--text-muted)]">{row.oldLine}</td>
                      <td style={{ backgroundColor: row.type === 'added' ? 'rgba(46,160,67,0.24)' : row.type === 'removed' ? 'rgba(248,81,73,0.24)' : undefined }} className="w-9 min-w-[36px] px-2 text-right align-top select-none text-[var(--text-muted)]">{row.newLine}</td>
                      <td style={{ color: row.type === 'added' ? '#4ade80' : row.type === 'removed' ? '#ff6369' : undefined, backgroundColor: row.type === 'added' ? 'rgba(46,160,67,0.24)' : row.type === 'removed' ? 'rgba(248,81,73,0.24)' : undefined }} className="w-5 align-top select-none font-semibold">{row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}</td>
                      <td className={wrap ? 'whitespace-pre-wrap break-all pr-4' : 'whitespace-pre pr-4'}>{row.text || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
