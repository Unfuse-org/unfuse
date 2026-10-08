import { useState } from 'react';
import { BookOpen, Plus, Search, Save, FileText, Brain, Globe, Folder } from 'lucide-react';

const sections = [
  { id: 'global', label: 'Global instructions', icon: Globe, description: 'Your preferences across all projects.' },
  { id: 'project', label: 'Project instructions', icon: Folder, description: 'Conventions and constraints for this project.' },
  { id: 'facts', label: 'Remembered facts', icon: Brain, description: 'Durable knowledge you can review and correct.' },
] as const;

export function MemoryView() {
  const [section, setSection] = useState<typeof sections[number]['id']>('global');
  const current = sections.find((item) => item.id === section)!;
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <header className="px-6 py-5 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <h1 className="text-lg font-semibold">Memory</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>What your models should follow and remember.</p>
      </header>
      <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
        <nav aria-label="Memory sections" className="sm:w-56 shrink-0 p-3 border-b sm:border-b-0 sm:border-r flex sm:flex-col gap-1 overflow-x-auto" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
          {sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setSection(id)} aria-pressed={section === id} className="flex items-center gap-2.5 text-xs text-left px-3 py-3 rounded-lg whitespace-nowrap hover:bg-[var(--bg-surface-hover)]" style={{ backgroundColor: section === id ? 'var(--bg-active)' : undefined, color: section === id ? 'var(--text-main)' : 'var(--text-muted)' }}><Icon size={15} />{label}</button>)}
          <p className="hidden sm:block mt-auto px-3 py-3 text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>Instructions are rules you write. Facts are knowledge retained between conversations.</p>
        </nav>
        <section className="flex-1 min-w-0 min-h-0 flex flex-col" aria-label={current.label}>
          <div className="px-6 py-5 flex items-center justify-between gap-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
            <div><h2 className="text-sm font-medium">{current.label}</h2><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{current.description}</p></div>
            <button disabled className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--bg-active)' }}>{section === 'facts' ? <Plus size={14} /> : <Save size={14} />}{section === 'facts' ? 'Add memory' : 'Save'}</button>
          </div>
          {section === 'facts' ? <>
            <div className="flex items-center gap-2 px-6 py-3 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}><Search size={14} className="opacity-40" /><input disabled aria-label="Search remembered facts" placeholder="Search memories…" className="flex-1 min-w-0 text-xs bg-transparent outline-none cursor-not-allowed opacity-40" /><select disabled aria-label="Filter memory scope" className="text-xs bg-transparent cursor-not-allowed opacity-40"><option>All scopes</option></select></div>
            <div className="flex-1 overflow-y-auto flex items-center justify-center p-6 text-center"><div className="max-w-sm"><BookOpen size={28} strokeWidth={1.3} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} /><p className="text-sm font-medium">No memories connected</p><p className="text-xs leading-6 mt-2" style={{ color: 'var(--text-muted)' }}>Project decisions and useful facts will appear here. Memory storage and recall are not connected yet.</p></div></div>
          </> : <>
            <div className="px-6 pt-5 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}><FileText size={13} />{section === 'global' ? 'Applies to all projects' : 'Applies to this project'}</div>
            <textarea key={section} aria-label={current.label} disabled placeholder={section === 'global' ? 'For example: explain your plan briefly and keep changes focused on my request.' : 'For example: use the existing project patterns and run the relevant checks.'} className="flex-1 min-h-40 w-full bg-transparent px-6 py-5 text-sm leading-7 resize-none outline-none cursor-not-allowed placeholder:text-[var(--text-faint)]" />
          </>}
          <footer className="px-6 py-3 border-t text-[11px] shrink-0" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>{section === 'facts' ? 'Memory storage and recall are not connected yet.' : 'Instruction storage and model use are not connected yet.'}</footer>
        </section>
      </div>
    </div>
  );
}
