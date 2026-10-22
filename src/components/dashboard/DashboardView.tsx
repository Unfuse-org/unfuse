import { ArrowUpRight, Layers3, Activity, ChevronRight, Plus, Check, MessageSquare, Cpu, HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { LocalModelBlade } from '../rack/types';
import { getModelLogo } from '../rack/MountModelView';
import { OllamaLogo, LMStudioLogo, MLXLogo, VLLMLogo, LlamaCppLogo, UnslothLogo } from '../rack/Logos';
import { ChatSession } from '../sidebar/types';
import { usePipeline } from '../chat/usePipeline';

const runners = [
  { name: 'Ollama', Logo: OllamaLogo }, { name: 'LM Studio', Logo: LMStudioLogo },
  { name: 'MLX', Logo: MLXLogo }, { name: 'vLLM', Logo: VLLMLogo },
  { name: 'llama.cpp', Logo: LlamaCppLogo }, { name: 'Unsloth', Logo: UnslothLogo },
];
const action = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]';

export function DashboardView({ models, onOpenLogs, onOpenRack, sessions, pipeline, onOpenSession, onOpenChat, workspaceRoot }: {
  models: LocalModelBlade[]; onOpenLogs: (model: string) => void; onOpenRack: () => void;
  sessions: ChatSession[]; pipeline: ReturnType<typeof usePipeline>; onOpenSession: (id: string) => void;
  onOpenChat: () => void; workspaceRoot: string;
}) {
  const [selectedModelId, setSelectedModelId] = useState('');
  const [telemetry, setTelemetry] = useState<{cpu_usage_pct:number;ram_used_gb:number;ram_total_gb:number;ram_usage_pct:number}|null>(null);
  const [telemetryError, setTelemetryError] = useState('');
  useEffect(() => {
    if (!isTauri()) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await invoke<NonNullable<typeof telemetry>>('get_system_telemetry');
        if (active) { setTelemetry(result); setTelemetryError(''); }
      } catch (error) { if (active) setTelemetryError(String(error)); }
      if (active) timer = setTimeout(() => void poll(), 3000);
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  const model = models.find(item => item.id === selectedModelId) ?? models.find(item => item.status === 'active') ?? models[0];
  const run = pipeline.runs.find(item => item.status === 'running') ?? pipeline.runs[pipeline.runs.length - 1];
  const projectName = workspaceRoot.split(/[\\/]/).filter(Boolean).pop();
  const resources = [
    { label: 'System memory', Icon: HardDrive, value: telemetry ? `${telemetry.ram_used_gb} / ${telemetry.ram_total_gb}` : null, unit: 'GiB', percent: telemetry?.ram_usage_pct },
    { label: 'CPU', Icon: Cpu, value: telemetry ? `${telemetry.cpu_usage_pct}` : null, unit: '%', percent: telemetry?.cpu_usage_pct },
  ];
  return <main className="h-full w-full overflow-y-auto bg-[var(--bg-app)] text-[var(--text-main)]">
    <div className="mx-auto max-w-7xl px-6 py-8 sm:px-9">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-medium text-balance">{projectName ?? 'Workspace'}</h1></div>
        <div className="flex items-center gap-2"><button onClick={onOpenChat} className={action}><MessageSquare size={15}/>Open chat</button><button onClick={onOpenRack} className={`${action} bg-[var(--bg-surface)]`}><Layers3 size={15}/>Model rack</button></div>
      </header>
      <div className="grid gap-9 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
        <section aria-label="Your models" className="min-w-0">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">Your models</h2><span className="text-xs tabular-nums text-[var(--text-muted)]">{models.length} / 6 connections</span></div>
          {model ? <>
            <div aria-label="Select a model to inspect" className="mb-1 flex gap-1 overflow-x-auto pb-2">{models.map(item=><button key={item.id} onClick={()=>setSelectedModelId(item.id)} aria-pressed={model.id===item.id} className={`flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs focus-visible:outline focus-visible:outline-[var(--accent)] ${model.id===item.id?'bg-[var(--bg-active)]':'text-[var(--text-muted)] hover:bg-[var(--bg-surface)]'}`}>{getModelLogo(item.family,item.provider,16,item.name)}{item.provider}</button>)}</div>
            <div className="rounded-xl bg-[var(--bg-surface)] p-6">
              <div className="mb-7 flex items-center justify-between gap-4"><span className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]"><span className="size-1.5 rounded-full bg-[var(--status-success)]"/>{pipeline.runs.some(item=>item.status==='running'&&item.active_stage?.model_id===model.id)?'Working':model.loaded===true?'Loaded in runner':model.loaded===false?'Available in runner':'Configured connection'}</span>{getModelLogo(model.family,model.provider,42,model.name)}</div>
              <h3 className="break-words text-3xl font-medium text-balance">{model.displayName}</h3><p className="mt-2 text-xs text-[var(--text-muted)]">{model.provider}</p>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs text-[var(--text-muted)]">Context</p><p className="text-2xl font-light tabular-nums">{(model.contextBudget ?? model.contextLength ?? model.maxContextLength)?.toLocaleString() ?? 'Not reported'}{(model.contextBudget ?? model.contextLength ?? model.maxContextLength)&&<span className="ml-2 text-xs text-[var(--text-muted)]">{model.contextBudget?'budget':model.contextLength?'active':'max'} tokens</span>}</p></div><button onClick={()=>onOpenLogs(model.name)} className={`${action} -mr-3`}>Inspect logs<ArrowUpRight size={14}/></button></div>
            </div>
          </> : <div className="flex min-h-72 flex-col justify-between rounded-xl bg-[var(--bg-surface)] p-6">
            <div className="flex items-start justify-between"><span className="text-xs text-[var(--text-muted)]">Local model rack</span><Layers3 size={34} strokeWidth={1.2} className="text-[var(--text-muted)]"/></div>
            <div className="my-6"><h3 className="max-w-xs text-3xl font-medium text-balance">No models connected</h3><p className="mt-3 max-w-sm text-xs leading-6 text-[var(--text-muted)]">Choose a model from your runner.</p></div>
            <button onClick={onOpenRack} className={`${action} w-fit bg-[var(--text-main)] text-[var(--bg-app)] hover:opacity-90 hover:!bg-[var(--text-main)]`}><Plus size={15}/>Connect a model</button>
          </div>}
          <div className="mt-6 grid grid-cols-2 gap-6" aria-label="System resources">{resources.map(({label,Icon,value,unit,percent})=><div key={label} className="min-w-0"><p className="flex items-center gap-2 text-xs text-[var(--text-muted)]"><Icon size={14}/>{label}</p><p className="my-3 text-xl font-light tabular-nums">{value ?? 'Unavailable'}{value&&<span className="ml-1.5 text-xs text-[var(--text-muted)]">{unit}</span>}</p><div role={percent!==undefined?'meter':undefined} aria-label={label} aria-valuemin={percent!==undefined?0:undefined} aria-valuemax={percent!==undefined?100:undefined} aria-valuenow={percent} className="h-1 overflow-hidden rounded-full bg-[var(--bg-active)]"><div className="h-full origin-left bg-[var(--text-muted)]" style={{transform:`scaleX(${Math.min(100,Math.max(0,percent??0))/100})`}}/></div></div>)}</div>
          {telemetryError&&<p role="status" className="mt-3 text-xs text-[var(--status-error)]">{telemetryError}</p>}
          {!model&&<div className="mt-7"><p className="mb-3 text-xs text-[var(--text-muted)]">Supported runners</p><div className="flex flex-wrap gap-x-5 gap-y-3">{runners.map(({name,Logo})=><span key={name} title={name} className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><Logo size={17}/>{name}</span>)}</div></div>}
        </section>
        <section aria-label="Current pipeline" className="flex min-w-0 flex-col">
          <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-sm font-medium">{run?'Pipeline':'Activity'}</h2><span className="text-xs text-[var(--text-muted)]">Selected conversation</span></div>
          {run ? <>
            <div className="mb-6"><span className="text-xs capitalize text-[var(--text-muted)]">{run.status}</span><h3 className="mt-3 line-clamp-3 text-2xl font-medium leading-8 text-balance">{run.plan.request}</h3><p className="mt-2 text-xs text-[var(--text-muted)]">{run.results.length} of {run.plan.stages.length} stages complete</p></div>
            <ol>{run.plan.stages.map((stage,index)=>{
              const result=run.results.find(item=>item.stage_id===stage.id);
              const active=run.status==='running'&&run.active_stage?.stage_id===stage.id;
              const stageModel=models.find(item=>item.id===stage.model_id);
              return <li key={stage.id} className="flex gap-4"><div className="flex w-7 shrink-0 flex-col items-center"><span className={`flex size-7 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs ${result?'text-[var(--status-success)]':active?'text-[var(--accent)]':'text-[var(--text-muted)]'}`}>{result?<Check size={13}/>:index+1}</span>{index<run.plan.stages.length-1&&<span className="my-1 w-px flex-1 bg-[var(--border-subtle)]"/>}</div><div className="min-w-0 flex-1 pb-6"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-medium leading-7">{stageModel?.displayName??result?.model??stage.model_id}</p><span className="shrink-0 text-[11px] text-[var(--text-muted)]">{result?'Complete':active?'Working':run.status==='running'?'Waiting':'Not run'}</span></div><p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{stage.instruction}</p></div></li>;
            })}</ol>
            {pipeline.approvals.length>0&&<p role="status" className="mb-4 text-xs text-[var(--status-warning)]">Waiting for your approval in chat.</p>}
          </> : <div className="flex min-h-64 flex-1 flex-col items-start justify-center py-4"><Activity size={30} strokeWidth={1.2} className="mb-6 text-[var(--text-muted)]"/><h3 className="max-w-xs text-2xl font-medium text-balance">No active pipeline</h3>{pipeline.loading && <p className="mt-3 max-w-sm text-xs leading-6 text-[var(--text-muted)]">Loading pipeline…</p>}</div>}
          <button onClick={onOpenChat} className={`${action} mt-auto w-fit -ml-3`}>{run?'View conversation':'Start in chat'}<ChevronRight size={14}/></button>
          {pipeline.error&&<p role="alert" className="mt-3 text-xs text-[var(--status-error)]">{pipeline.error}</p>}
        </section>
      </div>
      <section aria-label="Recent work" className="mt-10 pb-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-medium">Recent work</h2><span className="text-xs text-[var(--text-muted)]">Local history</span></div>
        {sessions.length?<div>{sessions.slice(0,8).map(session=><button key={session.id} onClick={()=>onOpenSession(session.id)} className="group flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-left hover:bg-[var(--bg-surface)] focus-visible:outline focus-visible:outline-[var(--accent)]"><MessageSquare size={15} className="shrink-0 text-[var(--text-muted)]"/><span className="min-w-0 flex-1 truncate text-sm">{session.title}</span><span className="hidden shrink-0 text-xs tabular-nums text-[var(--text-muted)] sm:inline">{session.messageCount} turns</span><time dateTime={session.updatedAt.toISOString()} className="shrink-0 text-xs text-[var(--text-muted)]">{session.updatedAt.toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time><ChevronRight size={14} className="text-[var(--text-muted)]"/></button>)}</div>:<div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-[var(--bg-surface)] px-5 py-5"><div><p className="text-sm">No recent chats</p></div><button onClick={onOpenChat} className={action}>Open chat<ArrowUpRight size={14}/></button></div>}
      </section>
    </div>
  </main>;
}
