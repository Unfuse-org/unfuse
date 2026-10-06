import React, { useState, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
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
    title: 'Audit storage manager ChatML sequencing',
    detail: '382 tokens generated • 42.6 t/s',
    model: 'qwen2.5-coder:32b',
    duration: '1.4s',
  },
  {
    id: 'evt-2',
    timestamp: '20:32:05',
    status: 'passed',
    title: 'Parse multi-workspace AST tree for Rust backend',
    detail: '512 tokens generated • 58.1 t/s',
    model: 'deepseek-r1:14b',
    duration: '2.1s',
  },
  {
    id: 'evt-3',
    timestamp: '20:29:44',
    status: 'failed',
    title: 'Execute remote socket connection on port 9090',
    detail: 'Connection refused (ECONNREFUSED 127.0.0.1:9090)',
    model: 'llama3.2:3b',
    duration: '0.3s',
  },
  {
    id: 'evt-4',
    timestamp: '20:26:18',
    status: 'stopped',
    title: 'Generate recursive file system indexing migration',
    detail: 'Turn aborted by user (SIGINT / Esc)',
    model: 'qwen2.5-coder:32b',
    duration: '3.8s',
  },
  {
    id: 'evt-5',
    timestamp: '20:21:02',
    status: 'passed',
    title: 'Apply theme variables to root document styles',
    detail: '144 tokens generated • 62.0 t/s',
    model: 'llama3.2:3b',
    duration: '0.6s',
  },
  {
    id: 'evt-6',
    timestamp: '20:18:39',
    status: 'failed',
    title: 'Compile monolithic binary with debug symbol inclusion',
    detail: 'Context limit exceeded (34,102 > 32,768 tokens)',
    model: 'qwen2.5-coder:32b',
    duration: '4.2s',
  },
  {
    id: 'evt-7',
    timestamp: '20:14:50',
    status: 'passed',
    title: 'Benchmark latency distribution across local runners',
    detail: '290 tokens generated • 48.3 t/s',
    model: 'deepseek-r1:14b',
    duration: '1.8s',
  },
  {
    id: 'evt-8',
    timestamp: '20:11:15',
    status: 'stopped',
    title: 'Generate full documentation coverage for API routes',
    detail: 'Halted by operator before decode phase',
    model: 'qwen2.5-coder:32b',
    duration: '1.1s',
  },
];

interface DayData {
  date: string;
  dateObj: Date;
  tokens: number;
  turns: number;
  primaryModel: string;
  level: 0 | 1 | 2 | 3 | 4;
}

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

interface TerminalLogLine {
  id: string;
  timestamp: string;
  tag: 'init' | 'prefill' | 'decode' | 'reasoning' | 'tool_call' | 'eval' | 'finish' | 'system';
  message: string;
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

const INITIAL_MODEL_LOGS: Record<string, TerminalLogLine[]> = {
  'm-1': [
    {
      id: 'l-1',
      timestamp: '14:32:17.104',
      tag: 'init',
      message: 'Loading model tensor weights: qwen2.5-coder:32b (Q4_K_M)',
    },
    {
      id: 'l-2',
      timestamp: '14:32:17.482',
      tag: 'system',
      message: 'Metal buffer allocated: 19.2 GB unified memory',
    },
    {
      id: 'l-3',
      timestamp: '14:32:17.891',
      tag: 'system',
      message: 'Context window allocated: 32,768 tokens (KV cache: 1.84 GB FP16)',
    },
    {
      id: 'l-4',
      timestamp: '14:32:18.012',
      tag: 'system',
      message: 'POST /v1/chat/completions (stream=true, tools=6)',
    },
    {
      id: 'l-5',
      timestamp: '14:32:18.194',
      tag: 'prefill',
      message: 'Prompt evaluation: 2,480 tokens evaluated in 194.2ms (12,770 tok/s)',
    },
    {
      id: 'l-6',
      timestamp: '14:32:18.210',
      tag: 'decode',
      message: 'Sampling tokens (temp=0.2, top_p=0.95, rep_pen=1.05)...',
    },
    {
      id: 'l-7',
      timestamp: '14:32:18.254',
      tag: 'decode',
      message: '"I have audited the storage manager flow. We should flush the assistant `tool_calls` payload',
    },
    {
      id: 'l-8',
      timestamp: '14:32:18.420',
      tag: 'decode',
      message: ' before emitting the synthetic `ToolResult` message to maintain compliant ChatML turn sequencing."',
    },
    {
      id: 'l-9',
      timestamp: '14:32:18.610',
      tag: 'tool_call',
      message: 'Invoking tool: edit_file(path="src-tauri/src/storage/jsonl.rs")',
    },
    {
      id: 'l-10',
      timestamp: '14:32:26.241',
      tag: 'eval',
      message: 'Generation speed: 51.4 tok/s | Decode time: 8.01s | Tokens: 412 out / 2,480 in',
    },
    {
      id: 'l-11',
      timestamp: '14:32:26.245',
      tag: 'finish',
      message: 'stop_reason: tool_calls | KV cache resident: 19.2 GB VRAM',
    },
  ],
  'm-2': [
    {
      id: 'd-1',
      timestamp: '14:28:43.010',
      tag: 'init',
      message: 'Initializing MLX runtime on Apple Silicon (M-series)',
    },
    {
      id: 'd-2',
      timestamp: '14:28:43.320',
      tag: 'system',
      message: 'Loaded 14B parameters in 8-bit quantized format (14.8 GB resident)',
    },
    {
      id: 'd-3',
      timestamp: '14:28:43.712',
      tag: 'system',
      message: 'KV cache reserved: 65,536 context length (2.1 GB)',
    },
    {
      id: 'd-4',
      timestamp: '14:28:44.101',
      tag: 'system',
      message: 'POST /v1/chat/completions (reasoning_mode=true)',
    },
    {
      id: 'd-5',
      timestamp: '14:28:44.343',
      tag: 'prefill',
      message: 'Prompt prefill: 1,120 tokens processed in 242.0ms (4,628 tok/s)',
    },
    {
      id: 'd-6',
      timestamp: '14:28:44.360',
      tag: 'reasoning',
      message: '<think> Memory transfer per token = weight size. Bandwidth = 150 GB/s.',
    },
    {
      id: 'd-7',
      timestamp: '14:28:45.120',
      tag: 'reasoning',
      message: 'For 14B Q8_0 (~14.8 GB weights), theoretical max throughput is ~10.13 tok/s. </think>',
    },
    {
      id: 'd-8',
      timestamp: '14:28:47.890',
      tag: 'decode',
      message: '"For a 14B parameter model quantized at 8-bit (Q8_0 ~14.8 GB weights), with memory bandwidth BW = 150 GB/s..."',
    },
    {
      id: 'd-9',
      timestamp: '14:29:06.700',
      tag: 'eval',
      message: 'Speed: 39.8 tok/s | Decode time: 22.36s | Tokens: 890 out / 1,120 in',
    },
    {
      id: 'd-10',
      timestamp: '14:29:06.705',
      tag: 'finish',
      message: 'stop_reason: stop | Status: Resident in VRAM (idle)',
    },
  ],
  'm-3': [
    {
      id: 'l3-1',
      timestamp: '14:21:04.220',
      tag: 'init',
      message: 'llama_model_loader: loaded meta data with 29 key-value pairs',
    },
    {
      id: 'l3-2',
      timestamp: '14:21:04.450',
      tag: 'system',
      message: 'llama_init_from_file: model type 3B, FP16 unquantized (6.4 GB)',
    },
    {
      id: 'l3-3',
      timestamp: '14:21:04.810',
      tag: 'system',
      message: 'ggml_metal_init: allocating 6.4 GB device memory',
    },
    {
      id: 'l3-4',
      timestamp: '14:21:05.001',
      tag: 'system',
      message: 'POST /v1/chat/completions',
    },
    {
      id: 'l3-5',
      timestamp: '14:21:05.149',
      tag: 'prefill',
      message: 'llama_perf_context_print: prompt eval time = 148.00 ms / 840 tokens (5,675.68 t/s)',
    },
    {
      id: 'l3-6',
      timestamp: '14:21:05.155',
      tag: 'decode',
      message: 'Generating SVG icon layout: `<svg viewBox="0 0 24 24" fill="currentColor">`...',
    },
    {
      id: 'l3-7',
      timestamp: '14:21:08.201',
      tag: 'eval',
      message: 'llama_perf_context_print: eval time = 3,045.20 ms / 165 tokens (54.18 t/s)',
    },
    {
      id: 'l3-8',
      timestamp: '14:21:08.205',
      tag: 'finish',
      message: 'stop_reason: stop | Status: Resident in VRAM (idle)',
    },
  ],
};

export const DashboardView: React.FC = () => {
  const [view, setView] = useState<'overview' | 'usage' | 'logs'>('overview');
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [timeRange, setTimeRange] = useState<'90d' | '180d'>('180d');
  const [selectedModelId, setSelectedModelId] = useState<string>('m-1');
  const [modelLogs, setModelLogs] = useState<Record<string, TerminalLogLine[]>>(INITIAL_MODEL_LOGS);
  const [copied, setCopied] = useState<boolean>(false);
  const [monitorFilter, setMonitorFilter] = useState<'all' | 'passed' | 'failed' | 'stopped'>('all');

  const filteredEvents = useMemo(() => {
    if (monitorFilter === 'all') return SAMPLE_MESSAGE_EVENTS;
    return SAMPLE_MESSAGE_EVENTS.filter((e) => e.status === monitorFilter);
  }, [monitorFilter]);

  const selectedModel = useMemo(
    () => LOADED_MODELS_SAMPLE.find((m) => m.id === selectedModelId) || LOADED_MODELS_SAMPLE[0],
    [selectedModelId]
  );

  const currentLogs = useMemo(
    () => modelLogs[selectedModel.id] || [],
    [modelLogs, selectedModel.id]
  );

  const handleCopyLogs = () => {
    const text = currentLogs.map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const { weeks, totalTokens, totalTurns } = useMemo(() => {
    const numDays = timeRange === '90d' ? 91 : 168;
    const today = new Date();
    const days: DayData[] = [];
    let totTokens = 0;
    let totTurns = 0;

    const models = ['Qwen 2.5 Coder 32B', 'DeepSeek R1 14B', 'Llama 3.2 3B'];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayOfWeek = d.getDay();

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const seed = Math.sin(d.getTime() / 86400000) * 10000;
      const rand = Math.abs(seed - Math.floor(seed));

      let tokens = 0;
      let turns = 0;

      const isActive = isWeekend ? rand > 0.65 : rand > 0.28;

      if (isActive) {
        tokens = Math.floor(rand * 28000 + 4000);
        turns = Math.max(1, Math.floor(tokens / 750));
      }

      totTokens += tokens;
      totTurns += turns;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (tokens > 22000) level = 4;
      else if (tokens > 14000) level = 3;
      else if (tokens > 7000) level = 2;
      else if (tokens > 0) level = 1;

      const dateStr = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      days.push({
        date: dateStr,
        dateObj: d,
        tokens,
        turns,
        primaryModel: models[Math.floor(rand * models.length)],
        level,
      });
    }

    const weekCols: DayData[][] = [];
    let currentWeek: DayData[] = [];

    const firstDay = days[0].dateObj.getDay();
    const firstDayMonOffset = (firstDay + 6) % 7;

    for (let p = 0; p < firstDayMonOffset; p++) {
      currentWeek.push({
        date: '',
        dateObj: new Date(0),
        tokens: -1,
        turns: 0,
        primaryModel: '',
        level: 0,
      });
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    });

    if (currentWeek.length > 0) {
      weekCols.push(currentWeek);
    }

    return {
      weeks: weekCols,
      totalTokens: totTokens,
      totalTurns: totTurns,
    };
  }, [timeRange]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return 'bg-emerald-950/80 border-emerald-800/40 hover:bg-emerald-800/60';
      case 2:
        return 'bg-emerald-800/80 border-emerald-700/60 hover:bg-emerald-700';
      case 3:
        return 'bg-emerald-600 border-emerald-500/80 hover:bg-emerald-500';
      case 4:
        return 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.35)] hover:bg-emerald-300';
      default:
        return 'bg-white/[0.04] border-white/[0.03] hover:bg-white/[0.08]';
    }
  };

  const renderRunnerLogo = (runner: LoadedModelInfo['runner'], size = 18) => {
    switch (runner) {
      case 'ollama':
        return <OllamaLogo size={size} className="text-[var(--text-main)]" />;
      case 'mlx':
        return <MLXLogo size={size} className="text-[var(--text-main)]" />;
      case 'lmstudio':
        return <LMStudioLogo size={size} className="text-cyan-400" />;
      case 'vllm':
        return <VLLMLogo size={size} />;
      case 'llamacpp':
        return <LlamaCppLogo size={size} />;
      case 'unsloth':
        return <UnslothLogo size={size} />;
      default:
        return null;
    }
  };

  const renderTagBadge = (tag: TerminalLogLine['tag']) => {
    switch (tag) {
      case 'init':
        return <span className="text-cyan-400 font-semibold">[init]</span>;
      case 'system':
        return <span className="opacity-40">[sys]</span>;
      case 'prefill':
        return <span className="text-amber-400 font-semibold">[prefill]</span>;
      case 'decode':
        return <span className="text-emerald-400 font-semibold">[decode]</span>;
      case 'reasoning':
        return <span className="text-purple-400 font-semibold">[think]</span>;
      case 'tool_call':
        return <span className="text-blue-400 font-semibold">[tool]</span>;
      case 'eval':
        return <span className="text-sky-400 font-semibold">[eval]</span>;
      case 'finish':
        return <span className="text-emerald-300 font-semibold">[finish]</span>;
      default:
        return <span className="opacity-40">[log]</span>;
    }
  };

  return (
    <div
      className="h-full w-full overflow-y-auto p-6 flex flex-col gap-6 font-sans select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs opacity-60 mt-1">Workspace activity · Sample preview</p>
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: 'var(--bg-panel)' }}>
          {(['overview', 'usage', 'logs'] as const).map((tab) => (
            <button key={tab} onClick={() => setView(tab)} aria-pressed={view === tab}
              className="px-4 py-2 text-xs rounded-lg"
              style={{ backgroundColor: view === tab ? 'var(--bg-active)' : 'transparent' }}>
              {tab === 'overview' ? 'Overview' : tab === 'usage' ? 'Usage' : 'Model logs'}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'System memory', value: '40.4 / 64 GB', detail: 'Unified memory · includes GPU allocations' },
              { label: 'Models loaded', value: '3 loaded · 1 running', detail: '2 resident and idle' },
              { label: 'Active model speed', value: '51.4 tok/s', detail: 'qwen2.5-coder:32b · output generation' },
            ].map((metric) => (
              <div key={metric.label} className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-panel)' }}>
                <p className="text-xs opacity-60">{metric.label}</p>
                <p className="text-lg font-semibold mt-2">{metric.value}</p>
                <p className="text-xs opacity-60 mt-1">{metric.detail}</p>
              </div>
            ))}
          </div>
          <section className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-panel)' }}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Current pipeline</h2>
                <p className="text-sm mt-2">Investigate and fix the login failure</p>
              </div>
              <span className="text-xs text-emerald-400">Running · Step 1 of 3 · 00:24 elapsed</span>
            </div>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
              {[
                { model: 'qwen2.5-coder:32b', task: 'Investigate the login failure', status: 'Running', detail: 'Reading authentication files' },
                { model: 'deepseek-r1:14b', task: 'Review findings and propose a fix', status: 'Queued', detail: 'Waiting for step 1 findings' },
                { model: 'llama3.2:3b', task: 'Check the proposed changes', status: 'Queued', detail: 'Waiting for step 2 findings' },
              ].map((step, index) => (
                <li key={step.model} className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-app)' }}>
                  <div className="flex justify-between text-xs gap-2">
                    <span className="opacity-60">Step {index + 1}</span>
                    <span className={index === 0 ? 'text-emerald-400' : 'opacity-60'}>{step.status}</span>
                  </div>
                  <p className="text-sm font-medium mt-3">{step.task}</p>
                  <p className="text-xs font-mono mt-2 break-all">{step.model}</p>
                  <p className="text-xs opacity-60 mt-3">{step.detail}</p>
                </li>
              ))}
            </ol>
          </section>

        </>
      )}

      {view === 'usage' && (
      <>
      {/* 1. KPI METRICS BAR: CURVED CARDS */}
      <div className="shrink-0">
        <div className="grid grid-cols-4 gap-3.5">
          <div
            className="p-4 flex flex-col gap-1 rounded-2xl transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            <span className="text-xs text-[var(--text-main)]">Volume</span>
            <div className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              {(totalTokens / 1_000_000).toFixed(2)}M <span className="text-xs font-normal text-[var(--text-main)]">tokens</span>
            </div>
          </div>

          <div
            className="p-4 flex flex-col gap-1 rounded-2xl transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            <span className="text-xs text-[var(--text-main)]">Speed</span>
            <div className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              46.8 <span className="text-xs font-normal text-[var(--text-main)]">tok/s</span>
            </div>
          </div>

          <div
            className="p-4 flex flex-col gap-1 rounded-2xl transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            <span className="text-xs text-[var(--text-main)]">Memory</span>
            <div className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              40.4 <span className="text-xs font-normal text-[var(--text-main)]">/ 64.0 GB</span>
            </div>
          </div>

          <div
            className="p-4 flex flex-col gap-1 rounded-2xl transition-all shadow-sm"
            style={{
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            <span className="text-xs text-[var(--text-main)]">Turns</span>
            <div className="text-xl font-bold tracking-tight text-[var(--text-main)]">
              {totalTurns.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      </>
      )}

      {/* 2. MIDDLE ROW: SMALLER GRAPH IN LEFT CORNER + COMPUTE/HARDWARE ENGINE IN RIGHT CORNER */}
      <div className="grid grid-cols-12 gap-4 items-stretch">
        {view === 'usage' && (
        <>
        {/* CORNER 1: INFERENCE ACTIVITY HEATMAP (COMPACT) */}
        <div
          className="col-span-12 p-5 flex flex-col justify-between gap-4 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
              Inference Activity
            </h2>

            <div
              className="flex p-0.5 text-xs rounded-lg"
              style={{
                backgroundColor: 'var(--bg-app)',
              }}
            >
              <button
                onClick={() => setTimeRange('90d')}
                className="px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: timeRange === '90d' ? 'var(--bg-active)' : 'transparent',
                  color: 'var(--text-main)',
                }}
              >
                90 Days
              </button>
              <button
                onClick={() => setTimeRange('180d')}
                className="px-2.5 py-1 rounded-md transition-colors text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: timeRange === '180d' ? 'var(--bg-active)' : 'transparent',
                  color: 'var(--text-main)',
                }}
              >
                180 Days
              </button>
            </div>
          </div>

          {/* HEATMAP GRID */}
          <div className="w-full">
            <div className="flex gap-2.5 items-start w-full">
              <div className="flex flex-col gap-1 text-[10px] pt-0.5 select-none shrink-0 pr-1 text-[var(--text-main)]">
                <span className="h-4 sm:h-5 flex items-center">Mon</span>
                <span className="h-4 sm:h-5 flex items-center">Wed</span>
                <span className="h-4 sm:h-5 flex items-center">Fri</span>
                <span className="h-4 sm:h-5 flex items-center">Sun</span>
              </div>

              <div className="flex-1 flex gap-1 sm:gap-1.5 overflow-hidden">
                {weeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex-1 flex flex-col gap-1 sm:gap-1.5 min-w-[5px]">
                    {week.map((day, dIdx) => {
                      if (day.tokens === -1) {
                        return <div key={dIdx} className="h-4 sm:h-5 w-full opacity-0" />;
                      }

                      return (
                        <div
                          key={dIdx}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={`h-4 sm:h-5 w-full rounded-[3px] transition-all cursor-pointer ${getLevelColor(
                            day.level
                          )}`}
                          style={{
                            backgroundColor: day.level === 0 ? 'var(--bg-app)' : undefined,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HEATMAP FOOTER */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-[var(--text-main)]">
            <div className="min-h-[20px] flex items-center gap-2 text-[var(--text-main)]">
              {hoveredDay && hoveredDay.tokens > 0 ? (
                <span className="flex items-center gap-1.5 text-xs text-[var(--text-main)]">
                  <span className="font-semibold text-[var(--text-main)]">{hoveredDay.date}:</span>
                  <span className="font-medium text-[var(--text-main)]">
                    {hoveredDay.tokens.toLocaleString()} tokens
                  </span>
                  <span className="text-[var(--text-main)]">({hoveredDay.turns} turns)</span>
                </span>
              ) : (
                <span className="text-[11px] text-[var(--text-main)]">Hover over a square for day details</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-main)]">
              <span>Less</span>
              <div className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: 'var(--bg-app)' }} />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-950/80" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-800/80" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400" />
              <span>More</span>
            </div>
          </div>
        </div>

        </>
        )}
        {view === 'overview' && (
        <>
          <section className="col-span-12 xl:col-span-5 p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-panel)' }}>
            <h2 className="text-sm font-semibold mb-3">Model status</h2>
            <div className="flex flex-col gap-2">
              {LOADED_MODELS_SAMPLE.map((model) => (
                <button key={model.id} onClick={() => { setSelectedModelId(model.id); setView('logs'); }}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl text-left"
                  style={{ backgroundColor: 'var(--bg-app)' }}>
                  <span className="flex items-center gap-3 text-xs">{renderRunnerLogo(model.runner, 18)}{model.name}</span>
                  <span className="text-xs opacity-60">{model.runnerName} · {model.quantization} · {model.status === 'generating' ? 'Running' : 'Loaded / idle'} · View logs →</span>
                </button>
              ))}
            </div>
          </section>
        {/* CORNER 2: LIVE MESSAGE & EXECUTION MONITOR */}
        <div
          className="col-span-12 xl:col-span-7 p-5 flex flex-col justify-between gap-3.5 rounded-2xl shadow-sm"
          style={{
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--text-main)]">
              Recent runs
            </h2>
          </div>

          {/* Filter Pills + Live Message Events Stream */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-1 p-0.5 rounded-xl"
                style={{
                  backgroundColor: 'var(--bg-app)',
                }}
              >
                {(
                  [
                    { key: 'all', label: 'All', count: 8 },
                    { key: 'passed', label: 'Completed', count: 4 },
                    { key: 'failed', label: 'Failed', count: 2 },
                    { key: 'stopped', label: 'Cancelled', count: 2 },
                  ] as const
                ).map((tab) => {
                  const isActive = monitorFilter === tab.key;
                  let tabStyle: React.CSSProperties = {
                    backgroundColor: 'transparent',
                    color: 'var(--text-main)',
                  };

                  if (isActive) {
                    if (tab.key === 'all') {
                      tabStyle = {
                        backgroundColor: 'var(--bg-active)',
                        color: 'var(--text-main)',
                      };
                    } else if (tab.key === 'passed') {
                      tabStyle = {
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        color: 'var(--text-main)',
                      };
                    } else if (tab.key === 'failed') {
                      tabStyle = {
                        backgroundColor: 'rgba(244, 63, 94, 0.2)',
                        color: 'var(--text-main)',
                      };
                    } else if (tab.key === 'stopped') {
                      tabStyle = {
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        color: 'var(--text-main)',
                      };
                    }
                  }

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setMonitorFilter(tab.key)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      style={tabStyle}
                    >
                      <span>{tab.label}</span>
                      <span
                        className="text-[9px] font-mono px-1 py-0.2 rounded font-bold"
                        style={{
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-main)',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="text-[10px] font-mono font-semibold text-[var(--text-main)]">
                {filteredEvents.length} shown
              </span>
            </div>

            {/* Scrollable Event List: Fixed Height (no canvas shift), Completely Hidden Scrollbar */}
            <div
              className="flex flex-col gap-1.5 h-[160px] overflow-y-auto pr-0.5 select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{
                scrollbarWidth: 'none',
              }}
            >
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl transition-colors shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-app)',
                  }}
                >
                  {/* Event Details (Bold & Crisp) */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold truncate text-[11px] text-[var(--text-main)]">
                        {evt.title}
                      </span>
                      <span className="font-mono font-semibold text-[9px] shrink-0 text-[var(--text-main)]">
                        {evt.timestamp}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate font-semibold text-[10px] text-[var(--text-main)]">
                        {evt.detail}
                      </span>
                      <span
                        className="font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shrink-0 text-[var(--text-main)]"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                        }}
                      >
                        {evt.model}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      {view === 'logs' && (
      <>
      {/* 3. LOWER SECTION: LOADED MODELS (LEFT) + MODEL TERMINAL OUTPUT (RIGHT) WITH CURVES */}
      <div
        className="p-5 rounded-2xl shadow-sm"
        style={{
          backgroundColor: 'var(--bg-panel)',
        }}
      >
        <div className="grid grid-cols-12 gap-5 items-stretch min-h-[360px]">
          {/* LEFT: LOADED MODELS LIST (1 TO 5 SLOTS, SELECTABLE) */}
          <div className="col-span-12 md:col-span-5 flex flex-col gap-2">
            {LOADED_MODELS_SAMPLE.map((model) => {
              const isSelected = selectedModel.id === model.id;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className="p-3.5 transition-all cursor-pointer flex flex-col gap-2 rounded-xl"
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-active)' : 'var(--bg-app)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 flex items-center justify-center shrink-0 rounded-lg"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                        }}
                      >
                        {renderRunnerLogo(model.runner, 16)}
                      </div>
                      <span className="text-xs font-mono font-semibold truncate text-[var(--text-main)]">
                        {model.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-2 py-0.5 text-[10px] font-mono rounded-md text-[var(--text-main)]"
                        style={{
                          backgroundColor: 'var(--bg-panel)',
                        }}
                      >
                        {model.quantization}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-main)]">
                    <div className="flex items-center gap-3 text-[var(--text-main)]">
                      <span className="text-[var(--text-main)]">
                        VRAM: <span className="font-bold text-[var(--text-main)]">{model.memoryVram}</span>
                      </span>
                      <span className="text-[var(--text-main)]">
                        Ctx: <span className="font-bold text-[var(--text-main)]">{model.contextLength}</span>
                      </span>
                    </div>

                    <div>
                      {model.status === 'generating' ? (
                        <span className="font-bold text-[var(--text-main)]">
                          {model.speedTokS} tok/s
                        </span>
                      ) : (
                        <span className="text-[var(--text-main)]">Resident</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: MODEL TERMINAL OUTPUT (LM STUDIO STYLE) */}
          <div className="col-span-12 md:col-span-7 h-full flex flex-col">
            {/* TERMINAL WINDOW */}
            <div
              className="relative flex-1 p-4 flex flex-col font-mono text-xs leading-relaxed overflow-hidden rounded-xl group shadow-inner"
              style={{
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-main)',
              }}
            >
              {/* EMBEDDED INTEGRATED COPY BUTTON */}
              <button
                onClick={handleCopyLogs}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors cursor-pointer hover:opacity-100 opacity-60 text-[var(--text-main)]"
                style={{
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-main)',
                }}
                title="Copy terminal output"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[var(--text-main)]" />
                )}
              </button>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-8 select-text scrollbar-thin">
                {currentLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs py-10 text-[var(--text-main)]">
                    Terminal buffer empty
                  </div>
                ) : (
                  currentLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-[var(--text-main)]">
                      <span className="text-[11px] shrink-0 select-none text-[var(--text-main)]">
                        {log.timestamp}
                      </span>
                      <span className="shrink-0 select-none">
                        {renderTagBadge(log.tag)}
                      </span>
                      <span className="break-all whitespace-pre-wrap text-[var(--text-main)]">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}

                {selectedModel.status === 'generating' && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="inline-block w-1.5 h-3.5 animate-pulse bg-emerald-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
