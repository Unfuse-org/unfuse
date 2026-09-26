import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Cpu,
  Sparkles,
  Zap,
  ArrowRight,
  Check,
  KeyRound,
  Terminal,
  Activity,
  ChevronRight,
  Globe,
  Layers,
  Paperclip,
  Loader2,
  Copy,
  CheckCheck,
  Radio,
  RefreshCw,
} from 'lucide-react';
import {
  OllamaLogo,
  LMStudioLogo,
  VLLMLogo,
  UnslothLogo,
  LlamaCppLogo,
  MLXLogo,
} from '../rack/Logos';
import { getModelLogo } from '../rack/MountModelView';
import unfuseLogo from '../../assets/logo.png';
import { inferRole, normalizeFamilyForLogo } from '../rack/modelResolver';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetectedModel {
  id: string;
  name: string;
  provider: string;
  size: string;
  family: string;
  quant?: string;
  role: string;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const [scanStatus, setScanStatus] = useState<{
    ollama: boolean;
    lmstudio: boolean;
    mlx: boolean;
    vllm: boolean;
    unsloth: boolean;
    llamacpp: boolean;
  }>({
    ollama: false,
    lmstudio: false,
    mlx: false,
    vllm: false,
    unsloth: false,
    llamacpp: false,
  });

  const [detectedModels, setDetectedModels] = useState<DetectedModel[]>([]);
  const [selectedTier, setSelectedTier] = useState<'free' | 'pro'>('free');
  const [proLicenseKey, setProLicenseKey] = useState('');
  const [licenseActivated, setLicenseActivated] = useState(false);

  useEffect(() => {
    if (step === 2) {
      runEngineScan();
    }
  }, [step]);

  const runEngineScan = async () => {
    setIsScanning(true);
    setDetectedModels([]);

    // Live probe attempt
    let foundOllama = false;
    let foundVllm = false;
    const modelsFound: DetectedModel[] = [];

    try {
      const ollamaRes = await fetch('http://127.0.0.1:11434/api/tags', { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (ollamaRes.ok) {
        foundOllama = true;
        const data = await ollamaRes.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          data.models.forEach((m: any) => {
            const mName = m.name || m.model;
            const fam = m.details?.family || 'unknown';
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'Ollama',
              size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Local',
              family: fam,
              quant: m.details?.quantization_level || 'Q4_K_M',
              role: inferRole([], mName),
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    let foundLmStudio = false;
    try {
      const lmRes = await fetch('http://127.0.0.1:1234/v1/models', { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (lmRes.ok) {
        foundLmStudio = true;
        const data = await lmRes.json();
        const arr = data.data || data.models || [];
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach((m: any) => {
            const mName = m.id || m.name;
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'LM Studio',
              size: 'Loaded in VRAM',
              family: normalizeFamilyForLogo(mName),
              role: inferRole(mName),
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    let foundMlx = false;
    for (const mlxPort of [8080, 8081, 8088]) {
      try {
        const mlxRes = await fetch(`http://127.0.0.1:${mlxPort}/v1/models`, { method: 'GET', signal: AbortSignal.timeout(1500) });
        if (mlxRes.ok) {
          foundMlx = true;
          const data = await mlxRes.json();
          const arr = data.data || data.models || [];
          if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((m: any) => {
              const mName = m.id || m.name;
              modelsFound.push({
                id: mName,
                name: mName,
                provider: 'Apple MLX',
                size: 'Unified Memory',
                family: normalizeFamilyForLogo(mName),
                role: inferRole(mName),
              });
            });
            break;
          }
        }
      } catch {
        // Try next port
      }
    }

    let foundLlamaCpp = false;
    try {
      const llamaRes = await fetch('http://127.0.0.1:8080/v1/models', { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (llamaRes.ok) {
        foundLlamaCpp = true;
        const data = await llamaRes.json();
        const arr = data.data || data.models || [];
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach((m: any) => {
            const mName = m.id || m.name;
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'llama.cpp',
              size: 'GGUF Matrix',
              family: normalizeFamilyForLogo(mName),
              role: inferRole(mName),
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    let foundUnsloth = false;
    try {
      const unslothRes = await fetch('http://127.0.0.1:8888/v1/models', { method: 'GET', signal: AbortSignal.timeout(2000) });
      if (unslothRes.ok) {
        foundUnsloth = true;
        const data = await unslothRes.json();
        const arr = data.data || data.models || [];
        if (Array.isArray(arr) && arr.length > 0) {
          arr.forEach((m: any) => {
            const mName = m.id || m.name;
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'Unsloth',
              size: 'Loaded in VRAM',
              family: normalizeFamilyForLogo(mName),
              role: inferRole(mName),
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    setScanStatus({
      ollama: foundOllama,
      lmstudio: foundLmStudio,
      mlx: foundMlx,
      vllm: foundVllm,
      unsloth: foundUnsloth,
      llamacpp: foundLlamaCpp,
    });
    setDetectedModels(modelsFound);
    setIsScanning(false);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('ollama run <model-name>');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleActivatePro = () => {
    if (proLicenseKey.trim().length >= 8) {
      setLicenseActivated(true);
      setSelectedTier('pro');
    }
  };

  const handleFinish = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('unfuse_onboarding_completed', 'true');
    }
    onClose();
  };

  if (!isOpen) return null;

  // 6 OFFICIAL PROVIDERS FOR THE MOVING FADING MARQUEE TICKER
  const providersList = [
    { id: 'ollama', name: 'Ollama', port: '11434', logo: OllamaLogo, color: 'text-white' },
    { id: 'lmstudio', name: 'LM Studio', port: '1234', logo: LMStudioLogo, color: 'text-purple-400' },
    { id: 'mlx', name: 'Apple MLX', port: '8088', logo: MLXLogo, color: 'text-orange-400' },
    { id: 'vllm', name: 'vLLM', port: '8000', logo: VLLMLogo, color: 'text-sky-400' },
    { id: 'unsloth', name: 'Unsloth', port: '8888', logo: UnslothLogo, color: 'text-amber-300' },
    { id: 'llamacpp', name: 'llama.cpp', port: '8080', logo: LlamaCppLogo, color: 'text-orange-400' },
  ];

  // Helper to render model brand icon
  const renderFamilyLogo = (fam: string, provider?: string) => {
    return getModelLogo(fam, provider, 16);
  };

  // STEP 1: PURE FULLSCREEN BLACK BACKGROUND WITH BIG PIXEL UNFUSE, SLANTED LOGO & GET STARTED BUTTON ONLY
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none p-6 animate-in fade-in duration-200">
        <div className="flex flex-col items-center gap-10">
          {/* BIG ASS UNFUSE PIXEL HEADLINE WITH SLANTED FLOATING LOGO */}
          <div className="relative inline-block">
            <h1 className="font-pixel text-5xl sm:text-7xl md:text-8xl font-bold tracking-wider text-white select-none leading-none">
              Unfuse
            </h1>

            {/* FLOATING SLANTED OCTO LOGO ON TOP OF LETTERS SHIFTED ASIDE */}
            <div className="absolute -top-7 -right-12 sm:-top-10 sm:-right-16 md:-top-13 md:-right-20 transform -rotate-12 pointer-events-none">
              <img
                src={unfuseLogo}
                alt="Unfuse Logo"
                className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain mix-blend-screen"
              />
            </div>
          </div>

          {/* DOWNSIDE: SMALL GET STARTED WHITE BUTTON */}
          <div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: PURE FULLSCREEN BLACK - ONLY FLOATING LOGOS, PIXEL TEXT, AND DETECTED MODELS
  if (step === 2) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none p-6 animate-in fade-in duration-200">
        <div className="w-full max-w-xl flex flex-col items-center text-center gap-8">
          {/* PIXEL STATUS TEXT ABOVE */}
          <div className="flex flex-col items-center gap-2">
            <h2 className="font-pixel text-xs sm:text-sm tracking-wider text-white">
              {isScanning
                ? 'SEARCHING PORTS...'
                : detectedModels.length > 0
                  ? `DISCOVERED ${detectedModels.length} MODEL${detectedModels.length > 1 ? 'S' : ''}...`
                  : 'NO LOCAL PORTS OPEN'}
            </h2>
          </div>

          {/* 6 FLOATING LOGOS HORIZONTALLY (NO BOUNDARIES, NO GREEN LIGHTS, NO BOXES) */}
          <div className="relative w-full overflow-hidden py-4">
            {/* Left & Right pure black fade masks */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black via-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black via-black to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee gap-10 items-center justify-center">
              {[...providersList, ...providersList].map((p, idx) => {
                const LogoComponent = p.logo;
                return (
                  <div
                    key={`${p.id}-${idx}`}
                    className="flex items-center gap-2.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
                  >
                    <LogoComponent size={28} />
                    <span className="text-xs font-semibold text-white/90">{p.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIST OF MODELS (CLEAN LIST, NO BOXES) */}
          {!isScanning && (
            <div className="w-full space-y-4 animate-in fade-in duration-300">
              {detectedModels.length > 0 ? (
                <div className="w-full space-y-2 px-4">
                  {detectedModels.slice(0, 4).map((model) => (
                    <div
                      key={model.id}
                      className="flex items-center justify-between py-2 border-b border-white/[0.08]"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="shrink-0">{renderFamilyLogo(model.family, model.provider)}</div>
                        <div>
                          <div className="text-xs font-semibold text-white">{model.name}</div>
                          <div className="text-[10px] text-white/40 font-mono">
                            {model.provider} • {model.size}
                          </div>
                        </div>
                      </div>
                      <span className="font-pixel text-[9px] text-white/70">READY</span>
                    </div>
                  ))}

                  {detectedModels.length > 4 && (
                    <div className="pt-2 text-center">
                      <span className="font-mono text-[11px] text-white/40 tracking-wide">
                        + {detectedModels.length - 4} more models in rack
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs text-white/50">
                    Run this in terminal to load your first model:
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCommand}
                    className="font-mono text-xs text-white bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <span>ollama run &lt;model-name&gt;</span>
                    {copiedCmd ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              )}

              {/* DOWNSIDE: SMALL GET STARTED / CONTINUE WHITE BUTTON */}
              <div className="pt-4 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: PURE FULLSCREEN BLACK - PRO LICENSE KEY INPUT (NO GREEN BORDERS, NO BOXES)
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-8">
        {/* PIXEL STATUS TEXT ABOVE */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="font-pixel text-xs sm:text-sm tracking-wider text-white">
            ENTER PRO LICENSE KEY
          </h2>
        </div>

        {/* MINIMALIST LICENSE KEY INPUT */}
        <div className="w-full flex flex-col items-center gap-4">
          <input
            type="text"
            value={proLicenseKey}
            onChange={(e) => setProLicenseKey(e.target.value)}
            placeholder="PRO-XXXX-XXXX"
            className="w-full max-w-xs h-10 px-4 bg-transparent border-b border-white/30 focus:border-white text-white font-mono text-sm text-center tracking-widest outline-none transition-colors placeholder:text-white/20"
            autoFocus
          />

          {licenseActivated && (
            <span className="font-pixel text-[10px] text-white">
              PRO UNLOCKED
            </span>
          )}
        </div>

        {/* DOWNSIDE: SMALL GET STARTED / LAUNCH WHITE BUTTON */}
        <div className="pt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (proLicenseKey.trim().length >= 8) {
                handleActivatePro();
              }
              handleFinish();
            }}
            className="px-5 py-2 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span>{proLicenseKey.trim().length >= 8 ? 'Activate & Launch' : 'Launch Unfuse'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

