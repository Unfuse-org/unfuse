import React, { useState } from 'react';
import { LocalModelBlade } from './types';
import { ModelFamilyLogo, modelLogoCatalog } from '../chat/ModelIdentity';
import { getProviderLogo } from './Logos';
import { ArrowLeft, Save, Check, ChevronDown, SlidersHorizontal, Server, Trash2 } from 'lucide-react';

interface BladeConfigViewProps {
  model: LocalModelBlade;
  customIcon?: string;
  onIconChange: (icon?: string) => void;
  onClose: () => void;
  onSave: (updated: LocalModelBlade) => void;
  onUnload: (id: string) => void;
}

export const BladeConfigView: React.FC<BladeConfigViewProps> = ({ model, customIcon, onIconChange, onClose, onSave, onUnload }) => {
  const selectedLogo = modelLogoCatalog.find(logo => logo.url === customIcon);
  const [iconError, setIconError] = useState('');
  const [temperature, setTemperature] = useState(model.temperature ?? 0.0);
  const [maxTokens, setMaxTokens] = useState(model.maxTokens ?? 4096);
  const [contextBudget, setContextBudget] = useState<number | undefined>(model.contextBudget);
  const contextLimit = model.provider === 'ollama' ? model.maxContextLength : model.contextLength ?? model.maxContextLength;
  const [isPrimary, setIsPrimary] = useState(model.status === 'active');
  const [advanced, setAdvanced] = useState(false);
  const valid = Number.isFinite(temperature) && temperature >= 0 && temperature <= 2 && Number.isSafeInteger(maxTokens) && maxTokens > 0 && maxTokens <= 4294967295 && (contextBudget === undefined || Number.isSafeInteger(contextBudget) && contextBudget > maxTokens && (!contextLimit || contextBudget <= contextLimit));
  const save = () => {
    if (!valid) return;
    onSave({ ...model, temperature, maxTokens, contextBudget, status: isPrimary ? 'active' : model.status === 'active' ? 'loaded' : model.status });
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
        <section><h3 className="text-xs font-medium mb-3">Model icon</h3><div className="flex gap-3 items-center">{selectedLogo ? <ModelFamilyLogo family={selectedLogo.key} size={28} /> : customIcon ? <img src={customIcon} alt="Custom model icon" className="w-8 h-8 object-contain" /> : <ModelFamilyLogo family={model.family} modelId={model.name} size={28} />}<label className="cursor-pointer text-xs hover:underline">Choose image<input aria-label="Choose custom model icon" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setIconError('Choose a PNG, JPEG or WebP up to 2 MB.'); return; }
          const reader = new FileReader(); reader.onload = () => { onIconChange(String(reader.result)); setIconError(''); }; reader.readAsDataURL(file); event.target.value = '';
        }} /></label>{customIcon && <button onClick={() => onIconChange(undefined)} className="text-xs text-[var(--text-muted)] hover:underline">Use default</button>}</div><label className="block text-[11px] mt-3 text-[var(--text-muted)]">Brand logo<select aria-label="Choose model brand logo" value={modelLogoCatalog.find(logo => logo.url === customIcon)?.key ?? ''} onChange={event => onIconChange(modelLogoCatalog.find(logo => logo.key === event.target.value)?.url)} className="block w-full text-xs rounded-lg bg-[var(--bg-surface)] px-2 py-2 mt-1"><option value="">Automatic / custom image</option>{modelLogoCatalog.map(logo => <option key={logo.key} value={logo.key}>{logo.label}</option>)}</select></label><p className="text-[10px] text-[var(--text-muted)] mt-2">Appearance only · Kept for this app session</p>{iconError && <p role="alert" className="text-xs text-red-400 mt-2">{iconError}</p>}</section>
        <button onClick={() => setIsPrimary(!isPrimary)} aria-pressed={isPrimary} className="w-full flex items-center justify-between text-xs p-3 rounded-lg border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: isPrimary ? 'var(--bg-active)' : undefined }}>Default in rack{isPrimary ? <Check size={15} /> : <span style={{ color: 'var(--text-muted)' }}>Set default</span>}</button>
        <section>
          <h3 className="text-xs font-medium flex items-center gap-2"><SlidersHorizontal size={14} />Generation</h3>
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
          {advanced && <div className="mt-3">
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
          <dl className="text-[11px] space-y-3 mt-4"><div className="flex justify-between gap-3"><dt style={{ color: 'var(--text-muted)' }}>Reported tokens used</dt><dd>{(model.tokensUsed || 0).toLocaleString()}</dd></div><div className="flex justify-between gap-3"><dt style={{ color: 'var(--text-muted)' }}>Active context</dt><dd>{model.contextLength ? `${model.contextLength.toLocaleString()} tokens` : 'Not reported'}</dd></div><div className="flex justify-between gap-3"><dt style={{ color: 'var(--text-muted)' }}>Quantization</dt><dd>{model.quantization || 'Not reported'}</dd></div></dl>
          <div className="mt-4 flex items-center justify-between gap-3 text-[11px]"><span className="text-[var(--text-muted)]">Maximum context</span><span>{model.maxContextLength ? `${model.maxContextLength.toLocaleString()} tokens` : 'Not reported'}</span></div>
          <div className="mt-5"><label htmlFor="model-context-budget" className="text-xs">Request context budget</label><input id="model-context-budget" type="number" min={1} max={contextLimit ?? undefined} step={1} value={contextBudget === undefined || Number.isNaN(contextBudget) ? '' : contextBudget} onChange={event=>setContextBudget(event.target.value===''?undefined:Number(event.target.value))} placeholder={model.contextLength ? `Runner: ${model.contextLength.toLocaleString()}` : 'Set token budget'} className="mt-2 w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-[var(--accent)]" style={fieldStyle}/><p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{model.provider==='ollama'?'Sent as num_ctx to Ollama. Larger budgets use more memory.':'Limits the context sent to the model. Change the runner allocation in your provider.'}</p></div>
          <button aria-disabled="true" data-ui-only="true" className="text-xs mt-3 opacity-40 cursor-not-allowed">Unload from provider</button>
        </section>
      </div>
      <footer className="border-t p-4 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        {!valid && <p role="alert" className="text-xs mb-3 text-red-400">Use temperature 0–2, a positive output limit, and a context budget above the output limit and within the reported capacity.</p>}
        <div className="flex gap-2"><button onClick={() => { onUnload(model.id); onClose(); }} title="Removes this connection; does not free provider memory" className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg hover:bg-[var(--bg-active)]"><Trash2 size={14} />Remove</button><button onClick={save} disabled={!valid} className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}><Save size={14} />Save to rack</button></div>
      </footer>
    </div>
  );
};
