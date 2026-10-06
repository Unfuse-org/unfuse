import { useState } from 'react';
import { BookOpen, Plus, Search, Save, FileText, Brain } from 'lucide-react';

export function MemoryView() {
  const [tab, setTab] = useState<'instructions' | 'facts'>('instructions');
  const [scope, setScope] = useState<'global' | 'project'>('global');
  return (
    <div className="mt-2">
      <p className="text-xs leading-6 mb-6" style={{ color: 'var(--text-muted)' }}>Manage the instructions you give models and the knowledge worth keeping between conversations.</p>
      <div className="flex gap-1 mb-6 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
        {([{ id: 'instructions', label: 'Custom instructions', icon: FileText }, { id: 'facts', label: 'Remembered facts', icon: Brain }] as const).map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-hover)]" style={{ backgroundColor: tab === id ? 'var(--bg-active)' : undefined, color: tab === id ? 'var(--text-main)' : 'var(--text-muted)' }}><Icon size={15} />{label}</button>)}
      </div>
      {tab === 'instructions' ? <>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div><h3 className="text-sm font-medium">Your instructions</h3><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>How you want your models to work with you.</p></div>
          <div className="flex rounded-lg border p-1" style={{ borderColor: 'var(--border-subtle)' }}>{(['global', 'project'] as const).map((item) => <button key={item} onClick={() => setScope(item)} aria-pressed={scope === item} className="text-[11px] px-3 py-1.5 rounded-md" style={{ backgroundColor: scope === item ? 'var(--bg-active)' : undefined, color: scope === item ? 'var(--text-main)' : 'var(--text-muted)' }}>{item === 'global' ? 'All projects' : 'This project'}</button>)}</div>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
          <label htmlFor="custom-instructions" className="text-xs font-medium">{scope === 'global' ? 'General preferences' : 'Project guidelines'}</label>
          <p className="text-[11px] leading-5 mt-1 mb-3" style={{ color: 'var(--text-muted)' }}>{scope === 'global' ? 'Writing style, collaboration preferences, and instructions that apply across projects.' : 'Project conventions, commands, and constraints shared by models working here.'}</p>
          <textarea id="custom-instructions" disabled rows={7} placeholder={scope === 'global' ? 'For example: explain your plan briefly and keep changes focused on my request.' : 'For example: use the existing project patterns and run the relevant checks.'} className="w-full rounded-lg border px-3 py-2 text-xs leading-6 resize-none cursor-not-allowed opacity-50" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }} />
          <div className="flex justify-between items-center gap-4 mt-3"><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Instruction storage and model use are not connected yet.</p><button disabled className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--bg-active)' }}><Save size={13} />Save</button></div>
        </div>
      </> : <>
        <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="text-sm font-medium">Remembered facts</h3><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Useful knowledge you can review and correct.</p></div><button disabled className="flex items-center gap-1.5 text-xs border rounded-lg px-3 py-2 opacity-40 cursor-not-allowed" style={{ borderColor: 'var(--border-subtle)' }}><Plus size={14} />Add memory</button></div>
        <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 p-3 border-b opacity-40" style={{ borderColor: 'var(--border-subtle)' }}><Search size={14} /><input disabled aria-label="Search remembered facts" placeholder="Search memories…" className="flex-1 text-xs bg-transparent outline-none cursor-not-allowed" /><select disabled aria-label="Filter memory scope" className="text-xs bg-transparent cursor-not-allowed"><option>All scopes</option></select></div>
          <div className="text-center px-6 py-16"><BookOpen size={28} strokeWidth={1.3} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} /><p className="text-sm font-medium">No memories connected</p><p className="text-xs leading-6 mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>Project decisions and durable facts will appear here for you to review. Memory storage and recall are not connected yet.</p></div>
        </div>
      </>}
    </div>
  );
}
