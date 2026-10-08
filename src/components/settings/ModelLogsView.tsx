import { useState } from 'react';
import { ArrowDownToLine, Search, TerminalSquare, Trash2, Radio, ArrowDown, X } from 'lucide-react';

const sources = [
  { id: 'model', label: 'Model I/O', description: 'Inspect the prompts sent to your models and the responses they return.' },
  { id: 'shell', label: 'Tool output', description: 'Commands executed by models, their output, and exit status.' },
  { id: 'server', label: 'Server', description: 'Inference-provider startup messages, request activity, and errors.' },
] as const;

export function ModelLogsView({ modelFilter, onClearModelFilter }: { modelFilter: string | null; onClearModelFilter: () => void }) {
  const [source, setSource] = useState<typeof sources[number]['id']>('model');
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <header className="px-6 py-5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}><h1 className="text-lg font-semibold">Logs</h1><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Inspect model requests, tool output, and provider activity.</p></header>
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-6 pt-3 shrink-0 flex flex-wrap items-center gap-1" style={{ backgroundColor: 'var(--bg-surface)' }}>
          {sources.map((item) => <button key={item.id} onClick={() => setSource(item.id)} aria-pressed={source === item.id} className="text-xs px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-hover)]" style={{ backgroundColor: source === item.id ? 'var(--bg-active)' : undefined, color: source === item.id ? 'var(--text-main)' : 'var(--text-muted)' }}>{item.label}</button>)}
          <span className="ml-auto flex items-center gap-1.5 px-2 text-[10px]" style={{ color: 'var(--text-muted)' }}><Radio size={12} />Not connected</span>
        </div>
        <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-2 border-b" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          {modelFilter && <button onClick={onClearModelFilter} aria-label="Clear model filter" className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-active)' }}>{modelFilter}<X size={12} /></button>}
          {!modelFilter && <select disabled aria-label="Filter logs by model" className="text-[11px] rounded-md p-1.5 bg-transparent opacity-40 cursor-not-allowed"><option>All models</option></select>}
          <select disabled aria-label="Filter log level" className="text-[11px] rounded-md p-1.5 bg-transparent opacity-40 cursor-not-allowed"><option>All levels</option></select>
          {source === 'model' && <select disabled aria-label="Filter model input or output" className="text-[11px] rounded-md p-1.5 bg-transparent opacity-40 cursor-not-allowed"><option>Input & output</option></select>}
          <div className="flex-1 min-w-[120px] flex items-center gap-2 opacity-40"><Search size={13} /><input disabled aria-label="Search model logs" placeholder="Search logs…" className="w-full min-w-0 bg-transparent text-xs outline-none cursor-not-allowed" /></div>
          <button disabled aria-label="Export logs" title="Connect a log source to export" className="p-1.5 opacity-40 cursor-not-allowed"><ArrowDownToLine size={15} /></button>
          <button disabled aria-label="Clear log view" title="No logs to clear" className="p-1.5 opacity-40 cursor-not-allowed"><Trash2 size={15} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-6 py-12 text-center">
          <div className="max-w-sm"><TerminalSquare size={28} strokeWidth={1.3} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} /><p className="text-sm font-medium">No {source === 'model' ? 'model' : source === 'shell' ? 'shell' : 'server'} logs yet</p><p className="text-xs leading-6 mt-2" style={{ color: 'var(--text-muted)' }}>{sources.find((item) => item.id === source)?.description}</p><p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>Log capture is not connected yet.</p></div>
        </div>
        <div className="px-6 py-3 shrink-0 border-t flex items-center justify-between text-[10px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><span>0 entries</span><button disabled className="flex items-center gap-1 opacity-40 cursor-not-allowed"><ArrowDown size={12} />Follow output</button></div>
      </div>
    </div>
  );
}
