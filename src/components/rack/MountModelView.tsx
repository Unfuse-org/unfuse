import React, { useState } from 'react';
import { LocalProvider, ModelRole, AvailableProviderModel, LocalModelBlade, ModelFamily } from './types';
import { X, Plus, ArrowLeft } from 'lucide-react';
import {
  OllamaLogo,
  LMStudioLogo,
  JanLogo,
  VLLMLogo,
  AppleMLXLogo,
  LlamaCppLogo,
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

const PROVIDER_DATA: Record<
  LocalProvider,
  {
    name: string;
    port: number;
    endpoint: string;
    logo: React.FC<{ size?: number; className?: string }>;
    models: AvailableProviderModel[];
  }
> = {
  ollama: {
    name: 'Ollama',
    port: 11434,
    endpoint: 'http://localhost:11434',
    logo: OllamaLogo,
    models: [
      { id: 'qwen2.5-coder:32b', name: 'qwen2.5-coder:32b', displayName: 'Qwen 2.5 Coder 32B', quantization: 'Q4_K_M', sizeGb: 19.8, contextLength: 32768, tokensUsed: 1420, defaultRole: 'Coder', family: 'qwen' },
      { id: 'minicpm-v:8b', name: 'minicpm-v:8b', displayName: 'MiniCPM-V 2.6 (OCR & Vision)', quantization: 'Q4_K_M', sizeGb: 5.5, contextLength: 8192, tokensUsed: 890, defaultRole: 'Vision / OCR', family: 'minicpm' },
      { id: 'deepseek-r1:14b', name: 'deepseek-r1:14b', displayName: 'DeepSeek R1 14B', quantization: 'Q4_K_M', sizeGb: 9.0, contextLength: 65536, tokensUsed: 4210, defaultRole: 'Reasoning', family: 'deepseek' },
      { id: 'llama3.3:70b', name: 'llama3.3:70b', displayName: 'Meta Llama 3.3 70B', quantization: 'Q4_K_M', sizeGb: 42.0, contextLength: 131072, tokensUsed: 8400, defaultRole: 'General', family: 'llama' },
      { id: 'command-r:35b', name: 'command-r:35b', displayName: 'Cohere Command R 35B', quantization: 'Q4_K_M', sizeGb: 21.0, contextLength: 131072, tokensUsed: 2150, defaultRole: 'General', family: 'cohere' },
      { id: 'nomic-embed-text', name: 'nomic-embed-text', displayName: 'Nomic Embed Text (v1.5)', quantization: 'FP16', sizeGb: 0.6, contextLength: 8192, tokensUsed: 512, defaultRole: 'Embeddings', family: 'nomic' },
      { id: 'whisper:large-v3', name: 'whisper:large-v3', displayName: 'Whisper Large v3', quantization: 'Q8_0', sizeGb: 3.1, contextLength: 448, tokensUsed: 120, defaultRole: 'Audio', family: 'whisper' },
    ],
  },
  lmstudio: {
    name: 'LM Studio',
    port: 1234,
    endpoint: 'http://localhost:1234',
    logo: LMStudioLogo,
    models: [
      { id: 'deepseek-r1-distill-qwen-14b', name: 'deepseek-r1-distill-qwen-14b', displayName: 'DeepSeek R1 Distill 14B', quantization: 'Q8_0', sizeGb: 14.6, contextLength: 65536, tokensUsed: 3680, defaultRole: 'Reasoning', family: 'deepseek' },
      { id: 'qwen2.5-vl-7b-instruct', name: 'qwen2.5-vl-7b-instruct', displayName: 'Qwen 2.5 VL 7B (Vision)', quantization: 'Q8_0', sizeGb: 7.8, contextLength: 32768, tokensUsed: 1840, defaultRole: 'Vision / OCR', family: 'qwen' },
      { id: 'mistral-nemo-12b', name: 'mistral-nemo-12b', displayName: 'Mistral Nemo 12B', quantization: 'Q5_K_M', sizeGb: 8.4, contextLength: 128000, tokensUsed: 5200, defaultRole: 'General', family: 'mistral' },
    ],
  },
  jan: {
    name: 'Jan.ai',
    port: 1337,
    endpoint: 'http://localhost:1337',
    logo: JanLogo,
    models: [
      { id: 'phi-4:14b', name: 'phi-4:14b', displayName: 'Microsoft Phi-4 14B', quantization: 'Q4_K_M', sizeGb: 8.9, contextLength: 16384, tokensUsed: 1100, defaultRole: 'Coder', family: 'phi' },
      { id: 'gemma-2-9b-it', name: 'gemma-2-9b-it', displayName: 'Google Gemma 2 9B', quantization: 'Q4_K_M', sizeGb: 5.8, contextLength: 8192, tokensUsed: 750, defaultRole: 'General', family: 'gemma' },
      { id: 'starcoder2-15b', name: 'starcoder2-15b', displayName: 'StarCoder2 15B', quantization: 'Q4_K_M', sizeGb: 9.2, contextLength: 16384, tokensUsed: 2240, defaultRole: 'Coder', family: 'starcoder' },
    ],
  },
  vllm: {
    name: 'vLLM',
    port: 8000,
    endpoint: 'http://localhost:8000',
    logo: VLLMLogo,
    models: [
      { id: 'qwen2.5-coder-32b-instruct-fp8', name: 'qwen2.5-coder-32b-instruct', displayName: 'Qwen 2.5 Coder 32B (FP8)', quantization: 'FP8', sizeGb: 34.0, contextLength: 32768, tokensUsed: 2900, defaultRole: 'Coder', family: 'qwen' },
      { id: 'bge-reranker-large', name: 'bge-reranker-large', displayName: 'BAAI BGE Reranker Large', quantization: 'FP16', sizeGb: 1.2, contextLength: 512, tokensUsed: 64, defaultRole: 'Reranker', family: 'baai' },
    ],
  },
  mlx: {
    name: 'Apple MLX',
    port: 8080,
    endpoint: 'http://localhost:8080',
    logo: AppleMLXLogo,
    models: [
      { id: 'mlx-community/Qwen2.5-Coder-32B-Instruct-4bit', name: 'Qwen2.5-Coder-32B-MLX', displayName: 'Qwen 2.5 Coder 32B (MLX)', quantization: '4-bit MLX', sizeGb: 18.2, contextLength: 32768, tokensUsed: 1950, defaultRole: 'Coder', family: 'qwen' },
      { id: 'mlx-community/DeepSeek-R1-Distill-Qwen-14B-8bit', name: 'DeepSeek-R1-14B-MLX', displayName: 'DeepSeek R1 14B (MLX)', quantization: '8-bit MLX', sizeGb: 14.8, contextLength: 65536, tokensUsed: 3100, defaultRole: 'Reasoning', family: 'deepseek' },
    ],
  },
  llamacpp: {
    name: 'llama.cpp',
    port: 8080,
    endpoint: 'http://localhost:8080',
    logo: LlamaCppLogo,
    models: [
      { id: 'custom-gguf-model', name: 'custom-gguf', displayName: 'Local GGUF Server', quantization: 'Custom', sizeGb: 12.0, contextLength: 32768, tokensUsed: 1200, defaultRole: 'General', family: 'custom' },
    ],
  },
};

export const getModelLogo = (family: ModelFamily, size: number = 16) => {
  switch (family) {
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
  const [selectedModel, setSelectedModel] = useState<AvailableProviderModel>(provider.models[0]);

  // Check if current provider is already loaded into the rack
  const occupiedBlade = mountedModels.find((m) => m.provider === selectedProvider);
  const isOccupied = !!occupiedBlade;

  const handleProviderChange = (p: LocalProvider) => {
    setSelectedProvider(p);
    const first = PROVIDER_DATA[p].models[0];
    if (first) {
      setSelectedModel(first);
    }
  };

  const handleMount = () => {
    if (!selectedModel || isOccupied) return;

    const blade: LocalModelBlade = {
      id: `m-${Date.now()}`,
      name: selectedModel.name,
      displayName: selectedModel.displayName,
      provider: selectedProvider,
      endpoint: provider.endpoint,
      port: provider.port,
      quantization: selectedModel.quantization,
      sizeGb: selectedModel.sizeGb,
      vramUsageGb: selectedModel.sizeGb,
      contextLength: selectedModel.contextLength || 32768,
      tokensUsed: selectedModel.tokensUsed || 1420,
      speedTokPerSec: 48.0,
      status: 'loaded',
      role: selectedModel.defaultRole,
      family: selectedModel.family,
    };

    onMountModel(blade);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161618] px-3.5 pt-2 pb-3 text-white/90 overflow-y-auto select-none animate-in fade-in duration-150 font-sans">
      {/* TOP HEADER CONTROLS (MINIMAL BACK & CLOSE, LIFTED TO TOP) */}
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

      {/* 1. PROVIDER RUNTIMES GRID (OFFICIAL LOGOS + NAMES + MOUNTED BADGE) */}
      <div className="grid grid-cols-3 gap-1.5 mb-3 font-mono text-[10.5px]">
        {(Object.keys(PROVIDER_DATA) as LocalProvider[]).map((p) => {
          const isSelected = p === selectedProvider;
          const provInfo = PROVIDER_DATA[p];
          const ProvLogo = provInfo.logo;
          const provMounted = mountedModels.some((m) => m.provider === p);

          return (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
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

      {/* 2. SMALL WHITE TEXT: AVAILABLE MODELS AND COUNT */}
      <div className="mb-2 px-0.5 flex items-center justify-between">
        <span className="text-white text-[11px] font-medium tracking-tight">
          Available models ({provider.models.length})
        </span>
      </div>

      {/* 4. DETECTED MODELS LIST */}
      <div className="space-y-1.5 mb-3 flex-1">
        {provider.models.map((m) => {
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
                {/* WHITE LOGO BADGE */}
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center p-1 shadow-sm shrink-0 border border-white/20">
                  {getModelLogo(m.family)}
                </div>
                <div className="min-w-0 flex-1">
                  {/* BOLD WHITE MODEL NAME */}
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
                    {m.quantization} · {m.sizeGb} GB VRAM
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 5. MOUNT BUTTON (DISABLED IF PROVIDER IS ALREADY IN USE) */}
      <button
        disabled={isOccupied}
        onClick={handleMount}
        className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 ${
          isOccupied
            ? 'bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90 active:scale-[0.98] cursor-pointer'
        }`}
      >
        {isOccupied ? (
          <span>{provider.name} Already Active in Rack</span>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Mount {selectedModel?.displayName || 'Model'} to Rack</span>
          </>
        )}
      </button>
    </div>
  );
};
