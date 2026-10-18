import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LocalProvider, AvailableProviderModel, LocalModelBlade } from './types';
import { X, Plus, ArrowLeft, RefreshCw, AlertCircle, Key } from 'lucide-react';
import { formatBytes } from './modelResolver';
import { OllamaLogo, LMStudioLogo, VLLMLogo, UnslothLogo, LlamaCppLogo, MLXLogo } from './Logos';
import { ModelFamilyLogo } from '../chat/ModelIdentity';

interface MountModelViewProps {
  onClose: () => void;
  onMountModel: (model: LocalModelBlade) => void;
  mountedModels?: LocalModelBlade[];
  embedded?: boolean;
}

const PROVIDER_DATA: Record<
  LocalProvider,
  {
    name: string;
    port: number;
    endpoint: string;
    logo: React.FC<{ size?: number; className?: string }>;
  }
> = {
  ollama: {
    name: 'Ollama',
    port: 11434,
    endpoint: 'http://localhost:11434',
    logo: OllamaLogo,
  },
  lmstudio: {
    name: 'LM Studio',
    port: 1234,
    endpoint: 'http://localhost:1234',
    logo: LMStudioLogo,
  },
  mlx: {
    name: 'MLX-LM server',
    port: 8080,
    endpoint: 'http://localhost:8080',
    logo: MLXLogo,
  },
  vllm: {
    name: 'vLLM',
    port: 8000,
    endpoint: 'http://localhost:8000',
    logo: VLLMLogo,
  },
  unsloth: {
    name: 'Unsloth',
    port: 8888,
    endpoint: 'http://localhost:8888',
    logo: UnslothLogo,
  },
  llamacpp: {
    name: 'llama.cpp',
    port: 8080,
    endpoint: 'http://localhost:8080',
    logo: LlamaCppLogo,
  },
};

export const getModelLogo = (family: string, providerOrSize?: string | number, maybeSize?: number, modelId?: string): React.ReactElement => <ModelFamilyLogo family={family} modelId={modelId} size={typeof providerOrSize === 'number' ? providerOrSize : maybeSize ?? 16} />;

export const MountModelView: React.FC<MountModelViewProps> = ({
  onClose,
  onMountModel,
  mountedModels = [],
  embedded = false,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<LocalProvider>(() => (Object.keys(PROVIDER_DATA) as LocalProvider[]).find(provider => !mountedModels.some(model => model.provider === provider)) ?? 'ollama');
  const provider = PROVIDER_DATA[selectedProvider];
  const [serverUrl, setServerUrl] = useState(PROVIDER_DATA.ollama.endpoint);
  const [apiKey, setApiKey] = useState('');
  const scanId = useRef(0);
  const [discoveredConnection, setDiscoveredConnection] = useState<{ provider: LocalProvider; endpoint: string; apiKey: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableProviderModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AvailableProviderModel | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const isOccupied = mountedModels.some(model => model.provider === selectedProvider);

  const scanRunner = async (p: LocalProvider, endpoint: string, key: string) => {
    if (mountedModels.some(model => model.provider === p)) return;
    const request = ++scanId.current;
    setIsScanning(true);
    setScanError(null);
    setAvailableModels([]);
    setSelectedModel(null);
    setDiscoveredConnection(null);
    try {
      const models = await invoke<AvailableProviderModel[]>('discover_provider_models', { provider: p, baseUrl: endpoint.trim(), apiKey: key.trim() || null });
      if (request !== scanId.current) return;
      setAvailableModels(models);
      setSelectedModel(models[0] ?? null);
      setDiscoveredConnection({ provider: p, endpoint: endpoint.trim(), apiKey: key.trim() });
    } catch (error) {
      if (request === scanId.current) setScanError(typeof error === 'string' ? error : 'Unable to query the selected runner. Check its URL and authentication.');
    } finally {
      if (request === scanId.current) setIsScanning(false);
    }
  };

  useEffect(() => {
    const endpoint = PROVIDER_DATA[selectedProvider].endpoint;
    setServerUrl(endpoint);
    setApiKey('');
    setAvailableModels([]);
    setSelectedModel(null);
    setDiscoveredConnection(null);
    setScanError(null);
    setIsScanning(false);
    // Connect explicitly: never send an old runner's credentials to a newly selected server.
    scanId.current++;
    return () => { scanId.current++; };
  }, [selectedProvider]);

  const invalidateConnection = () => {
    scanId.current++;
    setIsScanning(false);
    setSelectedModel(null);
    setAvailableModels([]);
    setDiscoveredConnection(null);
    setScanError(null);
  };

  const handleMount = () => {
    if (!selectedModel || isOccupied || !discoveredConnection || discoveredConnection.provider !== selectedProvider) return;

    const blade: LocalModelBlade = {
      id: `m-${Date.now()}`,
      name: selectedModel.name,
      displayName: selectedModel.displayName,
      provider: selectedProvider,
      endpoint: discoveredConnection.endpoint,
      port: Number(new URL(discoveredConnection.endpoint).port || (new URL(discoveredConnection.endpoint).protocol === 'https:' ? 443 : 80)),
      quantization: selectedModel.quantization ?? undefined,
      sizeBytes: selectedModel.sizeBytes ?? undefined,
      contextLength: selectedModel.contextLength ?? undefined,
      maxContextLength: selectedModel.maxContextLength ?? undefined,
      loaded: selectedModel.loaded,
      tokensUsed: selectedModel.tokensUsed || 0,
      speedTokPerSec: 0,
      status: 'loaded',
      family: selectedModel.family,
      capabilities: selectedModel.capabilities,
      apiKey: discoveredConnection.apiKey || undefined,
    };

    onMountModel(blade);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-panel)] px-3.5 pt-2 pb-3 text-[var(--text-main)] overflow-y-auto select-none animate-in fade-in duration-150 font-sans">
      {/* TOP HEADER CONTROLS */}
      {!embedded && <div className="h-8 flex items-center justify-between mb-2 shrink-0" data-tauri-drag-region>
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          onClick={onClose}
          aria-label="Close model connection"
          className="p-1 -mr-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>}

      {/* 1. PROVIDER RUNTIMES GRID */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 font-mono text-[10.5px]">
        {(Object.keys(PROVIDER_DATA) as LocalProvider[]).map((p) => {
          const isSelected = p === selectedProvider;
          const provInfo = PROVIDER_DATA[p];
          const ProvLogo = provInfo.logo;
          const provMounted = mountedModels.some((m) => m.provider === p);

          return (
            <button
              key={p}
              disabled={provMounted}
              title={provMounted ? 'Remove this provider’s model from the rack before adding another.' : provInfo.name}
              aria-pressed={isSelected}
              onClick={() => setSelectedProvider(p)}
              className={`relative py-2 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isSelected
                  ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-main)] font-semibold shadow-sm'
                  : 'bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]'
              }`}
            >
              {provMounted && (
                <span
                  title="Already mounted in rack"
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white shadow-xs"
                />
              )}
              <ProvLogo size={18} />
              <span className="text-[10px] tracking-tight">{provInfo.name}</span>
            </button>
          );
        })}
      </div>

      {/* UNSLOTH API TOKEN INPUT */}
      <div className="space-y-2 my-3">
        <label className="block text-[11px] text-[var(--text-muted)]">Server URL
          <input type="url" value={serverUrl} spellCheck={false} onChange={event => { invalidateConnection(); setServerUrl(event.target.value); }} placeholder={provider.endpoint} className="block mt-1 w-full rounded-lg bg-[var(--bg-app)] px-2 py-2 text-xs text-[var(--text-main)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]" />
        </label>
        <label className="block text-[11px] text-[var(--text-muted)] flex items-center gap-2"><Key size={12} />API key{selectedProvider === 'unsloth' ? ' (required)' : ' (if required)'}</label>
        <input aria-label="Provider API key" type="password" autoComplete="off" value={apiKey} onChange={event => { invalidateConnection(); setApiKey(event.target.value); }} className="w-full rounded-lg bg-[var(--bg-app)] px-2 py-2 text-xs text-[var(--text-main)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]" />
        {selectedProvider === 'mlx' && <p className="text-[10px] text-[var(--text-muted)]">Connect to mlx-lm's OpenAI-compatible server. Other MLX serving apps may use different APIs.</p>}
      </div>
      <div className="mb-2 px-0.5 flex items-center justify-between">
        <span className="text-[var(--text-main)] text-[11px] font-medium">Available models ({availableModels.length})</span>
        <button disabled={isOccupied || isScanning || !serverUrl.trim()} onClick={() => scanRunner(selectedProvider, serverUrl, apiKey)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 text-[10px] disabled:opacity-40">
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin motion-reduce:animate-none' : ''}`} />
          {isScanning ? 'Connecting…' : discoveredConnection ? 'Refresh' : 'Connect'}
        </button>
      </div>

      {/* 3. DETECTED MODELS LIST OR ERROR */}
      <div className="space-y-1.5 mb-3 flex-1 overflow-y-auto">
        {scanError ? (
          <div className="p-3.5 rounded-xl bg-[var(--bg-app)] border border-[var(--border-subtle)] text-center flex flex-col items-center gap-2 text-[var(--text-muted)]">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span role="alert" className="text-[11px] leading-relaxed">{scanError}</span>
          </div>
        ) : availableModels.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-xs">
            {isScanning ? 'Querying selected server…' : discoveredConnection ? 'No models reported by this runner.' : 'Connect to list available models.'}
          </div>
        ) : (
          availableModels.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            const isCurrentActiveBlade = mountedModels.some(model => model.provider === selectedProvider && model.endpoint === discoveredConnection?.endpoint && model.name === m.name);

            return (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-surface)] border-[var(--border-strong)] text-[var(--text-main)] shadow-sm ring-1 ring-[var(--border-strong)]'
                    : 'bg-[var(--bg-app)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0 border border-white/20">
                    {getModelLogo(m.family, selectedProvider, 16, m.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-[var(--text-main)] tracking-tight truncate">
                        {m.displayName}
                      </span>
                      {isCurrentActiveBlade && (
                        <span className="text-[9px] font-mono bg-[var(--accent)] text-[var(--accent-fg)] px-1 rounded font-bold shrink-0">
                          MOUNTED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                      {[
                        m.quantization && m.quantization !== 'unknown' ? m.quantization : null,
                        m.sizeBytes ? formatBytes(m.sizeBytes) : null,
                        m.contextLength ? `${m.contextLength.toLocaleString()} ctx` : null,
                      m.loaded === true ? 'Loaded in runner' : m.loaded === false ? 'Not loaded in runner' : null,
                      ].filter(Boolean).join(' · ') || 'Allocation not reported'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 4. MOUNT BUTTON */}
      <button
        disabled={isOccupied || !selectedModel || isScanning || !discoveredConnection}
        onClick={handleMount}
        className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
          isOccupied || !selectedModel || isScanning || !discoveredConnection
            ? 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed'
            : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] active:scale-[0.98] cursor-pointer'
        }`}
      >
        {isOccupied ? (
          <span>Already connected in rack</span>
        ) : !selectedModel ? (
          <span>{embedded ? 'Choose a model above' : 'Select a Model to Mount'}</span>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{embedded ? `Use ${selectedModel.displayName}` : `Mount ${selectedModel.displayName} to Rack`}</span>
          </>
        )}
      </button>
    </div>
  );
};
