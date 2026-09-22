import React, { useState, useEffect } from 'react';
import { LocalProvider, ModelRole, AvailableProviderModel, LocalModelBlade, ModelFamily } from './types';
import { X, Plus, ArrowLeft, RefreshCw, AlertCircle, Key } from 'lucide-react';
import { inferRole, normalizeFamilyForLogo } from './modelResolver';
import {
  OllamaLogo,
  LMStudioLogo,
  VLLMLogo,
  UnslothLogo,
  LlamaCppLogo,
  MLXLogo,
  QwenLogo,
  DeepSeekLogo,
  MetaLlamaLogo,
  MistralLogo,
  MicrosoftPhiLogo,
  GoogleGemmaLogo,
  MiniCPMLogo,
  CohereLogo,
  StarCoderLogo,
  BAAILogo,
  NomicEmbeddingLogo,
  WhisperAudioLogo,
} from './Logos';

interface MountModelViewProps {
  onClose: () => void;
  onMountModel: (model: LocalModelBlade) => void;
  mountedModels?: LocalModelBlade[];
}

const CANDIDATE_PORTS: Record<LocalProvider, number[]> = {
  ollama: [11434],
  lmstudio: [1234],
  mlx: [8080, 8081, 8088, 8000],
  vllm: [8000, 8080],
  unsloth: [8888, 8000],
  llamacpp: [8080, 8081],
};

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
    name: 'Apple MLX',
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

export const getModelLogo = (family: string, size: number = 16) => {
  const normalized = normalizeFamilyForLogo(family);
  switch (normalized) {
    case 'qwen':
      return <QwenLogo size={size} />;
    case 'deepseek':
      return <DeepSeekLogo size={size} />;
    case 'llama':
      return <MetaLlamaLogo size={size} />;
    case 'mistral':
      return <MistralLogo size={size} />;
    case 'phi':
      return <MicrosoftPhiLogo size={size} />;
    case 'gemma':
      return <GoogleGemmaLogo size={size} />;
    case 'minicpm':
      return <MiniCPMLogo size={size} />;
    case 'cohere':
      return <CohereLogo size={size} />;
    case 'starcoder':
      return <StarCoderLogo size={size} />;
    case 'baai':
      return <BAAILogo size={size} />;
    case 'nomic':
      return <NomicEmbeddingLogo size={size} />;
    case 'whisper':
      return <WhisperAudioLogo size={size} />;
    default:
      return <OllamaLogo size={size} />;
  }
};

export const MountModelView: React.FC<MountModelViewProps> = ({
  onClose,
  onMountModel,
  mountedModels = [],
}) => {
  const [selectedProvider, setSelectedProvider] = useState<LocalProvider>('ollama');
  const provider = PROVIDER_DATA[selectedProvider];
  const [activePort, setActivePort] = useState<number>(PROVIDER_DATA[selectedProvider].port);
  const [isCustomPortEditing, setIsCustomPortEditing] = useState(false);
  const [customPortInput, setCustomPortInput] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<AvailableProviderModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AvailableProviderModel | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [unslothApiKey, setUnslothApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('unfuse_unsloth_api_key') || '';
    }
    return '';
  });

  // Check if current provider is already loaded into the rack
  const occupiedBlade = mountedModels.find((m) => m.provider === selectedProvider);
  const isOccupied = !!occupiedBlade;

  async function inspectOllamaModel(name: string, port: number): Promise<{ contextLength: number; parameterSize?: string }> {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) return { contextLength: 32768 };
      const data = await res.json();
      const modelInfo = data.model_info || {};

      let detectedCtx = 32768;
      for (const [k, v] of Object.entries(modelInfo)) {
        if (k.endsWith('.context_length') && typeof v === 'number' && v > 0) {
          detectedCtx = v;
          break;
        }
      }
      return {
        contextLength: detectedCtx,
        parameterSize: data.details?.parameter_size,
      };
    } catch {
      return { contextLength: 32768 };
    }
  }

  const scanRunner = async (p: LocalProvider, explicitPort?: number) => {
    setIsScanning(true);
    setScanError(null);
    setAvailableModels([]);
    setSelectedModel(null);

    const provInfo = PROVIDER_DATA[p];
    const portsToTry = explicitPort
      ? [explicitPort]
      : CANDIDATE_PORTS[p] || [provInfo.port];

    let foundSuccess = false;
    let lastErrorMessage = `Unable to connect to ${provInfo.name} on port ${portsToTry.join('/')}. Ensure the local server is running.`;
    const storedUnslothKey = (typeof window !== 'undefined' && window.localStorage?.getItem('unfuse_unsloth_api_key')) || unslothApiKey || undefined;
    const activeKey = p === 'unsloth' ? storedUnslothKey : undefined;

    for (const port of portsToTry) {
      try {
        if (p === 'ollama') {
          const res = await fetch(`http://127.0.0.1:${port}/api/tags`, {
            signal: AbortSignal.timeout(1500),
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            const listPromises = data.models.map(async (m: any) => {
              const name = m.name || m.model;
              const tagsFamily = m.details?.family || normalizeFamilyForLogo(name);
              const sizeGb = m.size ? parseFloat((m.size / (1024 * 1024 * 1024)).toFixed(1)) : 4.0;
              const tagsQuant = m.details?.quantization_level || 'unknown';
              const role = inferRole(name);
              const details = await inspectOllamaModel(name, port);

              return {
                id: `ollama-${name}`,
                name,
                displayName: name,
                quantization: tagsQuant,
                sizeGb,
                contextLength: details.contextLength,
                parameters: details.parameterSize || m.details?.parameter_size,
                tokensUsed: 0,
                defaultRole: role,
                family: tagsFamily,
                capabilities: m.capabilities || ['completion'],
              };
            });
            const list = await Promise.all(listPromises);
            setActivePort(port);
            setAvailableModels(list);
            setSelectedModel(list[0]);
            foundSuccess = true;
            break;
          } else {
            lastErrorMessage = 'No models installed in Ollama. Pull a model using `ollama run <model>`';
          }
        } else {
          // OpenAI-compatible runners (MLX, LM Studio, vLLM, Unsloth, llama.cpp)
          const headers: Record<string, string> = {};
          if (p === 'unsloth' && activeKey?.trim()) {
            headers['Authorization'] = `Bearer ${activeKey.trim()}`;
          }
          const res = await fetch(`http://127.0.0.1:${port}/v1/models`, {
            signal: AbortSignal.timeout(1500),
            headers,
          });
          if (!res.ok) continue;
          const data = await res.json();
          const modelsArr = data.data || data.models || [];
          if (Array.isArray(modelsArr) && modelsArr.length > 0) {
            const list: AvailableProviderModel[] = modelsArr.map((m: any) => {
              const name = m.id || m.name;
              const family = normalizeFamilyForLogo(name);
              const role = inferRole(name);
              const ctx = typeof m.context_length === 'number' && m.context_length > 0
                ? m.context_length
                : typeof m.max_model_len === 'number' && m.max_model_len > 0
                ? m.max_model_len
                : 32768;

              return {
                id: `${p}-${name}`,
                name,
                displayName: name,
                quantization: 'unknown',
                sizeGb: 0,
                contextLength: ctx,
                tokensUsed: 0,
                defaultRole: role,
                family,
              };
            });
            setActivePort(port);
            setAvailableModels(list);
            setSelectedModel(list[0]);
            foundSuccess = true;
            break;
          } else {
            lastErrorMessage = `No active models loaded in ${provInfo.name} on port ${port}`;
          }
        }
      } catch {
        // Try next candidate port
      }
    }

    if (!foundSuccess) {
      setScanError(lastErrorMessage);
    }
    setIsScanning(false);
  };

  useEffect(() => {
    setActivePort(PROVIDER_DATA[selectedProvider].port);
    scanRunner(selectedProvider);
  }, [selectedProvider]);

  const handleMount = () => {
    if (!selectedModel || isOccupied) return;

    const blade: LocalModelBlade = {
      id: `m-${Date.now()}`,
      name: selectedModel.name,
      displayName: selectedModel.displayName,
      provider: selectedProvider,
      endpoint: `http://localhost:${activePort}`,
      port: activePort,
      quantization: selectedModel.quantization,
      sizeGb: selectedModel.sizeGb,
      vramUsageGb: selectedModel.sizeGb,
      contextLength: selectedModel.contextLength,
      tokensUsed: selectedModel.tokensUsed || 0,
      speedTokPerSec: 0,
      status: 'loaded',
      role: selectedModel.defaultRole,
      family: selectedModel.family,
    };

    onMountModel(blade);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161618] px-3.5 pt-2 pb-3 text-white/90 overflow-y-auto select-none animate-in fade-in duration-150 font-sans">
      {/* TOP HEADER CONTROLS */}
      <div className="h-8 flex items-center justify-between mb-2 shrink-0" data-tauri-drag-region>
        <button
          onClick={onClose}
          className="p-1 -ml-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          onClick={onClose}
          className="p-1 -mr-1 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

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
              onClick={() => setSelectedProvider(p)}
              className={`relative py-2 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/10 border-white/30 text-white font-semibold shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
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
      {selectedProvider === 'unsloth' && (
        <div className="mb-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-white/40 shrink-0" />
          <input
            type="password"
            value={unslothApiKey}
            onChange={(e) => {
              const val = e.target.value;
              setUnslothApiKey(val);
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('unfuse_unsloth_api_key', val);
              }
            }}
            onBlur={() => scanRunner('unsloth', activePort)}
            placeholder="Unsloth API Token (sk-unsloth-...)"
            className="bg-transparent text-white placeholder-white/20 text-xs font-mono outline-none flex-1"
          />
        </div>
      )}

      {/* 2. HEADER: DETECTED LOCAL MODELS & ACTIVE PORT */}
      <div className="mb-2 px-0.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-[11px] font-medium tracking-tight">
            Installed Models ({availableModels.length})
          </span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            <span>Port:</span>
            {isCustomPortEditing ? (
              <input
                type="number"
                value={customPortInput}
                onChange={(e) => setCustomPortInput(e.target.value)}
                onBlur={() => {
                  setIsCustomPortEditing(false);
                  const parsed = parseInt(customPortInput, 10);
                  if (parsed > 0) {
                    setActivePort(parsed);
                    scanRunner(selectedProvider, parsed);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsCustomPortEditing(false);
                    const parsed = parseInt(customPortInput, 10);
                    if (parsed > 0) {
                      setActivePort(parsed);
                      scanRunner(selectedProvider, parsed);
                    }
                  }
                }}
                autoFocus
                className="w-12 bg-white/10 text-sky-400 px-1 py-0.2 rounded border border-sky-400/40 text-[10px] font-mono outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomPortInput(String(activePort));
                  setIsCustomPortEditing(true);
                }}
                className="text-sky-400 hover:text-sky-300 font-bold underline cursor-pointer"
                title="Click to change port"
              >
                {activePort}
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => scanRunner(selectedProvider, activePort)}
          title="Rescan local runner"
          className="text-white/40 hover:text-white flex items-center gap-1 text-[10px] cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Scanning...' : 'Rescan'}</span>
        </button>
      </div>

      {/* 3. DETECTED MODELS LIST OR ERROR */}
      <div className="space-y-1.5 mb-3 flex-1 overflow-y-auto">
        {scanError ? (
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center flex flex-col items-center gap-2 text-white/60">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-[11px] leading-relaxed">{scanError}</span>
          </div>
        ) : availableModels.length === 0 ? (
          <div className="p-4 text-center text-white/40 text-xs">
            {isScanning ? 'Detecting local models on machine...' : 'No models found.'}
          </div>
        ) : (
          availableModels.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            const isCurrentActiveBlade = occupiedBlade?.name === m.name;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.08] border-white/40 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)] ring-1 ring-white/15'
                    : 'bg-white/[0.025] border-white/[0.05] text-white/70 hover:text-white hover:bg-white/[0.04] hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0 border border-white/20">
                    {getModelLogo(m.family)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-white tracking-tight truncate">
                        {m.displayName}
                      </span>
                      {isCurrentActiveBlade && (
                        <span className="text-[9px] font-mono bg-white text-black px-1 rounded font-bold shrink-0">
                          MOUNTED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono mt-0.5">
                      {m.defaultRole} · {m.quantization} · {m.sizeGb} GB
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
        disabled={isOccupied || !selectedModel}
        onClick={handleMount}
        className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
          isOccupied || !selectedModel
            ? 'bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90 active:scale-[0.98] cursor-pointer'
        }`}
      >
        {isOccupied ? (
          <span>{provider.name} Already Active in Rack</span>
        ) : !selectedModel ? (
          <span>Select a Model to Mount</span>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Mount {selectedModel.displayName} to Rack</span>
          </>
        )}
      </button>
    </div>
  );
};
