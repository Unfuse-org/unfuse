import { ArrowUpRight, Layers3, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { LocalModelBlade } from '../rack/types';
import { getModelLogo } from '../rack/MountModelView';
import { ChatSession } from '../sidebar/types';
import { usePipeline } from '../chat/usePipeline';

export function DashboardView({ models, onOpenLogs, onOpenRack, sessions, pipeline, onOpenSession }: { models: LocalModelBlade[]; onOpenLogs: (model: string) => void; onOpenRack: () => void; sessions:ChatSession[]; pipeline:ReturnType<typeof usePipeline>; onOpenSession:(id:string)=>void }) {
  const [telemetry,setTelemetry]=useState<{cpu_usage_pct:number;ram_used_gb:number;ram_total_gb:number;ram_usage_pct:number}|null>(null);
  const [telemetryError,setTelemetryError]=useState('');
  useEffect(()=>{
    if(!isTauri())return;
    let active=true;
    let timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try{const result=await invoke<NonNullable<typeof telemetry>>('get_system_telemetry');if(active){setTelemetry(result);setTelemetryError('');}}
      catch(error){if(active)setTelemetryError(String(error));}
      if(active)timer=setTimeout(()=>void poll(),3000);
    };
    void poll();return ()=>{active=false;clearTimeout(timer);};
  },[]);
  return <main className="h-full w-full overflow-y-auto text-[var(--text-main)] bg-[var(--bg-app)]">
    <div className="max-w-5xl mx-auto px-6 py-8 sm:px-9 space-y-10">
      <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-medium">Workspace</h1><button onClick={onOpenRack} className="flex gap-2 items-center text-xs rounded-lg px-3 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]"><Layers3 size={15} />Model rack</button></header>
      {telemetry&&<section aria-label="System resources" className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-[var(--text-muted)]"><span>CPU <strong className="ml-2 font-medium text-[var(--text-main)]">{telemetry.cpu_usage_pct}%</strong></span><span>System memory <strong className="ml-2 font-medium text-[var(--text-main)]">{telemetry.ram_used_gb} / {telemetry.ram_total_gb} GiB · {telemetry.ram_usage_pct}%</strong></span></section>}
      {telemetryError&&<p role="status" className="text-xs text-[var(--text-muted)]">System resources unavailable: {telemetryError}</p>}
      <section aria-label="Your models"><h2 className="text-sm font-medium mb-4">Your models</h2>{models.length ? <div className="space-y-2">{models.map(model => <button key={model.id} onClick={() => onOpenLogs(model.name)} className="flex w-full items-center gap-3 text-left rounded-lg p-3 hover:bg-[var(--bg-surface)]">{getModelLogo(model.family, model.provider, 22, model.name)}<span className="flex-1 min-w-0"><span className="block text-sm truncate">{model.displayName}</span><span className="block text-xs text-[var(--text-muted)] mt-1">{model.provider}</span></span><ArrowUpRight size={15} className="text-[var(--text-muted)]" /></button>)}</div> : <div className="py-8"><Layers3 size={25} strokeWidth={1.3} className="text-[var(--text-faint)] mb-4" /><p className="text-sm">No models connected</p><p className="text-xs text-[var(--text-muted)] mt-2">Add a local model to your rack to get started.</p></div>}</section>
      <section aria-label="Current activity"><h2 className="text-sm font-medium mb-4">Activity</h2><div className="flex gap-3 items-center py-5 text-xs text-[var(--text-muted)]"><Activity size={18} strokeWidth={1.5} />{pipeline.busy ? `Pipeline running · ${pipeline.approvals.length ? 'Waiting for your approval' : 'Models working'}` : pipeline.loading ? 'Loading conversation activity…' : 'No active run in the selected conversation.'}</div>{pipeline.error&&<p role="alert" className="text-xs text-red-400">{pipeline.error}</p>}</section>
      <section aria-label="Recent work"><h2 className="text-sm font-medium mb-4">Recent work</h2>{sessions.length?<div className="space-y-1">{sessions.slice(0,8).map(session=><button key={session.id} onClick={()=>onOpenSession(session.id)} className="flex w-full items-center justify-between gap-4 rounded-lg px-3 py-3 text-left hover:bg-[var(--bg-surface)]"><span className="truncate text-sm">{session.title}</span><span className="shrink-0 text-[11px] text-[var(--text-muted)]">{session.messageCount} turns · {session.updatedAt.toLocaleDateString()}</span></button>)}</div>:<p className="text-xs text-[var(--text-muted)] py-5">No saved conversations in this workspace.</p>}</section>
    </div>
  </main>;
}
