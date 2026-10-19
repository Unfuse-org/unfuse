import { useState } from 'react';
import { BookOpen, Save, Globe, Folder, Search, ArrowUpRight } from 'lucide-react';

const scopes = [
  { id: 'global', title: 'Personal instructions', scope: 'All projects', description: 'How your models should respond and work with you.', icon: Globe, placeholder: 'Describe your response preferences and working habits.' },
  { id: 'project', title: 'Project instructions', scope: 'Current workspace', description: 'Project conventions, constraints, and required checks.', icon: Folder, placeholder: 'Describe the conventions and constraints for this workspace.' },
  { id: 'memories', title: 'Saved memories', scope: 'Decisions and context', description: 'Useful context kept across conversations.', icon: BookOpen, placeholder: '' },
] as const;

export function MemoryView() {
  const [selected, setSelected] = useState<string>('global');
  const current = scopes.find(scope => scope.id === selected)!;
  return <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-app)] px-6 py-7 text-[var(--text-main)] sm:px-8">
    <header className="mb-7"><h1 className="text-xl font-semibold">Memory</h1><p className="mt-2 text-[13px] text-[var(--text-muted)]">Your preferences, project rules, and lasting context.</p></header>
    <div className="flex flex-1 flex-wrap gap-8">
      <aside className="w-56 min-w-0 grow-0 shrink-0 max-w-full">
        <nav aria-label="Memory scopes" className="space-y-1">{scopes.map(({ id, title, scope, icon: Icon }) => <button key={id} onClick={() => setSelected(id)} aria-pressed={selected === id} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left focus-visible:outline focus-visible:outline-[var(--accent)] ${selected === id ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-surface)]'}`}><Icon size={18} className="shrink-0 text-[var(--text-muted)]"/><span><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-[11px] text-[var(--text-muted)]">{scope}</span></span></button>)}</nav>
        <div className="mt-8 px-3 text-xs leading-6 text-[var(--text-muted)]"><h2 className="mb-2 font-medium text-[var(--text-main)]">What belongs here</h2><p>Personal instructions cover your preferred tone and working habits.</p><p className="mt-3">Project instructions cover conventions, constraints, and the checks you expect before a task is finished.</p><a href="https://agents.md/" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 hover:text-[var(--text-main)]">About project instructions<ArrowUpRight size={13}/></a></div>
      </aside>
      <section aria-label={current.title} className="flex min-h-[420px] min-w-0 basis-72 flex-1 flex-col">
        <header className="mb-5"><p className="text-[11px] text-[var(--text-muted)]">{current.scope}</p><h2 className="mt-2 text-base font-medium">{current.title}</h2><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{current.description}</p></header>
        {selected === 'memories' ? <div className="flex flex-1 flex-col"><label className="flex items-center gap-2 rounded-lg bg-[var(--bg-surface)] px-3"><Search size={14}/><input disabled aria-label="Search saved memories" placeholder="Search saved memories" className="w-full bg-transparent py-3 text-xs disabled:cursor-not-allowed"/></label><div className="mt-6 grid grid-cols-2 text-[11px] text-[var(--text-muted)]"><span>Memory</span><span>Scope</span></div><p className="mt-6 text-xs leading-6 text-[var(--text-muted)]">Saved memories will be available when memory storage is connected.</p></div> : <><label htmlFor="memory-instructions" className="sr-only">{current.title}</label><textarea key={selected} id="memory-instructions" disabled placeholder={current.placeholder} className="min-h-64 w-full flex-1 resize-none rounded-xl bg-[var(--bg-surface)] p-5 text-sm leading-7 placeholder:text-[var(--text-faint)] disabled:cursor-not-allowed"/><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[11px] leading-5 text-[var(--text-muted)]">Not connected to model requests yet</span><button disabled className="flex items-center gap-2 rounded-lg bg-[var(--bg-active)] px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40"><Save size={13}/>Save</button></div></>}
        <p className="mt-5 text-[11px] leading-5 text-[var(--text-faint)]">Memory storage is not connected. Adding, editing, and saving are unavailable.</p>
      </section>
    </div>
  </main>;
}
