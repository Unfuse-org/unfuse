import { ModelFamily, ModelRole, AvailableProviderModel } from './types';

export interface ResolvedModelInfo {
  family: ModelFamily;
  role: ModelRole;
  parameters: string;
  contextWindow: string;
  description: string;
  capabilities: string[];
  link: string;
}

/**
 * Universal dynamic resolver that parses any local model name/ID
 * to extract family logo, role, parameter count, capabilities, and Hub documentation.
 */
export function resolveModelInfo(model: AvailableProviderModel, provider: string): ResolvedModelInfo {
  const rawId = (model.id || model.name || '').toLowerCase();
  const rawDisplay = (model.displayName || '').toLowerCase();
  const combined = `${rawId} ${rawDisplay}`;

  // 1. Resolve Model Family & Brand
  let family: ModelFamily = model.family || 'custom';
  if (/qwen/i.test(combined)) family = 'qwen';
  else if (/deepseek/i.test(combined)) family = 'deepseek';
  else if (/llama/i.test(combined)) family = 'llama';
  else if (/mistral|codestral|mixtral/i.test(combined)) family = 'mistral';
  else if (/phi/i.test(combined)) family = 'phi';
  else if (/gemma/i.test(combined)) family = 'gemma';
  else if (/minicpm/i.test(combined)) family = 'minicpm';
  else if (/command|cohere/i.test(combined)) family = 'cohere';
  else if (/starcoder|bigcode/i.test(combined)) family = 'starcoder';
  else if (/bge|baai/i.test(combined)) family = 'baai';
  else if (/nomic/i.test(combined)) family = 'nomic';
  else if (/whisper/i.test(combined)) family = 'whisper';

  // 2. Resolve Model Pipeline Role & Official Capabilities
  let role: ModelRole = model.defaultRole || 'General';
  let officialCapabilities: string[] = [];

  if (family === 'qwen') {
    if (/coder/i.test(combined)) {
      role = 'Coder';
      officialCapabilities = [
        'Code Generation & Synthesis (92+ Languages)',
        'Repository-Level Code Reasoning',
        'Code Refactoring & Defect Repair',
        'Structured Outputs & Tool / Function Calling',
        'Long-Context Codebase Comprehension (128K)',
      ];
    } else if (/vl|vision/i.test(combined)) {
      role = 'Vision / OCR';
      officialCapabilities = [
        'Dynamic Resolution Visual Processing',
        'Multi-Image & Video Sequence Understanding',
        'Dense Document OCR & Structured Chart Parsing',
        'High-Precision Visual Grounding (2D / 3D Boxes)',
      ];
    } else {
      role = 'General';
      officialCapabilities = [
        'Multi-Lingual Instruction Following',
        'Mathematical Reasoning & Logic Synthesis',
        'Native Tool & Function Calling',
        'Long-Context Document Retrieval (128K)',
      ];
    }
  } else if (family === 'deepseek') {
    role = 'Reasoning';
    officialCapabilities = [
      'Large-Scale Reinforcement Learning (RL) Reasoning',
      'Chain-of-Thought (CoT) Deep Problem Solving',
      'Self-Verification & Reflection Loops',
      'Frontier Mathematics & Formal Logic',
      'Competitive Programming Synthesis',
    ];
  } else if (family === 'llama') {
    role = 'General';
    officialCapabilities = [
      'Multilingual Instruction Following (8+ Languages)',
      'Long-Context Document Synthesis (128K)',
      'Agentic Tool & Function Execution',
      'Advanced Mathematics & Code Synthesis',
      'High-Density Knowledge Retrieval',
    ];
  } else if (family === 'mistral') {
    role = 'General';
    officialCapabilities = [
      'Native Slump-Free 128K Context Window',
      'Advanced Multi-Turn Function Calling',
      'Strict JSON Mode & Structured Outputs',
      'High-Efficiency Sliding Window Attention',
      'Cross-Lingual Reasoning & Translation',
    ];
  } else if (family === 'phi') {
    role = 'Coder';
    officialCapabilities = [
      'Synthetic High-Signal Data Reasoning',
      'Complex Mathematics & Scientific Logic',
      'Multi-Hop Reasoning & Knowledge Synthesis',
      'High Throughput Low-Footprint Architecture',
    ];
  } else if (family === 'gemma') {
    role = 'General';
    officialCapabilities = [
      'Gemini 1.5 Architecture Research Distillation',
      'Sliding Window & Local/Global Attention',
      'Advanced Knowledge Reasoning & Math',
      'Safe & Responsible Multi-Turn Alignment',
    ];
  } else if (family === 'minicpm') {
    role = 'Vision / OCR';
    officialCapabilities = [
      'Dense Document OCR & Handwritten Text',
      'Multi-Image Contextual Reasoning',
      'Real-Time Video Stream Understanding',
      'End-Side High Efficiency Vision-Language',
    ];
  } else if (family === 'cohere') {
    role = 'General';
    officialCapabilities = [
      'High-Precision Retrieval Augmented Generation (RAG)',
      'Multi-Step Agent Tool Use & Connectors',
      'Enterprise Conversational Workflow',
      'Citation & Source Grounding',
    ];
  } else if (family === 'starcoder') {
    role = 'Coder';
    officialCapabilities = [
      'Trained on The Stack v2 (600+ Languages)',
      'Full Repository Infilling & Autocomplete',
      'Git Commit & Pull Request Synthesis',
      'Compiler Diagnostic Code Correction',
    ];
  } else if (family === 'nomic') {
    role = 'Embeddings';
    officialCapabilities = [
      'Matryoshka 2D Dimensional Truncation',
      '8,192 Token Long-Document Embeddings',
      'Dense Semantic Search & Vector Clustering',
      'Zero-Shot Cross-Domain Information Retrieval',
    ];
  } else if (family === 'baai') {
    role = 'Reranker';
    officialCapabilities = [
      'Cross-Encoder Passage Relevance Scoring',
      'Precision Re-Ranking for RAG Pipelines',
      'Dense Semantic & Lexical Fusion Scoring',
    ];
  } else if (family === 'whisper') {
    role = 'Audio';
    officialCapabilities = [
      'Multilingual Automatic Speech Recognition (ASR)',
      'Word-Level Timestamp Alignment',
      'Direct Speech-to-Text Translation',
      'Robust Acoustic Noise Handling',
    ];
  } else {
    role = 'General';
    officialCapabilities = [
      'Natural Language Understanding',
      'Multi-Turn Dialog & Instruction Execution',
      'Zero-Cloud Offline Private Inference',
    ];
  }

  // 3. Extract Parameter Count (e.g. 70b, 32b, 14b, 8b, 1.5b)
  const paramMatch = combined.match(/(\d+(?:\.\d+)?)\s*[bm]/i);
  const parameters = paramMatch ? `${paramMatch[1].toUpperCase()}${paramMatch[0].slice(-1).toUpperCase()} Parameters` : 'Multi-Billion Parameters';

  // 4. Extract or Estimate Context Window
  let contextWindow = '32,768 tokens';
  if (/128k/i.test(combined) || /command|nemo|llama3/i.test(combined)) {
    contextWindow = '128,000 tokens';
  } else if (/64k|65k/i.test(combined) || /r1|qwen2\.5/i.test(combined)) {
    contextWindow = '65,536 tokens';
  } else if (/8k/i.test(combined) || /embed|minicpm|gemma/i.test(combined)) {
    contextWindow = '8,192 tokens';
  } else if (/512/i.test(combined) || /rerank/i.test(combined)) {
    contextWindow = '512 tokens';
  }

  // 5. Generate Official Provider Description
  let description = model.description || '';
  if (!description) {
    if (family === 'qwen') {
      if (/coder/i.test(combined)) {
        description = `Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models, bringing significant improvements in code generation, code reasoning, and code fixing based on strong foundation capabilities across 92+ programming languages.`;
      } else if (/vl|vision/i.test(combined)) {
        description = `Qwen2.5-VL is Alibaba's flagship vision-language model featuring dynamic resolution visual processing, document parsing, and high-accuracy visual grounding.`;
      } else {
        description = `Qwen2.5 is Alibaba Cloud's flagship open-weight foundational model family, delivering state-of-the-art natural language comprehension, mathematics, coding, and long-context reasoning.`;
      }
    } else if (family === 'deepseek') {
      description = `DeepSeek-R1 is an open-source reasoning model trained using large-scale reinforcement learning (RL) without supervised fine-tuning (SFT) as a preliminary step, demonstrating frontier performance on mathematics, code, and complex reasoning tasks.`;
    } else if (family === 'llama') {
      description = `Llama 3.3 70B is an instruction-tuned generative model developed by Meta, delivering industry-leading performance on reasoning, coding, and multilingual knowledge synthesis matching previous-generation frontier flagship models.`;
    } else if (family === 'mistral') {
      description = `Mistral Nemo is a 12B state-of-the-art multilingual model built in collaboration between Mistral AI and NVIDIA, featuring a 128k context window and trained with native support for function calling and structured outputs.`;
    } else if (family === 'phi') {
      description = `Phi-4 is a 14B state-of-the-art open model from Microsoft focused on high-density reasoning, mathematics, science, and coding, trained using high-signal synthetic datasets and curated organic web data.`;
    } else if (family === 'gemma') {
      description = `Gemma 2 is Google DeepMind's lightweight, state-of-the-art open model family built from the same research and technology used to create the Gemini models, featuring sliding window attention and knowledge distillation.`;
    } else if (family === 'minicpm') {
      description = `MiniCPM-V 2.6 is OpenBMB's leading edge multimodal vision-language model for end-side devices, surpassing proprietary models in OCR, single/multi-image understanding, and dense video reasoning.`;
    } else if (family === 'cohere') {
      description = `Command R is a scalable large language model optimized for conversational interaction, long-context retrieval augmented generation (RAG), tool use, and enterprise reasoning.`;
    } else if (family === 'starcoder') {
      description = `StarCoder2 is a next-generation open code LLM developed by BigCode, trained on The Stack v2 across 600+ programming languages with native repository-level context understanding.`;
    } else if (family === 'nomic') {
      description = `Nomic Embed Text is an advanced text embedding model with an 8k context length, supporting flexible dimensional truncation and high-performance dense semantic retrieval.`;
    } else if (family === 'baai') {
      description = `BGE Reranker is an advanced cross-encoder model developed by Beijing Academy of Artificial Intelligence (BAAI), optimizing search ranking and RAG retrieval accuracy.`;
    } else if (family === 'whisper') {
      description = `Whisper Large v3 is OpenAI's foundation speech recognition and translation model trained on 680,000 hours of multilingual and multitask supervised web data.`;
    } else {
      description = `High-efficiency local model served directly via ${provider.toUpperCase()} runtime for zero-cloud, privacy-preserving offline inference.`;
    }
  }

  // 6. Generate Official Model Hub Link
  let link = model.link || '';
  if (!link) {
    if (provider === 'ollama') {
      const cleanName = model.name.split(':')[0];
      link = `https://ollama.com/library/${cleanName}`;
    } else if (rawId.includes('/')) {
      link = `https://huggingface.co/${model.id}`;
    } else {
      link = `https://huggingface.co/models?search=${encodeURIComponent(model.name || model.displayName)}`;
    }
  }

  return {
    family,
    role,
    parameters,
    contextWindow,
    description,
    capabilities: model.capabilities && model.capabilities.length > 0 ? model.capabilities : officialCapabilities,
    link,
  };
}
