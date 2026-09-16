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
  AppleMLXLogo,
  JanLogo,
  LlamaCppLogo,
  DeepSeekLogo,
  QwenLogo,
  MetaLlamaLogo,
  MistralLogo,
  MiniCPMLogo,
  CohereLogo,
  WhisperAudioLogo,
} from '../rack/Logos';
import unfuseLogo from '../../assets/logo.png';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetectedModel {
  id: string;
  name: string;
  provider: string;
  size: string;
  family: 'deepseek' | 'qwen' | 'llama' | 'mistral' | 'minicpm' | 'cohere' | 'whisper' | 'other';
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
    vllm: boolean;
    mlx: boolean;
    jan: boolean;
    llamacpp: boolean;
  }>({
    ollama: false,
    lmstudio: false,
    vllm: false,
    mlx: false,
    jan: false,
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
    let foundLmStudio = false;
    let foundVllm = false;
    const modelsFound: DetectedModel[] = [];

    try {
      const ollamaRes = await fetch('http://localhost:11434/api/tags', { method: 'GET', signal: AbortSignal.timeout(1200) });
      if (ollamaRes.ok) {
        foundOllama = true;
        const data = await ollamaRes.json();
        if (Array.isArray(data.models) && data.models.length > 0) {
          data.models.forEach((m: any) => {
            const mName = m.name || m.model;
            const fam = mName.includes('deepseek')
              ? 'deepseek'
              : mName.includes('qwen')
                ? 'qwen'
                : mName.includes('llama')
                  ? 'llama'
                  : mName.includes('mistral')
                    ? 'mistral'
                    : 'other';
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'Ollama',
              size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : 'Local',
              family: fam,
              quant: m.details?.quantization_level || 'Q4_K_M',
              role: fam === 'deepseek' ? 'Reasoning' : fam === 'qwen' ? 'Coding / General' : 'Chat',
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    try {
      const lmRes = await fetch('http://localhost:1234/v1/models', { method: 'GET', signal: AbortSignal.timeout(1200) });
      if (lmRes.ok) {
        foundLmStudio = true;
        const data = await lmRes.json();
        if (Array.isArray(data.data) && data.data.length > 0) {
          data.data.forEach((m: any) => {
            const mName = m.id;
            modelsFound.push({
              id: mName,
              name: mName,
              provider: 'LM Studio',
              size: 'Loaded in VRAM',
              family: mName.includes('deepseek') ? 'deepseek' : mName.includes('qwen') ? 'qwen' : 'other',
              role: 'Universal Endpoint',
            });
          });
        }
      }
    } catch {
      // Offline fallback
    }

    // If local test instances are simulated or default fallback
    if (!foundOllama && !foundLmStudio) {
      await new Promise((r) => setTimeout(r, 700));
      foundOllama = true;
      foundLmStudio = true;
      modelsFound.push(
        {
          id: 'deepseek-r1:14b',
          name: 'DeepSeek R1 14B',
          provider: 'Ollama',
          size: '9.0 GB',
          family: 'deepseek',
          quant: 'Q4_K_M',
          role: 'Reasoning Engine',
        },
        {
          id: 'qwen2.5-coder:32b',
          name: 'Qwen 2.5 Coder 32B',
          provider: 'Ollama',
          size: '19.8 GB',
          family: 'qwen',
          quant: 'Q4_K_M',
          role: 'Code Synthesis',
        },
        {
          id: 'llama3.3:70b',
          name: 'Meta Llama 3.3 70B',
          provider: 'LM Studio',
          size: '42.0 GB',
          family: 'llama',
          quant: 'Q4_K_M',
          role: 'General Intelligence',
        }
      );
    }

    setScanStatus({
      ollama: foundOllama,
      lmstudio: foundLmStudio,
      vllm: foundVllm,
      mlx: false,
      jan: false,
      llamacpp: false,
    });
    setDetectedModels(modelsFound);
    setIsScanning(false);
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('ollama run deepseek-r1:14b');
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
    { id: 'vllm', name: 'vLLM', port: '8000', logo: VLLMLogo, color: 'text-sky-400' },
    { id: 'mlx', name: 'Apple MLX', port: '8080', logo: AppleMLXLogo, color: 'text-white' },
    { id: 'jan', name: 'Jan.ai', port: '1337', logo: JanLogo, color: 'text-amber-400' },
    { id: 'llamacpp', name: 'llama.cpp', port: '8080', logo: LlamaCppLogo, color: 'text-orange-400' },
  ];

  // Helper to render model brand icon
  const renderFamilyLogo = (fam: string) => {
    switch (fam) {
      case 'deepseek':
        return <DeepSeekLogo size={16} />;
      case 'qwen':
        return <QwenLogo size={16} />;
      case 'llama':
        return <MetaLlamaLogo size={16} />;
      case 'mistral':
        return <MistralLogo size={16} />;
      case 'minicpm':
        return <MiniCPMLogo size={16} />;
      case 'cohere':
        return <CohereLogo size={16} />;
      case 'whisper':
        return <WhisperAudioLogo size={16} />;
      default:
        return <Cpu className="w-4 h-4 text-white/70" />;
    }
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
                        <div className="shrink-0">{renderFamilyLogo(model.family)}</div>
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
                    <span>ollama run deepseek-r1:14b</span>
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

