import React from 'react';
import Ollama from '@lobehub/icons/es/Ollama';
import LmStudio from '@lobehub/icons/es/LmStudio';
import Vllm from '@lobehub/icons/es/Vllm';
import Unsloth from '@lobehub/icons/es/Unsloth';
import DeepSeek from '@lobehub/icons/es/DeepSeek';
import Qwen from '@lobehub/icons/es/Qwen';
import Mistral from '@lobehub/icons/es/Mistral';
import Meta from '@lobehub/icons/es/Meta';
import Gemma from '@lobehub/icons/es/Gemma';
import Microsoft from '@lobehub/icons/es/Microsoft';
import Yi from '@lobehub/icons/es/Yi';
import IBM from '@lobehub/icons/es/IBM';
import Nvidia from '@lobehub/icons/es/Nvidia';
import NousResearch from '@lobehub/icons/es/NousResearch';
import InternLM from '@lobehub/icons/es/InternLM';
import ChatGLM from '@lobehub/icons/es/ChatGLM';
import Stability from '@lobehub/icons/es/Stability';
import Snowflake from '@lobehub/icons/es/Snowflake';
import Baichuan from '@lobehub/icons/es/Baichuan';
import Minimax from '@lobehub/icons/es/Minimax';
import Moonshot from '@lobehub/icons/es/Moonshot';
import Stepfun from '@lobehub/icons/es/Stepfun';
import Dolphin from '@lobehub/icons/es/Dolphin';
import TII from '@lobehub/icons/es/TII';
import Rwkv from '@lobehub/icons/es/Rwkv';
import LLaVA from '@lobehub/icons/es/LLaVA';
import Cohere from '@lobehub/icons/es/Cohere';
import BAAI from '@lobehub/icons/es/BAAI';
import Apple from '@lobehub/icons/es/Apple';
import HuggingFace from '@lobehub/icons/es/HuggingFace';

// ── 1. Official Local Provider / Runner Logos ─────────────────────────────────

export const OllamaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Ollama size={size} />
  </div>
);

export const LMStudioLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <LmStudio.Avatar size={size} />
  </div>
);

export const VLLMLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Vllm.Color size={size} />
  </div>
);

export const UnslothLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Unsloth.Color size={size} />
  </div>
);

export const LlamaCppLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 520 560" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M520 379.733L437.016 523.6L436.53 523.295C419.667 546.213 392.788 560 363.942 560H104L188.773 413.061L208 379.733H520ZM208 379.733H0L98 209.866L170 85.0664C186.088 57.1805 215.835 40 248.029 40C251.186 40 254.289 40.1573 257.333 40.46L257.4 40H404L208 379.733Z"
        fill="#F65E00"
      />
    </svg>
  </div>
);

export const MLXLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Apple size={size} />
  </div>
);

// ── 2. Top 20+ Official Open-Weight Model Creator Logos ───────────────────────

// 1. Meta (Llama, CodeLlama)
export const MetaLlamaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Meta.Color size={size} />
  </div>
);

// 2. DeepSeek (DeepSeek-Coder, R1, V3)
export const DeepSeekLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <DeepSeek.Color size={size} />
  </div>
);

// 3. Alibaba (Qwen, QwQ)
export const QwenLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Qwen.Color size={size} />
  </div>
);

// 4. Mistral AI (Mistral, Mixtral, Codestral, Devstral)
export const MistralLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Mistral.Color size={size} />
  </div>
);

// 5. Google DeepMind (Gemma, CodeGemma)
export const GoogleGemmaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Gemma.Color size={size} />
  </div>
);

// 6. Microsoft (Phi-3, Phi-4)
export const MicrosoftPhiLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Microsoft.Color size={size} />
  </div>
);

// 7. 01.AI (Yi, Yi-Coder)
export const YiLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Yi.Color size={size} />
  </div>
);

// 8. IBM (Granite, Granite-Code)
export const IBMGraniteLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <IBM size={size} />
  </div>
);

// 9. NVIDIA (Nemotron)
export const NvidiaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Nvidia.Color size={size} />
  </div>
);

// 10. Nous Research (Hermes, Capybara)
export const NousResearchLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <NousResearch size={size} />
  </div>
);

// 11. InternLM / Shanghai AI Lab
export const InternLMLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <InternLM.Color size={size} />
  </div>
);

// 12. Zhipu AI / THUDM (GLM, ChatGLM)
export const ChatGLMLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <ChatGLM.Color size={size} />
  </div>
);

// 13. Stability AI (StableLM, Stable Code)
export const StabilityLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Stability.Color size={size} />
  </div>
);

// 14. Snowflake (Arctic)
export const SnowflakeLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Snowflake.Color size={size} />
  </div>
);

// 15. Baichuan AI
export const BaichuanLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Baichuan.Color size={size} />
  </div>
);

// 16. MiniMax
export const MinimaxLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Minimax.Color size={size} />
  </div>
);

// 17. Moonshot AI (Kimi)
export const MoonshotLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Moonshot size={size} />
  </div>
);

// 18. Stepfun
export const StepfunLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Stepfun size={size} />
  </div>
);

// 19. Cognitive Computations / Eric Hartford (Dolphin)
export const DolphinLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Dolphin size={size} />
  </div>
);

// 20. TII (Falcon)
export const TIILogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <TII.Color size={size} />
  </div>
);

// 21. RWKV
export const RwkvLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Rwkv.Color size={size} />
  </div>
);

// 22. LLaVA
export const LLaVALogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <LLaVA.Color size={size} />
  </div>
);

// 23. BigCode / Hugging Face (StarCoder)
export const StarCoderLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <HuggingFace.Color size={size} />
  </div>
);

// 24. Cohere (Command R)
export const CohereLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Cohere.Color size={size} />
  </div>
);

// 25. BAAI (BGE Embeddings & Rerankers)
export const BAAILogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <BAAI size={size} />
  </div>
);

// 26. MiniCPM / OpenBMB
export const MiniCPMLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4.5" fill="#10B981" />
    </svg>
  </div>
);

// 27. Nomic AI (Nomic Embed)
export const NomicEmbeddingLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="2.5" fill="#A855F7" />
      <circle cx="18" cy="6" r="2.5" fill="#A855F7" />
      <circle cx="12" cy="18" r="2.5" fill="#A855F7" />
      <path d="M6 6l6 12 6-12" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="2 2" />
    </svg>
  </div>
);

// 28. Whisper Audio
export const WhisperAudioLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10v4M6 7v10M9 4v16M12 2v20M15 4v16M18 7v10M21 10v4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

// ── 3. Provider Fallback Resolver ─────────────────────────────────────────────

export const getProviderLogo = (provider?: string, size: number = 16): React.ReactElement => {
  const p = (provider || '').toLowerCase();
  switch (p) {
    case 'lmstudio':
      return <LMStudioLogo size={size} />;
    case 'llamacpp':
      return <LlamaCppLogo size={size} />;
    case 'vllm':
      return <VLLMLogo size={size} />;
    case 'unsloth':
      return <UnslothLogo size={size} />;
    case 'mlx':
    case 'apple':
      return <MLXLogo size={size} />;
    case 'ollama':
    default:
      return <OllamaLogo size={size} />;
  }
};
