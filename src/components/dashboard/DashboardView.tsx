import { ArrowUpRight, Layers3, Activity } from 'lucide-react';
import { LocalModelBlade } from '../rack/types';
import { getModelLogo } from '../rack/MountModelView';

export function DashboardView({ models, onOpenLogs, onOpenRack }: { models: LocalModelBlade[]; onOpenLogs: (model: string) => void; onOpenRack: () => void }) {
  return <main className="h-full w-full overflow-y-auto text-[var(--text-main)] bg-[var(--bg-app)]">
    <div className="max-w-5xl mx-auto px-6 py-8 sm:px-9 space-y-10">
      <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-medium">Workspace</h1><button onClick={onOpenRack} className="flex gap-2 items-center text-xs rounded-lg px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]"><Layers3 size={15} />Model rack</button></header>
      <section aria-label="Your models"><h2 className="text-sm font-medium mb-4">Your models</h2>{models.length ? <div className="space-y-2">{models.map(model => <button key={model.id} onClick={() => onOpenLogs(model.name)} className="flex w-full items-center gap-3 text-left rounded-lg p-3 hover:bg-[var(--bg-surface)]">{getModelLogo(model.family, model.provider, 22, model.name)}<span className="flex-1 min-w-0"><span className="block text-sm truncate">{model.displayName}</span><span className="block text-xs text-[var(--text-muted)] mt-1">{model.provider}</span></span><ArrowUpRight size={15} className="text-[var(--text-muted)]" /></button>)}</div> : <div className="py-8"><Layers3 size={25} strokeWidth={1.3} className="text-[var(--text-faint)] mb-4" /><p className="text-sm">No models connected</p><p className="text-xs text-[var(--text-muted)] mt-2">Add a local model to your rack to get started.</p></div>}</section>
      <section aria-label="Current activity"><h2 className="text-sm font-medium mb-4">Activity</h2><div className="flex gap-3 items-center py-5 text-xs text-[var(--text-muted)]"><Activity size={18} strokeWidth={1.5} />No active runs.</div></section>
      <section aria-label="Recent work"><h2 className="text-sm font-medium mb-4">Recent work</h2><p className="text-xs text-[var(--text-muted)] py-5">Completed runs will appear here when execution history is connected.</p></section>
    </div>
  </main>;
}
