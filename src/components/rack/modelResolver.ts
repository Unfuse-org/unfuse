import { ModelRole, AvailableProviderModel, ModelFamily } from './types';

export interface ResolvedModelInfo {
  family: string;
  role: ModelRole;
  parameters: string;
  contextWindow: string;
  description: string;
  capabilities: string[];
  link: string;
}

export function normalizeFamilyForLogo(familyStr: string): ModelFamily {
  const f = familyStr.toLowerCase();
  if (f.includes('qwen')) return 'qwen';
  if (f.includes('deepseek')) return 'deepseek';
  if (f.includes('llama')) return 'llama';
  if (f.includes('mistral') || f.includes('mixtral') || f.includes('codestral') || f.includes('mathstral') || f.includes('devstral') || f.includes('ministral')) return 'mistral';
  if (f.includes('phi')) return 'phi';
  if (f.includes('gemma') || f.includes('codey')) return 'gemma';
  if (f.includes('cpm') || f.includes('minicpm')) return 'minicpm';
  if (f.includes('cohere') || f.includes('command')) return 'command-r';
  if (f.includes('starcoder') || f.includes('santacoder')) return 'starcoder';
  if (f.includes('bge') || f.includes('baai')) return 'bge';
  if (f.includes('nomic')) return 'nomic';
  if (f.includes('whisper')) return 'whisper';
  return 'custom';
}

export function inferRole(arg1: string | string[], arg2?: string): ModelRole {
  const name = (typeof arg1 === 'string' ? arg1 : arg2 || '').toLowerCase();
  if (name.includes('coder') || name.includes('code') || name.includes('starcoder') || name.includes('devstral')) return 'Coder';
  if (name.includes('embed') || name.includes('bge') || name.includes('nomic')) return 'Embeddings';
  if (name.includes('vision') || name.includes('vl') || name.includes('llava') || name.includes('omni') || name.includes('ocr')) return 'Vision / OCR';
  if (name.includes('r1') || name.includes('reason') || name.includes('think')) return 'Reasoning';
  if (name.includes('whisper') || name.includes('audio') || name.includes('voice')) return 'Audio';
  if (name.includes('rerank')) return 'Reranker';
  return 'General';
}

export function formatModelSubtitle(family: string, params: string, quantization?: string, ctx?: number): string {
  const parts: string[] = [];
  if (params && params !== 'Unknown Parameters') parts.push(params);
  if (quantization) parts.push(quantization);
  if (ctx) parts.push(`${ctx.toLocaleString()} ctx`);
  return parts.join(' · ') || `${family} local model`;
}

export function resolveModelInfo(model: AvailableProviderModel, provider: string): ResolvedModelInfo {
  const rawId = (model.id || model.name || '').toLowerCase();
  const family = model.family || normalizeFamilyForLogo(rawId);
  const role = model.defaultRole || inferRole(rawId);

  // Extract parameter size
  const paramMatch = rawId.match(/(\d+(?:\.\d+)?)[bB]/);
  const parameters = paramMatch ? `${paramMatch[1].toUpperCase()}B Parameters` : (model.parameters || 'Unknown Parameters');

  // Context window
  const ctxLength = model.contextLength || 4096;
  const contextWindow = `${ctxLength.toLocaleString()} tokens`;

  // Description
  const description = model.description || formatModelSubtitle(family, parameters, model.quantization, ctxLength);

  // Capabilities
  const capabilities = model.capabilities || ['completion'];

  // Link
  let link = model.link || '';
  if (!link) {
    if (provider === 'ollama') {
      const cleanName = model.name.split(':')[0];
      link = `https://ollama.com/library/${cleanName}`;
    } else if (rawId.includes('/')) {
      link = `https://huggingface.co/${model.id}`;
    } else {
      link = `https://huggingface.co/models?search=${encodeURIComponent(model.name || model.displayName || '')}`;
    }
  }

  return {
    family,
    role,
    parameters,
    contextWindow,
    description,
    capabilities,
    link,
  };
}
