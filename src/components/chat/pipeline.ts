import { LocalModelBlade } from '../rack/types';
export interface ModelTag {
  start: number;
  end: number;
  modelId: string;
}
export interface PipelineStage {
  id: string;
  model_id: string;
  instruction: string;
  allowed_tools: string[] | null;
}
export interface PipelinePlan {
  id: string;
  request: string;
  stages: PipelineStage[];
}
export interface StageExecution {
  plan_id: string;
  stage_id: string;
  stage_index: number;
  model_id: string;
  run_id: string;
}
export interface StageResult {
  stage_id: string;
  stage_index: number;
  model_id: string;
  model: string;
  output: string;
  record_id: string;
  evidence: {
    event_id: string;
    tool: string;
    is_error: boolean;
  }[];
}
export interface PipelineState {
  plan: PipelinePlan;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
  next_stage: number;
  active_stage: StageExecution | null;
  results: StageResult[];
  fingerprints: Record<string, string>;
  error: string | null;
}
export interface AgentEvent {
  type: string;
  payload: {
    session_id?: string;
    workspace_root?: string;
    plan_id?: string;
    stage_id?: string;
    stage_index?: number;
    model_id?: string;
    id?: string;
    tool?: string;
    tool_class?: string;
    arguments?: string;
    output?: string;
    is_error?: boolean;
    delta?: string;
    text?: string;
    reason?: string;
    state?: PipelineState;
  };
}
// Preserve only explicitly selected tags; typing a model's name or an email never creates a stage.
export function moveTags(before: string, after: string, tags: ModelTag[]): ModelTag[] {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start])
    start++;
  let oldEnd = before.length;
  let newEnd = after.length;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const delta = newEnd - oldEnd;
  return tags.flatMap(tag => {
    if (tag.end <= start)
      return [tag];
    if (tag.start >= oldEnd)
      return [{ ...tag, start: tag.start + delta, end: tag.end + delta }];
    return [];
  });
}
export function makePlan(text: string, tags: ModelTag[], defaultModelId: string): PipelinePlan {
  if (!text.trim())
    throw new Error('Write a task first.');
  const ordered = [...tags].sort((a, b) => a.start - b.start);
  const stages = ordered.length ? ordered.map((tag, index) => ({
    id: crypto.randomUUID(), model_id: tag.modelId,
    instruction: text.slice(tag.end, ordered[index + 1]?.start ?? text.length).trim(), allowed_tools: null,
  })) : [{ id: crypto.randomUUID(), model_id: defaultModelId, instruction: text.trim(), allowed_tools: null }];
  if (stages.some(stage => !stage.model_id || !stage.instruction))
    throw new Error('Give every selected model an instruction after its tag.');
  return { id: crypto.randomUUID(), request: text.trim(), stages };
}
function modelConfig(model: LocalModelBlade) {
  return {
    provider: model.provider, base_url: model.endpoint, api_key: model.apiKey || null, model: model.name,
    temperature: model.temperature ?? null, max_tokens: model.maxTokens ?? null, timeout_secs: null, context_window: model.contextLength ?? null,
  };
}
export function modelConfigs(models: LocalModelBlade[], stages: PipelineStage[]) {
  return Object.fromEntries([...new Set(stages.map(stage => stage.model_id))].map(id => {
    const model = models.find(model => model.id === id);
    if (!model)
      throw new Error('Reconnect the original rack connection before running or resuming.');
    return [id, modelConfig(model)];
  }));
}
// The backend verifies this same provider / endpoint / model fingerprint on resume.
export async function resumeModelConfigs(models: LocalModelBlade[], state: PipelineState) {
  const candidates = await Promise.all(models.map(async model => {
    const identity = `${model.provider}\n${model.endpoint.replace(/\/+$/, '')}\n${model.name}`;
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
    return { model, fingerprint: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') };
  }));
  return Object.fromEntries([...new Set(state.plan.stages.map(stage=>stage.model_id))].map(id=>{
    const match=candidates.find(candidate=>candidate.fingerprint===state.fingerprints[id]);
    if(!match)throw new Error('Reconnect the same provider, endpoint, and model before resuming this pipeline.');
    return [id,modelConfig(match.model)];
  }));
}
