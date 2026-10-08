import React, { useState } from 'react';
import { LocalModelBlade } from './types';
import { getProviderLogo } from './Logos';
import { ArrowLeft, Save, Check, ChevronDown, SlidersHorizontal, Server, Trash2 } from 'lucide-react';

interface BladeConfigViewProps {
  model: LocalModelBlade;
  onClose: () => void;
  onSave: (updated: LocalModelBlade) => void;
  onUnload: (id: string) => void;
}

export const BladeConfigView: React.FC<BladeConfigViewProps> = ({ model, onClose, onSave, onUnload }) => {
  const [temperature, setTemperature] = useState(model.temperature ?? 0.0);
  const [maxTokens, setMaxTokens] = useState(model.maxTokens ?? 4096);
  const [isPrimary, setIsPrimary] = useState(model.status === 'active');
  const [advanced, setAdvanced] = useState(false);
  const valid = Number.isFinite(temperature) && temperature >= 0 && temperature <= 2 && Number.isSafeInteger(maxTokens) && maxTokens > 0 && maxTokens <= 4294967295;
  const save = () => {
    if (!valid) return;
    onSave({ ...model, temperature, maxTokens, status: isPrimary ? 'active' : model.status === 'active' ? 'loaded' : model.status });
    onClose();
  };
  const fieldClass = 'w-24 border rounded-md px-2 py-1.5 text-xs tabular-nums outline-none focus:border-[var(--accent)]';
  const fieldStyle = { backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' };
  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-main)' }}>
      <header className="flex items-center gap-3 px-4 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <button onClick={onClose} aria-label="Back to model rack" className="p-1.5 rounded-md hover:bg-[var(--bg-active)]"><ArrowLeft size={16} /></button>
        <div className="min-w-0"><h2 className="text-sm font-medium truncate">{model.displayName}</h2><p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Model configuration</p></div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-6">
        <div className="flex items-center gap-3">{getProviderLogo(model.provider, 24)}<div className="min-w-0"><p className="text-xs font-medium">{model.provider === 'lmstudio' ? 'LM Studio' : model.provider === 'llamacpp' ? 'llama.cpp' : model.provider === 'mlx' ? 'Apple MLX' : model.provider === 'vllm' ? 'vLLM' : model.provider === 'unsloth' ? 'Unsloth' : 'Ollama'}</p><p className="text-[11px] mt-1 break-all select-text" style={{ color: 'var(--text-muted)' }}>{model.endpoint}</p></div></div>
        <button onClick={() => setIsPrimary(!isPrimary)} aria-pressed={isPrimary} className="w-full flex items-center justify-between text-xs p-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: isPrimary ? 'var(--bg-active)' : undefined }}>Default in rack{isPrimary ? <Check size={15} /> : <span style={{ color: 'var(--text-muted)' }}>Set default</span>}</button>
        <section>
          <h3 className="text-xs font-medium flex items-center gap-2"><SlidersHorizontal size={14} />Generation</h3>
          <p className="text-[11px] leading-5 mt-2" style={{ color: 'var(--text-muted)' }}>Saved for this rack session. The main chat is not connected to execution yet.</p>
          <div className="py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex justify-between items-center gap-3"><label htmlFor="model-temperature" className="text-xs">Temperature</label><input id="model-temperature" type="number" min={0} max={2} step={0.01} value={Number.isNaN(temperature) ? '' : temperature} onChange={(e) => setTemperature(e.target.value === '' ? NaN : Number(e.target.value))} className={fieldClass} style={fieldStyle} /></div>
            <input aria-label="Temperature slider" type="range" min={0} max={2} step={0.01} value={Number.isFinite(temperature) ? temperature : 0} onChange={(event) => setTemperature(Number(event.target.value))} className="w-full mt-4 cursor-pointer accent-[var(--accent)]" />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}><span>0 · Less variation</span><span>2 · More variation</span></div>
            <p className="text-[11px] leading-5 mt-2" style={{ color: 'var(--text-muted)' }}>Lower values reduce sampling variation. Provider and model limits still apply.</p>
          </div>
          <div className="py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex justify-between items-center gap-3"><label htmlFor="model-max-tokens" className="text-xs">Maximum output tokens</label><input id="model-max-tokens" type="number" min={1} max={4294967295} step={1} value={Number.isNaN(maxTokens) ? '' : maxTokens} onChange={(e) => setMaxTokens(e.target.value === '' ? NaN : Number(e.target.value))} className={fieldClass} style={fieldStyle} /></div>
            <input aria-label="Maximum output tokens slider" type="range" min={1} max={Math.max(32768, Number.isFinite(maxTokens) ? maxTokens : 32768)} step={1} value={Number.isFinite(maxTokens) ? maxTokens : 1} onChange={(event) => setMaxTokens(Number(event.target.value))} className="w-full mt-4 cursor-pointer accent-[var(--accent)]" />
            <div className="flex gap-2 mt-2">{[1024, 4096, 8192, 16384].map((value) => <button key={value} onClick={() => setMaxTokens(value)} aria-pressed={maxTokens === value} className="flex-1 text-[10px] py-1.5 rounded-md border hover:bg-[var(--bg-active)]" style={{ borderColor: 'var(--border-subtle)', backgroundColor: maxTokens === value ? 'var(--bg-active)' : undefined }}>{value.toLocaleString()}</button>)}</div>
            <p className="text-[11px] leading-5 mt-2" style={{ color: 'var(--text-muted)' }}>Output budget per request, including reasoning where the provider counts it.</p>
          </div>
        </section>
        <section>
          <button onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} className="w-full flex justify-between items-center text-xs font-medium">Advanced sampling<ChevronDown size={15} className={advanced ? 'rotate-180' : ''} /></button>
          {advanced && <div className="mt-3"><p className="text-[11px] leading-5 mb-2" style={{ color: 'var(--text-muted)' }}>Not wired to requests. These controls remain disabled until provider support is implemented.</p>
            {[
              { label: 'Top-P', value: model.topP, hint: 'Probability mass used for nucleus sampling.', step: '0.01' },
              { label: 'Top-K', hint: 'Limit sampling to the highest-ranked tokens.', step: '1' },
              { label: 'Min-P', hint: 'Filter tokens relative to the most likely token.', step: '0.01' },
              { label: 'Repetition penalty', value: model.repetitionPenalty, hint: 'Provider-specific repetition control.', step: '0.01' },
              { label: 'Frequency penalty', hint: 'Penalize tokens based on how often they appear.', step: '0.01' },
              { label: 'Presence penalty', hint: 'Penalize tokens that have already appeared.', step: '0.01' },
              { label: 'Seed', hint: 'Reproducibility depends on the inference engine.', step: '1' },
            ].map((field) => <div key={field.label} className="py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}><div className="flex justify-between gap-3 items-center"><label className="text-xs" htmlFor={`param-${field.label}`}>{field.label}</label><input id={`param-${field.label}`} type="number" disabled value={field.value ?? ''} placeholder="Provider" step={field.step} className={`${fieldClass} opacity-40 cursor-not-allowed`} style={fieldStyle} /></div><p className="text-[11px] mt-1.5 leading-5" style={{ color: 'var(--text-muted)' }}>{field.hint}</p></div>)}
            <label className="text-xs block mt-4" htmlFor="model-stop">Stop sequences</label><textarea id="model-stop" disabled placeholder="Not connected" rows={2} className="w-full mt-2 text-xs p-2 border rounded-md opacity-40 cursor-not-allowed resize-none" style={fieldStyle} />
          </div>}
        </section>
        <section className="border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-xs font-medium flex items-center gap-2"><Server size={14} />Provider runtime</h3>
          <dl className="text-[11px] space-y-3 mt-4"><div className="flex justify-between gap-3"><dt style={{ color: 'var(--text-muted)' }}>Reported context capacity</dt><dd>{model.contextLength ? `${model.contextLength.toLocaleString()} tokens` : 'Not reported'}</dd></div><div className="flex justify-between gap-3"><dt style={{ color: 'var(--text-muted)' }}>Quantization</dt><dd>{model.quantization || 'Not reported'}</dd></div></dl>
          <div className="mt-4"><label htmlFor="model-context-slider" className="text-xs">Context allocation · Provider managed</label><input id="model-context-slider" type="range" disabled min={1} max={Math.max(1, model.contextLength || 1)} value={Math.max(1, model.contextLength || 1)} className="w-full mt-3 opacity-40 cursor-not-allowed accent-[var(--accent)]" /><p className="text-[11px] leading-5 mt-1" style={{ color: 'var(--text-muted)' }}>Uses the provider’s current configuration. Reported capacity does not necessarily mean all of it is allocated.</p></div>
          <p className="text-[11px] leading-5 mt-4" style={{ color: 'var(--text-muted)' }}>Context allocation, GPU offload, KV cache, and loading are managed in your inference provider. Unfuse cannot change them yet.</p>
          <button disabled className="text-xs mt-3 opacity-40 cursor-not-allowed">Unload from provider · Not connected</button>
        </section>
      </div>
      <footer className="border-t p-4 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        {!valid && <p role="alert" className="text-xs mb-3 text-red-400">Use a temperature from 0–2 and a positive whole-number output limit.</p>}
        <div className="flex gap-2"><button onClick={() => { onUnload(model.id); onClose(); }} title="Removes this connection; does not free provider memory" className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg hover:bg-[var(--bg-active)]"><Trash2 size={14} />Remove</button><button onClick={save} disabled={!valid} className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}><Save size={14} />Save to rack</button></div>
      </footer>
    </div>
  );
};
