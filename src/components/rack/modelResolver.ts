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

// Display identity only: these mappings never determine roles or inference capabilities.
const logoFamilies: Record<string, string> = {
  qwen2: 'qwen', qwen3: 'qwen', qwen35: 'qwen', qwen3next: 'qwen', deepseek2: 'deepseek', deepseek3: 'deepseek',
  llama: 'meta', gemma2: 'gemma', gemma3: 'gemma', gemma4: 'gemma', phi: 'microsoft', phi3: 'microsoft', phi4: 'microsoft',
  granite: 'ibm', nemotron: 'nvidia', olmo: 'ai2', falcon: 'tii', hermes: 'nousresearch', kimi: 'moonshot', glm: 'chatglm',
  exaone: 'lg', solar: 'upstage', jamba: 'ai21', bge: 'baai', arctic: 'snowflake', smollm: 'huggingface', openelm: 'apple',
};
const logoPublishers: Record<string, string> = {
  qwen: 'qwen', 'deepseek-ai': 'deepseek', 'meta-llama': 'meta', microsoft: 'microsoft', mistralai: 'mistral',
  'zai-org': 'chatglm', 'thudm': 'chatglm', moonshotai: 'moonshot', minimaxai: 'minimax', '01-ai': 'yi', baichuaninc: 'baichuan',
  internlm: 'internlm', nousresearch: 'nousresearch', dphnai: 'dolphin', 'tiiuae': 'tii', 'rwkv': 'rwkv', allenai: 'ai2',
  'ibm-granite': 'ibm', nvidia: 'nvidia', cohereforai: 'cohere', databricks: 'dbrx', ai21labs: 'ai21', 'arcee-ai': 'arcee',
  liquidai: 'liquid', huggingfacetb: 'huggingface', baai: 'baai', 'jinaai': 'jina', snowflake: 'snowflake', openchat: 'openchat',
  tencent: 'hunyuan', baidu: 'wenxin', xiaomimimo: 'xiaomimimo', 'meituan-longcat': 'longcat', 'stepfun-ai': 'stepfun',
  skywork: 'skywork', deepcogito: 'deepcogito', 'lgai-exaone': 'lg', openai: 'openai', stabilityai: 'stability',
  'black-forest-labs': 'flux', 'kwai-kolors': 'kolors', 'codegeex': 'codegeex', 'essentialai': 'essentialai',
  'sensetime': 'sensenova', upstage: 'upstage', apple: 'apple', alephalpha: 'alephalpha',
};
const logoNames: Record<string, string[]> = {
  qwen: ['qwen', 'qwq', 'qvq'], deepseek: ['deepseek'], meta: ['llama', 'codellama', 'llama-guard'], gemma: ['gemma', 'codegemma', 'recurrentgemma', 'embeddinggemma'],
  microsoft: ['phi'], mistral: ['mistral', 'mixtral', 'codestral', 'devstral', 'ministral', 'mathstral', 'magistral', 'pixtral', 'voxtral'],
  chatglm: ['chatglm', 'glm'], moonshot: ['kimi', 'moonshot'], minimax: ['minimax'], yi: ['yi'], baichuan: ['baichuan'],
  internlm: ['internlm', 'internvl'], nousresearch: ['hermes', 'nous-hermes', 'nous'], dolphin: ['dolphin'], tii: ['falcon'], rwkv: ['rwkv'],
  ai2: ['olmo', 'olmoe', 'molmo'], ibm: ['granite'], nvidia: ['nemotron', 'llama-nemotron', 'nvidia-nemotron'], cohere: ['command'],
  aya: ['aya'], dbrx: ['dbrx'], ai21: ['jamba'], arcee: ['arcee'], liquid: ['lfm', 'liquid'], huggingface: ['smollm'],
  baai: ['bge'], jina: ['jina'], snowflake: ['arctic', 'snowflake-arctic'], openchat: ['openchat'], hunyuan: ['hunyuan'],
  wenxin: ['ernie', 'wenxin'], xiaomimimo: ['mimo', 'xiaomi-mimo'], longcat: ['longcat'], stepfun: ['step', 'stepfun'],
  skywork: ['skywork'], deepcogito: ['cogito', 'deepcogito'], lg: ['exaone'], openai: ['gpt-oss'], stability: ['stable-diffusion', 'stablelm', 'stable-code', 'sdxl'],
  flux: ['flux'], cogview: ['cogview'], kolors: ['kolors'], codegeex: ['codegeex'], bilibiliindex: ['index'],
  essentialai: ['rnj', 'essentialai'], sensenova: ['sensenova', 'sensenova-u1'], upstage: ['solar'], apple: ['openelm'], alephalpha: ['pharia', 'luminous'],
};

export function resolveModelLogoKey(family: string, modelId?: string): string | undefined {
  const parts = (modelId ?? '').toLowerCase().split('/').filter(Boolean);
  const name = parts[parts.length - 1]?.split(':')[0] ?? '';
  // Longest anchored family name wins, so llama-nemotron is not mislabeled as Meta.
  const matching = Object.entries(logoNames).flatMap(([key, names]) => names.map(prefix => ({ key, prefix })))
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find(({ prefix }) => name === prefix || name.startsWith(prefix) && /^[0-9._\- ]/.test(name.slice(prefix.length)));
  if (matching) return matching.key;
  const publisher = parts.length > 1 ? logoPublishers[parts[parts.length - 2]] : undefined;
  if (publisher) return publisher;
  const reported = family.toLowerCase().trim();
  return logoFamilies[reported] ?? (Object.prototype.hasOwnProperty.call(logoNames, reported) ? reported : undefined);
}
