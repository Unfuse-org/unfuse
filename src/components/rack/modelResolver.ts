import { AvailableProviderModel, ModelFamily } from './types';

export interface ResolvedModelInfo {
  family: string;
  parameters: string;
  contextWindow: string;
  description: string;
  link: string;
}

export function normalizeFamilyForLogo(familyStr: string): ModelFamily {
  const f = familyStr.toLowerCase();
  if (f.includes('qwen') || f.includes('qwq')) return 'qwen';
  if (f.includes('deepseek')) return 'deepseek';
  if (f.includes('llama')) return 'llama';
  if (f.includes('mistral') || f.includes('mixtral') || f.includes('codestral') || f.includes('mathstral') || f.includes('devstral') || f.includes('ministral')) return 'mistral';
  if (f.includes('phi')) return 'phi';
  if (f.includes('gemma') || f.includes('codey')) return 'gemma';
  if (f.includes('yi') && !f.includes('whisper')) return 'yi';
  if (f.includes('granite')) return 'granite';
  if (f.includes('nemotron') || f.includes('megatron') || f.includes('nvidia')) return 'nvidia';
  if (f.includes('hermes') || f.includes('nous')) return 'nous';
  if (f.includes('internlm') || f.includes('internvl')) return 'internlm';
  if (f.includes('glm') || f.includes('chatglm') || f.includes('zhipu')) return 'glm';
  if (f.includes('stablelm') || f.includes('stable-code') || f.includes('stability')) return 'stability';
  if (f.includes('arctic') || f.includes('snowflake')) return 'snowflake';
  if (f.includes('baichuan')) return 'baichuan';
  if (f.includes('minimax')) return 'minimax';
  if (f.includes('moonshot') || f.includes('kimi')) return 'moonshot';
  if (f.includes('stepfun')) return 'stepfun';
  if (f.includes('dolphin')) return 'dolphin';
  if (f.includes('falcon') || f.includes('tii')) return 'falcon';
  if (f.includes('rwkv')) return 'rwkv';
  if (f.includes('llava')) return 'llava';
  if (f.includes('cpm') || f.includes('minicpm')) return 'minicpm';
  if (f.includes('cohere') || f.includes('command')) return 'command-r';
  if (f.includes('starcoder') || f.includes('santacoder') || f.includes('bigcode')) return 'starcoder';
  if (f.includes('bge') || f.includes('baai')) return 'bge';
  if (f.includes('nomic')) return 'nomic';
  if (f.includes('whisper')) return 'whisper';
  if (f.includes('unsloth')) return 'unsloth';
  return 'custom';
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

  // Extract parameter size
  const paramMatch = rawId.match(/(\d+(?:\.\d+)?)[bB]/);
  const parameters = paramMatch ? `${paramMatch[1].toUpperCase()}B Parameters` : (model.parameters || 'Unknown Parameters');

  // Context window
  const ctxLength = model.contextLength || 4096;
  const contextWindow = `${ctxLength.toLocaleString()} tokens`;

  // Description
  const description = model.description || formatModelSubtitle(family, parameters, model.quantization, ctxLength);

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
    parameters,
    contextWindow,
    description,
    link,
  };
}
