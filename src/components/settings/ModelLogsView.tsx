import { useRef, useState } from 'react';
import { ArrowDownToLine, Search, TerminalSquare, Trash2, Radio, ArrowDown, X } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { usePipeline } from '../chat/usePipeline';
import { LocalModelBlade } from '../rack/types';

const sources = [
  { id: 'model', label: 'Model I/O' },
  { id: 'shell', label: 'Tool output' },
  { id: 'server', label: 'Server' },
] as const;

export function ModelLogsView({ modelFilter, onClearModelFilter, pipeline, models }: {
  modelFilter: string | null; onClearModelFilter: () => void;
  pipeline: ReturnType<typeof usePipeline>; models: LocalModelBlade[];
}) {
  const [source, setSource] = useState<typeof sources[number]['id']>('model');
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('all');
  const [level, setLevel] = useState('all');
  const [cleared, setCleared] = useState<string[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const entries = pipeline.runs.flatMap(run=>run.plan.stages.flatMap(stage=>{
    const model=models.find(model=>model.id===stage.model_id);
    const result=run.results.find(result=>result.stage_id===stage.id);
    const modelName=model?.name??result?.model??stage.model_id;
    const output=result?.output??pipeline.text[stage.id];
    return [
      {id:`${run.plan.id}:${stage.id}:input`,source:'model',model:modelName,kind:'input',label:'Stage instruction',text:stage.instruction,status:run.status},
      ...(output?[{id:`${run.plan.id}:${stage.id}:output`,source:'model',model:modelName,kind:'output',label:'Model response',text:output,status:run.status}]:[]),
      ...pipeline.tools.filter(tool=>tool.planId===run.plan.id&&tool.stageId===stage.id).map(tool=>({id:`${run.plan.id}:${stage.id}:${tool.id}`,source:'shell',model:modelName,kind:'output',label:tool.name,text:`Arguments\n${tool.arguments}${tool.output?`\n\nOutput\n${tool.output}`:''}`,status:tool.status})),
    ];
  }));
  const visible=entries.filter(entry=>entry.source===source&&(!modelFilter||entry.model===modelFilter)&&(direction==='all'||source!=='model'||entry.kind===direction)&&(level==='all'||['error','failed'].includes(entry.status))&&!cleared.includes(entry.id)&&`${entry.model} ${entry.label} ${entry.text}`.toLowerCase().includes(query.toLowerCase()));
  const exportLogs=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(visible,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download='unfuse-conversation-logs.json';link.click();URL.revokeObjectURL(url);
  };
  const unsupported=source==='server'||!isTauri();
  return <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
    <header className="px-6 py-5 shrink-0"><h1 className="text-lg font-semibold">Logs</h1><p className="text-xs mt-1 text-[var(--text-muted)]">Selected conversation · stage instructions, model responses, and tool activity.</p></header>
    <div className="px-6 pt-3 shrink-0 flex flex-wrap items-center gap-1 bg-[var(--bg-surface)]">
      {sources.map(item=><button key={item.id} onClick={()=>setSource(item.id)} aria-pressed={source===item.id} className={`text-xs px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-hover)] ${source===item.id?'bg-[var(--bg-active)]':'text-[var(--text-muted)]'}`}>{item.label}</button>)}
      <span role="status" className="ml-auto flex items-center gap-1.5 px-2 text-[10px] text-[var(--text-muted)]"><Radio size={12}/>{unsupported?'Source unavailable':pipeline.loading?'Loading history':pipeline.busy?'Live':'Saved activity'}</span>
    </div>
    <div className="px-6 py-3 shrink-0 flex flex-wrap items-center gap-2 bg-[var(--bg-surface)]">
      {modelFilter&&<button onClick={onClearModelFilter} aria-label="Clear model filter" className="flex items-center gap-2 text-[11px] px-2 py-1 rounded-md bg-[var(--bg-active)]">{modelFilter}<X size={12}/></button>}
      <select aria-label="Filter log level" disabled={unsupported} value={level} onChange={event=>setLevel(event.target.value)} className="text-[11px] rounded-md p-1.5 bg-[var(--bg-app)] disabled:opacity-40"><option value="all">All outcomes</option><option value="errors">Errors only</option></select>
      {source==='model'&&<select aria-label="Filter model input or output" value={direction} onChange={event=>setDirection(event.target.value)} className="text-[11px] rounded-md p-1.5 bg-[var(--bg-app)]"><option value="all">Input & output</option><option value="input">Stage inputs</option><option value="output">Responses</option></select>}
      <label className="flex-1 min-w-[120px] flex items-center gap-2"><Search size={13}/><input disabled={unsupported} aria-label="Search model logs" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search logs…" className="w-full min-w-0 bg-transparent text-xs outline-none disabled:opacity-40"/></label>
      <button disabled={!visible.length} onClick={exportLogs} aria-label="Export logs" className="p-1.5 disabled:opacity-40"><ArrowDownToLine size={15}/></button>
      <button disabled={!visible.length} onClick={()=>setCleared(current=>[...current,...visible.map(entry=>entry.id)])} aria-label="Clear log view" title="Hide visible entries; saved history is retained" className="p-1.5 disabled:opacity-40"><Trash2 size={15}/></button>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 select-text">
      {!visible.length?<div className="py-12 text-center text-[var(--text-muted)]"><TerminalSquare size={26} className="mx-auto mb-4"/><p className="text-sm">{source==='server'?'Provider server logs are unavailable':pipeline.loading?'Loading conversation activity…':'No matching activity'}</p><p className="mt-2 text-xs leading-6">{source==='server'?'Your inference provider manages its own process logs.':!isTauri()?'Open the Unfuse desktop app to load stored activity.':'Run a task or select a saved conversation to inspect its activity.'}</p></div>:visible.map(entry=><article key={entry.id} className="py-4"><header className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]"><span className="font-medium text-[var(--text-main)]">{entry.label}</span><span>{entry.model}</span><span className="ml-auto">{entry.status}</span></header><pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 font-mono">{entry.text}</pre></article>)}
      <div ref={bottom}/>
    </div>
    <footer className="px-6 py-3 shrink-0 flex items-center justify-between text-[10px] text-[var(--text-muted)]"><span>{visible.length} entries</span><button disabled={!visible.length} onClick={()=>bottom.current?.scrollIntoView({behavior:'instant',block:'end'})} className="flex items-center gap-1 disabled:opacity-40"><ArrowDown size={12}/>Latest output</button></footer>
  </div>;
}
