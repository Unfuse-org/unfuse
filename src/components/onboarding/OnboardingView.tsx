import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, ArrowRight, FolderOpen, Layers3 } from 'lucide-react';
import mascot from '../../assets/home-mascot.png';
import { MountModelView } from '../rack/MountModelView';
import type { LocalModelBlade } from '../rack/types';
import { WindowControls } from '../WindowControls';
import type { DesktopPlatform } from '../DesktopMenus';

export interface SetupPreferences {
  completed: boolean;
  workspaceRoot: string;
  model?: LocalModelBlade;
}

export const SETUP_KEY = 'unfuse_onboarding_v1';

export function readSetup(): SetupPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null');
    if (saved?.completed === true && typeof saved.workspaceRoot === 'string') {
      return { ...saved, model: saved.model ? { ...saved.model, status: 'standby' } : undefined };
    }
  } catch { /* First launch or unavailable local storage. */ }
  return { completed: false, workspaceRoot: '' };
}

interface Props {
  platform?: DesktopPlatform;
  initial: SetupPreferences;
  initialStep?: number;
  onComplete: (setup: SetupPreferences) => void;
}

export function OnboardingView({ initial, initialStep = 0, onComplete, platform }: Props) {
  const [step, setStep] = useState(initialStep);
  const [model, setModel] = useState(initial.model);
  const [choosingModel, setChoosingModel] = useState(false);
  const [workspace, setWorkspace] = useState(initial.workspaceRoot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function finish(workspaceRoot: string) {
    const preferences: SetupPreferences = { completed: true, workspaceRoot, model };
    try {
      // Setup remembers model identity/settings, never copies provider credentials.
      const rememberedModel = model ? { ...model, apiKey: undefined, status: 'standby' } : undefined;
      localStorage.setItem(SETUP_KEY, JSON.stringify({ ...preferences, model: rememberedModel }));
      onComplete(preferences);
    } catch {
      setError('Setup could not be saved on this device. You can continue for this session.');
    }
  }

  async function openWorkspace(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!workspace.trim()) { setError('Enter an existing absolute folder path, or choose Set up later.'); return; }
    if (!('__TAURI_INTERNALS__' in window)) {
      setError('Open the desktop app to validate your workspace folder. You can set it up later in this preview.');
      return;
    }
    setBusy(true);
    try {
      const canonical = await invoke<string>('select_workspace', { workspaceRoot: workspace.trim() });
      finish(canonical);
    } catch (failure) {
      setError(String(failure));
    } finally { setBusy(false); }
  }

  const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--text-main)] px-5 py-3 text-sm font-medium text-[var(--bg-app)] disabled:opacity-50';
  return (
    <main className="flex h-screen w-screen flex-col overflow-y-auto bg-[var(--bg-app)] text-[var(--text-main)] font-sans">
      <header className="flex h-10 shrink-0 justify-end" data-tauri-drag-region><div className="h-full flex-1" data-tauri-drag-region /><WindowControls platform={platform} /></header>
      <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-10">
      <div className="m-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="p-7 text-left sm:p-10">
        <div key={step} className="onboarding-page-enter min-h-[280px]">
        {step === 0 && <section className="text-center">
          <div className="mb-8 flex h-24 items-end justify-center"><img src={mascot} alt="Unfuse mascot" className="h-24 w-24 object-contain" /></div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Welcome to Unfuse</h1>
          <p className="mt-5 text-sm leading-6">Your models and your workspace, together.</p>
        </section>}
        {step === 1 && <section>
          <div className="mb-6 flex h-20 items-end"><Layers3 size={32} /></div><h1 className="text-3xl font-semibold tracking-tight">Connect your provider</h1>
          <p className="mt-3 text-sm leading-6">Start your local provider, such as Ollama or LM Studio. Select the provider first, then choose one of its available models.</p>
          {choosingModel ? <div className="mt-5 h-[min(50vh,500px)] min-h-64 overflow-hidden rounded-2xl border border-[var(--border-subtle)]"><MountModelView embedded mountedModels={[]} onClose={() => setChoosingModel(false)} onMountModel={selected => { setModel(selected); setNotice('Provider found and model selected. You can continue.'); }} /></div> : <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            <p className="font-medium">{model ? `${model.provider} · ${model.displayName}` : 'Provider → model'}</p>
            <p className="mt-2 text-sm leading-6">{notice || (model ? 'Saved selection. Reconnect your provider to check which models are available.' : 'Connect your provider to see its models. No model download starts automatically.')}</p>
            <button className="mt-4 rounded-lg bg-[var(--bg-active)] px-4 py-2 text-sm" onClick={() => setChoosingModel(true)}>{model ? 'Reconnect provider' : 'Connect provider'}</button>
          </div>}
        </section>}
        {step === 2 && <section>
          <div className="mb-6 flex h-20 items-end"><FolderOpen size={32} /></div><h1 className="text-3xl font-semibold tracking-tight">Choose your workspace</h1>
          <p className="mt-3 text-sm leading-6">Choose the folder Unfuse will work in. This saves your workspace selection; it does not start a task or grant blanket permission to run commands.</p>
          <form id="onboarding-workspace" onSubmit={openWorkspace} className="mt-6 space-y-4">
            <label className="block text-sm">Workspace folder<input autoFocus value={workspace} disabled={busy} onChange={event => { setWorkspace(event.target.value); setError(''); }} placeholder="Absolute path to your project folder" className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-3 text-sm outline-none focus:border-[var(--text-muted)]" /></label>
            <p className="text-sm leading-6">Paste an existing folder’s full path. You can revisit setup to choose another folder.</p>
          </form>
        </section>}
        {error && <div className="mt-5"><p role="alert" className="text-sm">{error}</p>{error.includes('continue for this session') && <button onClick={() => onComplete({ completed:true, workspaceRoot:'', model })} className="mt-3 text-sm underline">Continue for this session</button>}</div>}
        </div>
        </div>
        <footer aria-label="Setup navigation" className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-app)] px-7 py-5 sm:px-10">
          <button disabled={busy || step === 0} className={`flex items-center gap-2 py-3 text-sm ${step === 0 ? 'invisible' : ''}`} onClick={() => { setError(''); if (choosingModel) setChoosingModel(false); else setStep(step - 1); }}><ArrowLeft size={14} />Back</button>
          <div className="flex items-center gap-4">
            {step > 0 && <button disabled={busy} onClick={() => { setError(''); setChoosingModel(false); if (step === 1) { setModel(undefined); setNotice(''); setStep(2); } else finish(''); }} className="py-3 text-sm">Set up later</button>}
            {step === 2 ? <button type="submit" form="onboarding-workspace" disabled={busy} className={primary}>{busy ? 'Checking folder…' : 'Open Unfuse'}<ArrowRight size={16} /></button> : <button autoFocus={step === 0} disabled={step === 1 && (!model || choosingModel)} className={primary} onClick={() => setStep(step + 1)}>{step === 0 ? 'Get started' : 'Continue'}<ArrowRight size={16} /></button>}
          </div>
        </footer>
      </div>
      </div>
    </main>
  );
}
