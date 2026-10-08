import React, { useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, CircleAlert, Square } from 'lucide-react';
import {
  OllamaLogo,
  MLXLogo,
  LMStudioLogo,
  VLLMLogo,
  LlamaCppLogo,
  UnslothLogo,
} from '../rack/Logos';

export interface MessageExecutionEvent {
  id: string;
  timestamp: string;
  status: 'passed' | 'failed' | 'stopped';
  title: string;
  detail: string;
  model: string;
  duration: string;
}

const SAMPLE_MESSAGE_EVENTS: MessageExecutionEvent[] = [
  {
    id: 'evt-1',
    timestamp: '20:34:12',
    status: 'passed',
    title: 'Review conversation storage',
    detail: '382 tokens generated • 42.6 t/s',
    model: 'qwen2.5-coder:32b',
    duration: '1.4s',
  },
  {
    id: 'evt-2',
    timestamp: '20:32:05',
    status: 'passed',
    title: 'Explore the Rust backend',
    detail: '512 tokens generated • 58.1 t/s',
    model: 'deepseek-r1:14b',
    duration: '2.1s',
  },
  {
    id: 'evt-3',
    timestamp: '20:29:44',
    status: 'failed',
    title: 'Connect to the local model server',
    detail: 'Connection refused (ECONNREFUSED 127.0.0.1:9090)',
    model: 'llama3.2:3b',
    duration: '0.3s',
  },
  {
    id: 'evt-4',
    timestamp: '20:26:18',
    status: 'stopped',
    title: 'Update workspace file indexing',
    detail: 'Turn aborted by user (SIGINT / Esc)',
    model: 'qwen2.5-coder:32b',
    duration: '3.8s',
  },
  {
    id: 'evt-5',
    timestamp: '20:21:02',
    status: 'passed',
    title: 'Update theme colors',
    detail: '144 tokens generated • 62.0 t/s',
    model: 'llama3.2:3b',
    duration: '0.6s',
  },
  {
    id: 'evt-6',
    timestamp: '20:18:39',
    status: 'failed',
    title: 'Build the desktop app',
    detail: 'Context limit exceeded (34,102 > 32,768 tokens)',
    model: 'qwen2.5-coder:32b',
    duration: '4.2s',
  },
  {
    id: 'evt-7',
    timestamp: '20:14:50',
    status: 'passed',
    title: 'Compare model response speeds',
    detail: '290 tokens generated • 48.3 t/s',
    model: 'deepseek-r1:14b',
    duration: '1.8s',
  },
  {
    id: 'evt-8',
    timestamp: '20:11:15',
    status: 'stopped',
    title: 'Document the API',
    detail: 'Halted by operator before decode phase',
    model: 'qwen2.5-coder:32b',
    duration: '1.1s',
  },
];

export interface LoadedModelInfo {
  id: string;
  name: string;
  runner: 'ollama' | 'mlx' | 'lmstudio' | 'vllm' | 'llamacpp' | 'unsloth';
  runnerName: string;
  paramSize: string;
  quantization: string;
  memoryVram: string;
  contextLength: string;
  status: 'generating' | 'idle';
  speedTokS?: number;
}

const LOADED_MODELS_SAMPLE: LoadedModelInfo[] = [
  {
    id: 'm-1',
    name: 'qwen2.5-coder:32b',
    runner: 'ollama',
    runnerName: 'Ollama Engine',
    paramSize: '32B',
    quantization: 'Q4_K_M',
    memoryVram: '19.2 GB',
    contextLength: '32k',
    status: 'generating',
    speedTokS: 51.4,
  },
  {
    id: 'm-2',
    name: 'deepseek-r1:14b',
    runner: 'mlx',
    runnerName: 'Apple MLX',
    paramSize: '14B',
    quantization: 'Q8_0',
    memoryVram: '14.8 GB',
    contextLength: '64k',
    status: 'idle',
  },
  {
    id: 'm-3',
    name: 'llama3.2:3b',
    runner: 'llamacpp',
    runnerName: 'llama.cpp',
    paramSize: '3B',
    quantization: 'FP16',
    memoryVram: '6.4 GB',
    contextLength: '128k',
    status: 'idle',
  },
];

export const DashboardView: React.FC<{ onOpenLogs: (model: string) => void }> = ({ onOpenLogs }) => {
  const [selectedModelId, setSelectedModelId] = useState(LOADED_MODELS_SAMPLE[0].id);
  const [runFilter, setRunFilter] = useState<'all' | 'failed'>('all');
  const model = LOADED_MODELS_SAMPLE.find(item => item.id === selectedModelId) || LOADED_MODELS_SAMPLE[0];
  const recentRuns = SAMPLE_MESSAGE_EVENTS.filter(event => runFilter === 'all' || event.status === 'failed');
  const logos = { ollama: OllamaLogo, mlx: MLXLogo, lmstudio: LMStudioLogo, vllm: VLLMLogo, llamacpp: LlamaCppLogo, unsloth: UnslothLogo };
  const ModelLogo = logos[model.runner];

  return (
    <div className="h-full w-full overflow-y-auto font-sans text-[var(--text-main)] bg-[var(--bg-app)]">
      <div className="max-w-[1440px] mx-auto px-6 py-8 sm:px-9 space-y-9">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] mb-2">Dashboard</p><h1 className="text-3xl font-medium tracking-tight">Workspace</h1></div>
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />1 running · 2 idle</span><span className="border-l border-[var(--border-subtle)] pl-4">Sample data</span></div>
        </header>

        <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))]">
          <section className="min-w-0">
            <div className="flex items-center justify-between mb-5"><h2 className="text-xs font-medium text-[var(--text-muted)]">Your models</h2><span className="text-[10px] text-[var(--text-muted)]">Select to inspect</span></div>
            <div className="flex gap-1 border-b border-[var(--border-subtle)]" role="tablist" aria-label="Models">
              {LOADED_MODELS_SAMPLE.map(item => { const Logo = logos[item.runner]; return <button key={item.id} role="tab" aria-selected={item.id === selectedModelId} aria-controls="dashboard-model-detail" onClick={() => setSelectedModelId(item.id)} className={`min-w-0 flex-1 flex items-center justify-center gap-2 pb-3 border-b-2 text-xs transition-colors ${item.id === selectedModelId ? 'border-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}><Logo size={17} /><span className="truncate">{item.runnerName.replace(' Engine', '')}</span></button>; })}
            </div>
            <div id="dashboard-model-detail" role="tabpanel" className="relative overflow-hidden py-8 px-6 min-h-[290px]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, var(--bg-app)), var(--bg-app) 75%)' }}>
              <div className="flex justify-between items-start gap-4"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]"><span className={`w-1.5 h-1.5 rounded-full ${model.status === 'generating' ? 'bg-emerald-400' : 'bg-[var(--text-muted)]'}`} />{model.status === 'generating' ? 'Generating' : 'Resident · Idle'}</div><ModelLogo size={52} /></div>
              <h3 className="text-[clamp(24px,3vw,38px)] font-medium tracking-tight mt-5 break-words">{model.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mt-2">{model.paramSize} parameters <span className="mx-2">/</span> {model.quantization} <span className="mx-2">/</span> {model.contextLength} context</p>
              <div className="flex flex-wrap items-end justify-between gap-5 mt-8"><div><p className="text-[10px] text-[var(--text-muted)] mb-1">{model.status === 'generating' ? 'Output speed' : 'Memory footprint'}</p><p className="text-3xl font-light tabular-nums">{model.speedTokS || model.memoryVram.split(' ')[0]}<span className="text-xs text-[var(--text-muted)] ml-2">{model.speedTokS ? 'tok/s' : 'GB'}</span></p></div><button onClick={() => onOpenLogs(model.name)} className="inline-flex gap-2 items-center text-xs border-b border-[var(--border-strong)] pb-1 hover:text-[var(--text-muted)]">Inspect model logs<ArrowUpRight size={14} /></button></div>
            </div>
            <div className="pt-5 mt-1 border-t border-[var(--border-subtle)]"><div className="flex justify-between text-[11px] mb-3"><span className="text-[var(--text-muted)]">System memory · Unified</span><span>40.4 <span className="text-[var(--text-muted)]">/ 64 GB</span></span></div><div className="h-1 flex gap-1" aria-label="Sample system memory: 40.4 of 64 GB"><span className="bg-[var(--text-main)]" style={{width:'30%'}} /><span className="bg-[var(--text-muted)]" style={{width:'23.125%'}} /><span className="bg-[var(--text-faint)]" style={{width:'10%'}} /><span className="flex-1 bg-[var(--border-subtle)]" /></div><p className="text-[10px] text-[var(--text-muted)] mt-2.5">{model.memoryVram} used by this model · 23.6 GB available</p></div>
          </section>

          <section className="min-w-0 pl-0 xl:pl-6">
            <div className="flex items-center justify-between mb-5"><h2 className="text-xs font-medium text-[var(--text-muted)]">In progress</h2><span className="text-[11px] text-[var(--text-muted)] tabular-nums">00:24 elapsed</span></div>
            <h3 className="text-2xl leading-8 tracking-tight font-medium max-w-sm">Investigate and fix the login failure</h3>
            <p className="text-xs text-[var(--text-muted)] mt-2">Sequential pipeline · Step 1 of 3</p>
            <ol className="mt-7">
              {[
                { title: 'Investigate the failure', model: LOADED_MODELS_SAMPLE[0], detail: 'Reading authentication files', status: 'Running' },
                { title: 'Review the findings', model: LOADED_MODELS_SAMPLE[1], detail: 'Starts after investigation', status: 'Queued' },
                { title: 'Verify the proposed fix', model: LOADED_MODELS_SAMPLE[2], detail: 'Starts after review', status: 'Queued' },
              ].map((step, index) => <li key={step.title} className="flex gap-4 min-h-[91px]"><div className="flex flex-col items-center shrink-0"><span className={`w-7 h-7 flex items-center justify-center text-[11px] rounded-full border ${index === 0 ? 'border-emerald-400/50 text-emerald-400' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>{index + 1}</span>{index < 2 && <span className="w-px flex-1 my-1 bg-[var(--border-subtle)]" />}</div><div className="flex-1 min-w-0 pb-5"><div className="flex items-center justify-between gap-2"><h4 className="text-xs font-medium leading-7">{step.title}</h4><span className={`text-[10px] ${index === 0 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>{step.status}</span></div><p className="text-[11px] text-[var(--text-muted)]">{step.model.name}</p><p className="text-[10px] text-[var(--text-muted)] mt-1">{step.detail}</p></div></li>)}
            </ol>
          </section>
        </div>

        <section className="border-t border-[var(--border-subtle)] pt-6">
          <div className="flex items-center justify-between gap-4 mb-3"><h2 className="text-sm font-medium">Recent work</h2><button onClick={() => setRunFilter(current => current === 'all' ? 'failed' : 'all')} aria-pressed={runFilter === 'failed'} className={`inline-flex items-center gap-1.5 text-[11px] ${runFilter === 'failed' ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}><CircleAlert size={12} />{runFilter === 'failed' ? 'Show all work' : '2 need attention'}</button></div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentRuns.map(event => <details key={event.id} className="group">
              <summary className="flex items-center gap-3 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-[var(--bg-surface-hover)]"><span className="shrink-0">{event.status === 'passed' ? <Check size={14} className="text-emerald-400" /> : event.status === 'failed' ? <CircleAlert size={14} className="text-amber-400" /> : <Square size={12} className="text-[var(--text-muted)]" />}</span><span className="text-xs flex-1 min-w-0">{event.title}</span><span className="hidden sm:inline text-[10px] text-[var(--text-muted)]">{event.model}</span><span className="text-[10px] text-[var(--text-muted)] w-10 text-right shrink-0">{event.timestamp.slice(0,5)}</span><ChevronDown size={12} className="text-[var(--text-muted)] group-open:rotate-180 transition-transform" /></summary>
              <div className="pl-7 pb-4 text-[11px] leading-5 text-[var(--text-muted)]"><p>{event.status === 'passed' ? 'Completed' : event.status === 'failed' ? 'Failed' : 'Cancelled'} · {event.detail} · {event.duration}</p><button onClick={() => onOpenLogs(event.model)} className="inline-flex items-center gap-1 mt-2 text-[var(--text-main)]">View logs<ArrowUpRight size={12} /></button></div>
            </details>)}
          </div>
        </section>
      </div>
    </div>
  );
};
