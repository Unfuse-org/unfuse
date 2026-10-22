import { useRef, useState } from 'react';
import { ArrowDownToLine, Search, TerminalSquare, Trash2, Radio, ArrowDown, X, FlaskConical, ChevronRight, ArrowUpRight, ArrowDownLeft, Check, CircleAlert, FileCode2, RotateCcw } from 'lucide-react';
import { isTauri } from '@tauri-apps/api/core';
import { usePipeline } from '../chat/usePipeline';
import { LocalModelBlade } from '../rack/types';
import { ModelFamilyLogo } from '../chat/ModelIdentity';
import { SyntaxSnippet } from '../chat/SyntaxSnippet';

const sources = [
  { id: 'model', label: 'Model I/O', description: 'Instructions in. Responses out.' },
  { id: 'shell', label: 'Tool output', description: 'Commands, file operations, and their results.' },
  { id: 'server', label: 'Server', description: 'Runtime events, HTTP requests, and provider errors.' },
] as const;
type LogSource = typeof sources[number]['id'];
type LogEntry = {
  id: string; source: LogSource; model: string; kind: 'input' | 'output'; label: string;
  text: string; status: string; level: 'info' | 'warn' | 'error';
  args?: string; time?: string; detail?: string; language?: string;
};
// Isolated illustrative records. They never enter conversation history or the provider stream.
const demoEntries: LogEntry[] = [
  { id:'demo-input',source:'model',model:'qwen2.5-coder:7b',kind:'input',label:'Prompt sent to model',time:'10:42:03.128',status:'sent',level:'info',detail:'req_demo_01 · LM Studio · 8,192-token context',text:'System\nYou are working in the atlas project. Inspect the source before proposing changes.\n\nUser\nFind why the sign-in form accepts an empty email. Explain the fix and verify it.' },
  { id:'demo-output',source:'model',model:'qwen2.5-coder:7b',kind:'output',label:'Model response',time:'10:42:05.742',status:'completed',level:'info',detail:'req_demo_01 · 148 output tokens · 2.61 s · Illustrative',text:'The form checks whether email exists, but whitespace is still truthy. Trim the value before validation.\n\nI updated the guard in src/auth/validate.ts and verified both empty and whitespace-only input. The three validation tests pass.' },
  { id:'demo-input-review',source:'model',model:'gemma-3-4b-it',kind:'input',label:'Next-stage instruction',time:'10:42:05.801',status:'sent',level:'info',detail:'req_demo_02 · Ollama · Sequential handoff',text:'Review the previous stage’s proposed email validation fix. Check the implementation and test evidence before agreeing.' },
  { id:'demo-read',source:'shell',model:'qwen2.5-coder:7b',kind:'output',label:'read_file',time:'10:42:03.410',status:'completed',level:'info',detail:'src/auth/validate.ts · Lines 1–4',args:'{"path":"src/auth/validate.ts","offset":1,"limit":4}',language:'typescript',text:'export function isValidEmail(email: string) {\n  const value = email.trim();\n  return value.length > 0 && value.includes("@");\n}' },
  { id:'demo-bash',source:'shell',model:'qwen2.5-coder:7b',kind:'output',label:'bash',time:'10:42:04.110',status:'completed',level:'info',detail:'Exit 0 · 482 ms · /projects/atlas',args:'{"command":"npm test -- src/auth/validate.test.ts"}',language:'text',text:'PASS  src/auth/validate.test.ts\n  ✓ rejects an empty email\n  ✓ rejects whitespace-only input\n  ✓ accepts a valid email\n\nTests: 3 passed, 3 total' },
  { id:'demo-bash-error',source:'shell',model:'gemma-3-4b-it',kind:'output',label:'bash',time:'10:42:06.020',status:'error',level:'error',detail:'Exit 1 · 94 ms · /projects/atlas',args:'{"command":"npm run lint"}',text:'npm error Missing script: "lint"\nnpm error To see available scripts, run:\nnpm error   npm run' },
  { id:'demo-server-start',source:'server',model:'LM Studio',kind:'output',label:'server',time:'10:41:58.004',status:'ready',level:'info',text:'HTTP server listening on 127.0.0.1:1234' },
  { id:'demo-server-model',source:'server',model:'LM Studio',kind:'output',label:'runtime',time:'10:42:01.517',status:'loaded',level:'info',text:'Loaded qwen2.5-coder:7b · context allocation 8192 tokens' },
  { id:'demo-server-request',source:'server',model:'LM Studio',kind:'output',label:'http',time:'10:42:03.131',status:'accepted',level:'info',text:'POST /v1/chat/completions · req_demo_01 · stream=true' },
  { id:'demo-server-warning',source:'server',model:'LM Studio',kind:'output',label:'context',time:'10:42:03.145',status:'warning',level:'warn',text:'Prompt is approaching the allocated context limit. Reduce history or increase the runner allocation before the next request.' },
  { id:'demo-server-complete',source:'server',model:'LM Studio',kind:'output',label:'http',time:'10:42:05.743',status:'completed',level:'info',text:'200 OK · req_demo_01 · 148 output tokens · 2612 ms' },
  { id:'demo-server-error',source:'server',model:'Ollama',kind:'output',label:'http',time:'10:42:06.290',status:'error',level:'error',text:'503 Service Unavailable · req_demo_03 · requested model is no longer loaded. Check the runner before retrying.' },
];
const button = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed';
const levelColor = { info:'var(--text-muted)', warn:'var(--status-warning)', error:'var(--status-error)' };
function toolCommand(args?: string) {
  try { const value:unknown=JSON.parse(args??'{}'); return value&&typeof value==='object'&&'command' in value&&typeof value.command==='string'?value.command:null; }
  catch { return null; }
}
function LogRecord({ entry }: { entry:LogEntry }) {
  return <details className="group/record mt-3 text-[var(--text-muted)]"><summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[11px] focus-visible:outline focus-visible:outline-[var(--accent)] [&::-webkit-details-marker]:hidden"><ChevronRight size={12} className="group-open/record:rotate-90"/>Log record (JSON)</summary><div className="mt-2 max-h-64 overflow-auto rounded-lg bg-[var(--bg-surface)] p-3"><SyntaxSnippet text={JSON.stringify(entry,null,2)}/></div></details>;
}

export function ModelLogsView({ modelFilter, onClearModelFilter, pipeline, models }: {
  modelFilter: string | null; onClearModelFilter: () => void;
  pipeline: ReturnType<typeof usePipeline>; models: LocalModelBlade[];
}) {
  const [source, setSource] = useState<LogSource>('model');
  const [demo, setDemo] = useState(false);
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('all');
  const [level, setLevel] = useState('all');
  const [cleared, setCleared] = useState<string[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const entries:LogEntry[] = pipeline.runs.flatMap(run=>run.plan.stages.flatMap(stage=>{
    const model=models.find(model=>model.id===stage.model_id);
    const result=run.results.find(result=>result.stage_id===stage.id);
    const modelName=model?.name??result?.model??stage.model_id;
    const output=result?.output??pipeline.text[stage.id];
    return [
      {id:`${run.plan.id}:${stage.id}:input`,source:'model' as const,model:modelName,kind:'input' as const,label:'Stage instruction',text:stage.instruction,status:run.status,level:'info' as const},
      ...(output?[{id:`${run.plan.id}:${stage.id}:output`,source:'model' as const,model:modelName,kind:'output' as const,label:'Model response',text:output,status:run.status,level:run.status==='failed'?'error' as const:'info' as const}]:[]),
      ...pipeline.tools.filter(tool=>tool.planId===run.plan.id&&tool.stageId===stage.id).map(tool=>({id:`${run.plan.id}:${stage.id}:${tool.id}`,source:'shell' as const,model:modelName,kind:'output' as const,label:tool.name,args:tool.arguments,text:tool.output,status:tool.status,level:tool.status==='error'?'error' as const:'info' as const})),
    ];
  }));
  const allEntries=demo?demoEntries:entries;
  const visible=allEntries.filter(entry=>entry.source===source&&(demo||!modelFilter||entry.model===modelFilter)&&(direction==='all'||source!=='model'||entry.kind===direction)&&(level==='all'||entry.level===level)&&!cleared.includes(entry.id)&&`${entry.model} ${entry.label} ${entry.text} ${entry.args??''}`.toLowerCase().includes(query.toLowerCase()));
  const exportLogs=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(visible,null,2)],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=demo?'unfuse-demo-logs.json':'unfuse-conversation-logs.json';link.click();URL.revokeObjectURL(url);
  };
  const unsupported=!demo&&(source==='server'||!isTauri());
  const resetDemo=()=>{setCleared(current=>current.filter(id=>!id.startsWith('demo-')));setQuery('');setLevel('all');setDirection('all');};
  return <main className="flex min-h-0 flex-1 flex-col bg-[var(--bg-app)] text-[var(--text-main)]">
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 px-6 pb-5 pt-7"><div><h1 className="text-xl font-medium">Logs</h1><p className="mt-2 text-xs text-[var(--text-muted)]">{sources.find(item=>item.id===source)?.description}</p></div><button aria-pressed={demo} onClick={()=>{setDemo(value=>!value);setQuery('');setLevel('all');setDirection('all');}} className={`${button} ${demo?'bg-[var(--bg-active)]':'bg-[var(--bg-surface)]'}`}><FlaskConical size={14}/>{demo?'Back to live':'Demo logs'}</button></header>
    {demo&&<div role="status" className="mx-6 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--bg-surface)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]"><strong className="font-medium text-[var(--text-main)]">Demo logs</strong><span className="mx-2">·</span>Illustrative records. Nothing is sent to a model or saved to your history.</p><button onClick={resetDemo} className={button}><RotateCcw size={13}/>Reset demo</button></div>}
    <nav aria-label="Log sources" className="flex shrink-0 flex-wrap items-center gap-1 px-6">
      {sources.map(item=><button key={item.id} onClick={()=>{setSource(item.id);setLevel('all');}} aria-pressed={source===item.id} className={`${button} ${source===item.id?'bg-[var(--bg-active)]':'text-[var(--text-muted)]'}`}>{item.label}</button>)}
      <span role="status" className="ml-auto flex items-center gap-1.5 px-2 text-[11px] text-[var(--text-muted)]"><Radio size={12}/>{demo?'Demo':unsupported?'Source unavailable':pipeline.loading?'Loading history':pipeline.busy?'Live':'Saved activity'}</span>
    </nav>
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-4">
      {!demo&&modelFilter&&<button onClick={onClearModelFilter} aria-label="Clear model filter" className={`${button} max-w-full bg-[var(--bg-surface)]`}><span className="truncate">{modelFilter}</span><X size={12}/></button>}
      <select aria-label="Filter log level" disabled={unsupported} value={level} onChange={event=>setLevel(event.target.value)} className="rounded-md bg-[var(--bg-surface)] p-2 text-xs disabled:opacity-40"><option value="all">All levels</option><option value="error">Errors only</option>{source==='server'&&<option value="warn">Warnings only</option>}</select>
      {source==='model'&&<select aria-label="Filter model input or output" value={direction} onChange={event=>setDirection(event.target.value)} className="rounded-md bg-[var(--bg-surface)] p-2 text-xs"><option value="all">Input & output</option><option value="input">Inputs</option><option value="output">Responses</option></select>}
      <label className="flex min-w-32 flex-1 items-center gap-2 rounded-lg bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-muted)]"><Search size={13}/><input disabled={unsupported} aria-label="Search model logs" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search logs…" className="min-w-0 w-full bg-transparent text-xs text-[var(--text-main)] outline-none disabled:opacity-40"/></label>
      <button disabled={!visible.length} onClick={exportLogs} aria-label="Export logs" title="Export visible log records" className={`${button} !px-2`}><ArrowDownToLine size={15}/></button><button disabled={!visible.length} onClick={()=>setCleared(current=>[...current,...visible.map(entry=>entry.id)])} aria-label="Clear log view" title="Hide visible entries; saved history is retained" className={`${button} !px-2`}><Trash2 size={15}/></button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 select-text">
      {!visible.length?<div className="py-12 text-center text-[var(--text-muted)]"><TerminalSquare size={26} className="mx-auto mb-4"/><p className="text-sm">{!demo&&source==='server'?'Provider server logs are unavailable':pipeline.loading&&!demo?'Loading conversation activity…':'No matching activity'}</p><p className="mt-2 text-xs leading-6">{!demo&&source==='server'?'Live server logs need a provider log connection. Use Demo logs to preview the console.':!demo&&!isTauri()?'Open the desktop app for saved activity, or preview Demo logs.':demo?'Try another filter or reset the demo to restore its entries.':'Run a task or select a saved conversation to inspect its activity.'}</p></div>:visible.map(entry=>{
        if(source==='server')return <article key={entry.id} className="py-2 font-mono text-[11px] leading-6"><div className="flex flex-wrap items-baseline gap-x-3"><time className="shrink-0 tabular-nums text-[var(--text-muted)]">{entry.time}</time><span className="w-10 shrink-0 uppercase" style={{color:levelColor[entry.level]}}>{entry.level}</span><span className="shrink-0 text-[var(--text-muted)]">[{entry.model}/{entry.label}]</span><p className="min-w-0 basis-72 flex-1 break-words" style={{color:entry.level==='error'?'var(--status-error)':undefined}}>{entry.text}</p></div><LogRecord entry={entry}/></article>;
        if(source==='shell'){
          const command=entry.label==='bash'?toolCommand(entry.args):null;
          return <details key={entry.id} open className="group/tool mb-4 rounded-lg bg-[var(--bg-surface)] px-4 py-3"><summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-xs focus-visible:outline focus-visible:outline-[var(--accent)] [&::-webkit-details-marker]:hidden"><ChevronRight size={13} className="group-open/tool:rotate-90"/>{entry.level==='error'?<CircleAlert size={14} className="text-[var(--status-error)]"/>:entry.status==='completed'?<Check size={14} className="text-[var(--status-success)]"/>:<FileCode2 size={14}/>}<span className="font-mono">{entry.label}</span><span className="text-[var(--text-muted)]">{entry.model}</span><span className="ml-auto" style={{color:entry.level==='error'?'var(--status-error)':'var(--text-muted)'}}>{entry.status}</span></summary><div className="mt-3 pl-5">{(entry.time||entry.detail)&&<p className="mb-3 text-[11px] text-[var(--text-muted)]">{entry.time} · {entry.detail}</p>}{command&&<div className="mb-3"><SyntaxSnippet text={`$ ${command}`} language="bash"/></div>}{entry.text?<SyntaxSnippet text={entry.text} language={entry.language??'text'} className={entry.level==='error'?'text-[var(--status-error)]':''}/>:<p className="text-xs text-[var(--text-muted)]">{entry.status==='pending'?'Waiting for approval.':'Waiting for output.'}</p>}<LogRecord entry={entry}/></div></details>;
        }
        const Direction=entry.kind==='input'?ArrowUpRight:ArrowDownLeft;
        return <article key={entry.id} className="mb-6"><header className="mb-3 flex flex-wrap items-center gap-2 text-xs"><Direction size={14} className="text-[var(--text-muted)]"/><span className="font-medium">{entry.label}</span><span className="ml-auto text-[11px] tabular-nums text-[var(--text-muted)]">{entry.time??entry.status}</span></header><div className={`rounded-lg p-4 ${entry.kind==='input'?'bg-[var(--bg-surface)]':'bg-[var(--bg-panel)]'}`}><p className="mb-3 flex items-center gap-2 text-xs font-medium"><ModelFamilyLogo family={models.find(model=>model.name===entry.model)?.family??''} modelId={entry.model} size={17}/>{entry.model}</p><p className="whitespace-pre-wrap break-words text-xs leading-6">{entry.text}</p>{entry.detail&&<p className="mt-4 text-[11px] leading-5 text-[var(--text-muted)]">{entry.detail}</p>}<LogRecord entry={entry}/></div></article>;
      })}
      <div ref={bottom}/>
    </div>
    <footer className="flex shrink-0 items-center justify-between px-6 py-3 text-[11px] text-[var(--text-muted)]"><span>{visible.length} {visible.length===1?'entry':'entries'}{demo?' · Demo data':''}</span><button disabled={!visible.length} onClick={()=>bottom.current?.scrollIntoView({behavior:'instant',block:'end'})} className={`${button} !py-1`}><ArrowDown size={12}/>Latest output</button></footer>
  </main>;
}
