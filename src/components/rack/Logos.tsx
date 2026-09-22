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
import Cohere from '@lobehub/icons/es/Cohere';
import BAAI from '@lobehub/icons/es/BAAI';
import Apple from '@lobehub/icons/es/Apple';
import HuggingFace from '@lobehub/icons/es/HuggingFace';

// ── 1. Official Provider Logos ──────────────────────────────────────────────

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

// ── 2. Top 10 Official Model Brand Logos ────────────────────────────────────

// 1. Qwen (Alibaba)
export const QwenLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Qwen.Color size={size} />
  </div>
);

// 2. DeepSeek
export const DeepSeekLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <DeepSeek.Color size={size} />
  </div>
);

// 3. Meta Llama
export const MetaLlamaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Meta.Color size={size} />
  </div>
);

// 4. Mistral AI / Codestral
export const MistralLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Mistral.Color size={size} />
  </div>
);

// 5. Microsoft Phi
export const MicrosoftPhiLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Microsoft.Color size={size} />
  </div>
);

// 6. Google DeepMind Gemma
export const GoogleGemmaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Gemma.Color size={size} />
  </div>
);

// 7. MiniCPM / OpenBMB
export const MiniCPMLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#10B981" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="4.5" fill="#10B981" />
    </svg>
  </div>
);

// 8. Cohere Command R
export const CohereLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <Cohere.Color size={size} />
  </div>
);

// 9. Hugging Face / StarCoder
export const StarCoderLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <HuggingFace.Color size={size} />
  </div>
);

// 10. BAAI BGE & Nomic (Embeddings & Rerankers)
export const BAAILogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <BAAI size={size} />
  </div>
);

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

// Foundational Audio (Whisper)
export const WhisperAudioLogo: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <div className={`inline-flex items-center justify-center shrink-0 ${className || ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10v4M6 7v10M9 4v16M12 2v20M15 4v16M18 7v10M21 10v4" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);
