import { useEffect, useRef, useState } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getMcpServers } from '../integrations/integrationStore';
import { AgentEvent, PipelinePlan, PipelineState, modelConfigs } from './pipeline';
import { LocalModelBlade } from '../rack/types';
export interface ToolActivity {
  id: string;
  planId: string;
  stageId: string;
  name: string;
  arguments: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}
export interface Approval {
  id: string;
  planId: string;
  stageId: string;
  name: string;
  arguments: string;
  pause: boolean;
}
function updateTool(current: ToolActivity[], event: AgentEvent): ToolActivity[] {
  const p = event.payload;
  if (!p.id || !p.plan_id || !['tool_call_pending', 'tool_call_started', 'tool_call_completed', 'tool_output'].includes(event.type))
    return current;
  const previous = current.find(tool => tool.id === p.id && tool.planId === p.plan_id && tool.stageId === p.stage_id);
  const tool: ToolActivity = {
    id: p.id, planId: p.plan_id, stageId: p.stage_id ?? '', name: p.tool ?? previous?.name ?? '',
    arguments: p.arguments ?? previous?.arguments ?? '',
    output: p.output ?? (event.type === 'tool_output' ? (previous?.output ?? '') + (p.text ?? '') : previous?.output ?? ''),
    status: event.type === 'tool_call_pending' ? 'pending' : event.type === 'tool_call_completed' ? p.is_error ? 'error' : 'completed' : 'running',
  };
  return previous ? current.map(item => item === previous ? tool : item) : [...current, tool];
}
export function usePipeline(workspace: string, session: string) {
  const [runs, setRuns] = useState<PipelineState[]>([]);
  const [text, setText] = useState<Record<string, string>>({});
  const [tools, setTools] = useState<ToolActivity[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const requests = useRef(new Set<string>());
  const scope = useRef({ workspace, session });
  scope.current = { workspace, session };
  const listener = useRef<Promise<() => void> | null>(null);
  const replace = (state: PipelineState) => setRuns(current => {
    const found = current.some(run => run.plan.id === state.plan.id);
    return found ? current.map(run => run.plan.id === state.plan.id ? state : run) : [...current, state];
  });
  useEffect(() => {
    mounted.current = true;
    if (!isTauri())
      return () => { mounted.current = false; };
    const listening = listen<AgentEvent>('agent_event', ({ payload: event }) => {
      const p = event.payload;
      if (p.session_id !== scope.current.session || (p.workspace_root && p.workspace_root !== scope.current.workspace) || !p.plan_id)
        return;
      const stageId = p.stage_id ?? '';
      if (event.type === 'pipeline_state' && p.state) {
        replace(p.state);
        if (p.state.status !== 'running')
          setApprovals(current => current.filter(item => item.planId !== p.plan_id));
      }
      if (event.type === 'content_delta' && stageId)
        setText(current => ({ ...current, [stageId]: (current[stageId] ?? '') + (p.delta ?? '') }));
      if (['tool_call_pending', 'tool_call_started', 'tool_call_completed', 'tool_output'].includes(event.type) && p.id) {
        setTools(current => updateTool(current, event));
      }
      if ((event.type === 'tool_call_pending' || event.type === 'run_paused') && p.id) {
        setApprovals(current => [...current.filter(item => item.id !== p.id), { id: p.id!, planId: p.plan_id!, stageId, name: p.tool ?? p.reason ?? 'Continue run', arguments: p.arguments ?? '', pause: event.type === 'run_paused' }]);
      }
      if (event.type === 'tool_call_completed' || event.type === 'run_resumed')
        setApprovals(current => current.filter(item => event.type === 'run_resumed' ? !item.pause : item.id !== p.id));
    });
    listener.current = listening;
    return () => { mounted.current = false; void listening.then(unlisten => unlisten()); };
  }, []);
  useEffect(() => {
    let active = true;
    setRuns([]);
    setTools([]);
    setApprovals([]);
    setText({});
    setError('');
    setBusy(false);
    if (workspace && session && isTauri()) {
      void invoke<AgentEvent[]>('load_pipeline_activity', { workspaceRoot: workspace, sessionId: session }).then(events => {
        if (!active)
          return;
        setTools(current => {
          const saved = events.reduce(updateTool, [] as ToolActivity[]);
          return [...saved.filter(tool => !current.some(live => live.id === tool.id && live.planId === tool.planId && live.stageId === tool.stageId)), ...current];
        });
        setApprovals(current => [...events.filter(event => ['tool_call_pending', 'run_paused'].includes(event.type) && !current.some(item => item.id === event.payload.id)).map(event => ({
          id: event.payload.id!, planId: event.payload.plan_id!, stageId: event.payload.stage_id ?? '',
          name: event.payload.tool ?? event.payload.reason ?? 'Continue run', arguments: event.payload.arguments ?? '', pause: event.type === 'run_paused',
        })), ...current]);
      }).catch(error => {
        if (active)
          setError(String(error));
      });
      void invoke<PipelineState[]>('load_pipelines', { workspaceRoot: workspace, sessionId: session }).then(states => {
        if (active)
          setRuns(current => [...states.filter(state => !current.some(run => run.plan.id === state.plan.id)), ...current]);
      }).catch(error => {
        if (active)
          setError(String(error));
      });
    }
    return () => { active = false; };
  }, [workspace, session]);
  const run = async (plan: PipelinePlan | null, resume: PipelineState | null, models: LocalModelBlade[]) => {
    if (!isTauri())
      throw new Error('Model execution requires the Unfuse desktop app.');
    if (!workspace.trim() || !session)
      throw new Error('Choose a project directory and chat first.');
    const activeScope = { workspace, session };
    const current = () => mounted.current && scope.current.workspace === activeScope.workspace && scope.current.session === activeScope.session;
    const llmConfigs = modelConfigs(models, (plan ?? resume!.plan).stages);
    const key = JSON.stringify(activeScope);
    if (requests.current.has(key))
      throw new Error('This chat already has a running request.');
    requests.current.add(key);
    setError('');
    setBusy(true);
    try {
      await listener.current;
      const result = await invoke<PipelineState>('run_pipeline', { workspaceRoot: workspace, sessionId: session, plan, resumeId: resume?.plan.id ?? null, llmConfigs, mcpServers: getMcpServers() });
      if (current()) {
        replace(result);
        if (result.error)
          setError(result.error);
      }
      return result;
    }
    catch (error) {
      if (current()) {
        setError(String(error));
        try {
          const saved = await invoke<PipelineState[]>('load_pipelines', { workspaceRoot: workspace, sessionId: session });
          if (current())
            setRuns(saved);
        }
        catch { /* Keep the original execution error. */ }
      }
    }
    finally {
      requests.current.delete(key);
      if (current())
        setBusy(false);
    }
  };
  const cancel = async () => {
    try {
      await invoke('cancel_agent_turn', { sessionId: session });
    }
    catch (error) {
      setError(String(error));
    }
  };
  const decide = async (id: string, decision: 'allow' | 'reject') => {
    try {
      const accepted = await invoke<boolean>('resolve_tool_permission', { sessionId: session, callId: id, decision });
      if (!accepted)
        throw new Error('This approval is no longer pending.');
      setApprovals(current => current.filter(item => item.id !== id));
    }
    catch (error) {
      setError(String(error));
    }
  };
  return { runs, text, tools, approvals, error, setError, busy: busy || runs.some(run => run.status === 'running'), run, cancel, decide };
}
