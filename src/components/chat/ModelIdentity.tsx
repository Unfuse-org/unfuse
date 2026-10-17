import { resolveModelLogoKey } from '../rack/modelResolver';
import logo_qwen from '../../assets/model-logos/qwen.svg';
import logo_deepseek from '../../assets/model-logos/deepseek.svg';
import logo_meta from '../../assets/model-logos/meta.svg';
import logo_gemma from '../../assets/model-logos/gemma.svg';
import logo_microsoft from '../../assets/model-logos/microsoft.svg';
import logo_mistral from '../../assets/model-logos/mistral.svg';
import logo_chatglm from '../../assets/model-logos/chatglm.svg';
import logo_moonshot from '../../assets/model-logos/moonshot.svg';
import logo_minimax from '../../assets/model-logos/minimax.svg';
import logo_yi from '../../assets/model-logos/yi.svg';
import logo_baichuan from '../../assets/model-logos/baichuan.svg';
import logo_internlm from '../../assets/model-logos/internlm.svg';
import logo_nousresearch from '../../assets/model-logos/nousresearch.svg';
import logo_dolphin from '../../assets/model-logos/dolphin.svg';
import logo_tii from '../../assets/model-logos/tii.svg';
import logo_rwkv from '../../assets/model-logos/rwkv.svg';
import logo_ai2 from '../../assets/model-logos/ai2.svg';
import logo_ibm from '../../assets/model-logos/ibm.svg';
import logo_nvidia from '../../assets/model-logos/nvidia.svg';
import logo_cohere from '../../assets/model-logos/cohere.svg';
import logo_aya from '../../assets/model-logos/aya.svg';
import logo_dbrx from '../../assets/model-logos/dbrx.svg';
import logo_ai21 from '../../assets/model-logos/ai21.svg';
import logo_arcee from '../../assets/model-logos/arcee.svg';
import logo_liquid from '../../assets/model-logos/liquid.svg';
import logo_huggingface from '../../assets/model-logos/huggingface.svg';
import logo_baai from '../../assets/model-logos/baai.svg';
import logo_jina from '../../assets/model-logos/jina.svg';
import logo_snowflake from '../../assets/model-logos/snowflake.svg';
import logo_openchat from '../../assets/model-logos/openchat.svg';
import logo_hunyuan from '../../assets/model-logos/hunyuan.svg';
import logo_wenxin from '../../assets/model-logos/wenxin.svg';
import logo_xiaomimimo from '../../assets/model-logos/xiaomimimo.svg';
import logo_longcat from '../../assets/model-logos/longcat.svg';
import logo_stepfun from '../../assets/model-logos/stepfun.svg';
import logo_skywork from '../../assets/model-logos/skywork.svg';
import logo_deepcogito from '../../assets/model-logos/deepcogito.svg';
import logo_lg from '../../assets/model-logos/lg.svg';
import logo_openai from '../../assets/model-logos/openai.svg';
import logo_stability from '../../assets/model-logos/stability.svg';
import logo_flux from '../../assets/model-logos/flux.svg';
import logo_cogview from '../../assets/model-logos/cogview.svg';
import logo_kolors from '../../assets/model-logos/kolors.svg';
import logo_codegeex from '../../assets/model-logos/codegeex.svg';
import logo_bilibiliindex from '../../assets/model-logos/bilibiliindex.svg';
import logo_essentialai from '../../assets/model-logos/essentialai.svg';
import logo_sensenova from '../../assets/model-logos/sensenova.svg';
import logo_upstage from '../../assets/model-logos/upstage.svg';
import logo_apple from '../../assets/model-logos/apple.svg';
import logo_alephalpha from '../../assets/model-logos/alephalpha.svg';
import { Box } from 'lucide-react';

// Curated brand artwork from LobeHub; provenance and license are bundled with the SVGs.
export const modelLogoCatalog = [
  { key: 'qwen', label: 'Qwen', url: logo_qwen, mono: false },
  { key: 'deepseek', label: 'DeepSeek', url: logo_deepseek, mono: false },
  { key: 'meta', label: 'Meta / Llama', url: logo_meta, mono: false },
  { key: 'gemma', label: 'Gemma', url: logo_gemma, mono: false },
  { key: 'microsoft', label: 'Microsoft / Phi', url: logo_microsoft, mono: false },
  { key: 'mistral', label: 'Mistral', url: logo_mistral, mono: false },
  { key: 'chatglm', label: 'ChatGLM', url: logo_chatglm, mono: false },
  { key: 'moonshot', label: 'Moonshot / Kimi', url: logo_moonshot, mono: true },
  { key: 'minimax', label: 'MiniMax', url: logo_minimax, mono: false },
  { key: 'yi', label: 'Yi', url: logo_yi, mono: false },
  { key: 'baichuan', label: 'Baichuan', url: logo_baichuan, mono: false },
  { key: 'internlm', label: 'InternLM', url: logo_internlm, mono: false },
  { key: 'nousresearch', label: 'Nous / Hermes', url: logo_nousresearch, mono: true },
  { key: 'dolphin', label: 'Dolphin', url: logo_dolphin, mono: true },
  { key: 'tii', label: 'TII / Falcon', url: logo_tii, mono: false },
  { key: 'rwkv', label: 'RWKV', url: logo_rwkv, mono: false },
  { key: 'ai2', label: 'Ai2 / OLMo', url: logo_ai2, mono: false },
  { key: 'ibm', label: 'IBM / Granite', url: logo_ibm, mono: true },
  { key: 'nvidia', label: 'NVIDIA / Nemotron', url: logo_nvidia, mono: false },
  { key: 'cohere', label: 'Cohere', url: logo_cohere, mono: false },
  { key: 'aya', label: 'Aya', url: logo_aya, mono: false },
  { key: 'dbrx', label: 'DBRX', url: logo_dbrx, mono: false },
  { key: 'ai21', label: 'AI21 / Jamba', url: logo_ai21, mono: true },
  { key: 'arcee', label: 'Arcee', url: logo_arcee, mono: false },
  { key: 'liquid', label: 'Liquid AI', url: logo_liquid, mono: true },
  { key: 'huggingface', label: 'Hugging Face', url: logo_huggingface, mono: false },
  { key: 'baai', label: 'BAAI / BGE', url: logo_baai, mono: true },
  { key: 'jina', label: 'Jina', url: logo_jina, mono: true },
  { key: 'snowflake', label: 'Snowflake / Arctic', url: logo_snowflake, mono: false },
  { key: 'openchat', label: 'OpenChat', url: logo_openchat, mono: false },
  { key: 'hunyuan', label: 'Hunyuan', url: logo_hunyuan, mono: false },
  { key: 'wenxin', label: 'Wenxin / ERNIE', url: logo_wenxin, mono: false },
  { key: 'xiaomimimo', label: 'Xiaomi MiMo', url: logo_xiaomimimo, mono: true },
  { key: 'longcat', label: 'LongCat', url: logo_longcat, mono: false },
  { key: 'stepfun', label: 'StepFun', url: logo_stepfun, mono: false },
  { key: 'skywork', label: 'Skywork', url: logo_skywork, mono: false },
  { key: 'deepcogito', label: 'Deep Cogito', url: logo_deepcogito, mono: false },
  { key: 'lg', label: 'LG / EXAONE', url: logo_lg, mono: false },
  { key: 'openai', label: 'OpenAI / gpt-oss', url: logo_openai, mono: true },
  { key: 'stability', label: 'Stability AI', url: logo_stability, mono: false },
  { key: 'flux', label: 'FLUX', url: logo_flux, mono: true },
  { key: 'cogview', label: 'CogView', url: logo_cogview, mono: false },
  { key: 'kolors', label: 'Kolors', url: logo_kolors, mono: false },
  { key: 'codegeex', label: 'CodeGeeX', url: logo_codegeex, mono: false },
  { key: 'bilibiliindex', label: 'Bilibili Index', url: logo_bilibiliindex, mono: true },
  { key: 'essentialai', label: 'Essential AI', url: logo_essentialai, mono: false },
  { key: 'sensenova', label: 'SenseNova', url: logo_sensenova, mono: false },
  { key: 'upstage', label: 'Upstage / SOLAR', url: logo_upstage, mono: false },
  { key: 'apple', label: 'Apple / OpenELM', url: logo_apple, mono: true },
  { key: 'alephalpha', label: 'Aleph Alpha', url: logo_alephalpha, mono: true },
] as const;

export function ModelFamilyLogo({ family, modelId, size = 22 }: { family: string; modelId?: string; size?: number }) {
  const key = resolveModelLogoKey(family, modelId);
  const logo = modelLogoCatalog.find(item => item.key === key);
  if (!logo) return <Box size={size} aria-label="Model icon" className="shrink-0 text-[var(--text-muted)]" />;
  if (logo.mono) return <span role="img" aria-label={`${logo.label} logo`} className="inline-block shrink-0" style={{ width: size, height: size, backgroundColor: 'var(--text-main)', maskImage: `url(${logo.url})`, WebkitMaskImage: `url(${logo.url})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />;
  return <img src={logo.url} alt={`${logo.label} logo`} style={{ width: size, height: size }} className="object-contain shrink-0" />;
}

