import { useState } from 'react';
import { BookOpen, Plus, Search, Save, Globe, Folder, ChevronRight } from 'lucide-react';

const instructionScopes = [
  { id: 'global', title: 'Personal instructions', scope: 'All projects', description: 'How your models should respond and work with you.', icon: Globe, placeholder: 'Describe your response preferences and working habits.' },
  { id: 'project', title: 'Project instructions', scope: 'Current workspace', description: 'Project conventions, constraints, and required checks.', icon: Folder, placeholder: 'Describe the conventions and constraints for this workspace.' },
] as const;

export function MemoryView() {
  const [view, setView] = useState<'instructions' | 'memories'>('instructions');
  const [expanded, setExpanded] = useState<string | null>(null);
  return <main className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg-app)] text-[var(--text-main)]">
    <div className="max-w-3xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
      <header className="flex items-start justify-between gap-4 mb-7"><div><h1 className="text-xl font-medium">Memory</h1><p className="text-xs text-[var(--text-muted)] mt-2 leading-6">Instructions you set. Context you keep.</p></div><button disabled title="Memory storage is not connected" className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={14} />{view === 'instructions' ? 'Add instruction' : 'Add memory'}</button></header>
      <nav aria-label="Memory views" className="inline-flex gap-1 p-1 rounded-lg bg-[var(--bg-surface)] mb-7">{(['instructions', 'memories'] as const).map(id => <button key={id} onClick={() => setView(id)} aria-pressed={view === id} className="text-xs px-4 py-2 rounded-md focus-visible:outline focus-visible:outline-[var(--accent)]" style={{ backgroundColor: view === id ? 'var(--bg-active)' : undefined, color: view === id ? 'var(--text-main)' : 'var(--text-muted)' }}>{id === 'instructions' ? 'Instructions' : 'Saved memories'}</button>)}</nav>
      {view === 'instructions' ? <section aria-label="Instruction scopes" className="space-y-2">
        {instructionScopes.map(({ id, title, scope, description, icon: Icon, placeholder }) => <div key={id}>
          <button aria-expanded={expanded === id} aria-controls={`instruction-${id}`} onClick={() => setExpanded(expanded === id ? null : id)} className="flex items-center w-full gap-4 px-3 py-4 text-left rounded-lg hover:bg-[var(--bg-surface)] focus-visible:outline focus-visible:outline-[var(--accent)]">
            <Icon size={19} strokeWidth={1.5} className="shrink-0 text-[var(--text-muted)]" /><span className="flex-1 min-w-0"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-[var(--text-muted)] mt-1.5 leading-5">{description}</span><span className="block text-[11px] text-[var(--text-faint)] mt-2">{scope}</span></span><ChevronRight size={15} className={`shrink-0 text-[var(--text-muted)] transition-transform motion-reduce:transition-none ${expanded === id ? 'rotate-90' : ''}`} />
          </button>
          {expanded === id && <div id={`instruction-${id}`} className="ml-3 sm:ml-12 mr-3 pb-4 pt-2">
            <label htmlFor={`editor-${id}`} className="block text-[11px] text-[var(--text-muted)] mb-2">{title} · {scope}</label>
            <textarea id={`editor-${id}`} disabled placeholder={placeholder} className="w-full min-h-36 rounded-lg bg-[var(--bg-surface)] px-4 py-3 text-sm leading-6 resize-y outline-none disabled:cursor-not-allowed placeholder:text-[var(--text-faint)]" />
            <div className="flex items-center justify-between gap-3 mt-3"><span className="text-[11px] text-[var(--text-faint)]">Not connected to model requests yet</span><button disabled className="flex gap-2 items-center rounded-md bg-[var(--bg-surface)] px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed"><Save size={13} />Save</button></div>
          </div>}
        </div>)}
      </section> : <section aria-label="Saved memories">
        <div className="flex items-center gap-3 text-[var(--text-muted)] mb-7"><Search size={15} /><input disabled aria-label="Search saved memories" placeholder="Search saved memories…" className="flex-1 min-w-0 bg-transparent text-xs py-2 outline-none disabled:cursor-not-allowed" /><select disabled aria-label="Filter memory scope" className="bg-[var(--bg-app)] text-xs disabled:opacity-50"><option>All scopes</option></select></div>
        <div className="rounded-xl bg-[var(--bg-surface)] px-6 py-10 text-center"><BookOpen size={25} strokeWidth={1.3} className="mx-auto text-[var(--text-faint)] mb-4" /><h2 className="text-sm font-medium">No saved memories</h2><p className="text-xs leading-6 text-[var(--text-muted)] max-w-sm mx-auto mt-2">Saved project decisions and useful context will appear here.</p></div>
      </section>}
      <p className="mt-8 text-[11px] leading-5 text-[var(--text-faint)]">Memory storage is not connected. Adding, editing, and saving are unavailable.</p>
    </div>
  </main>;
}
