import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronRight, Hand } from 'lucide-react';
import { LocalModelBlade } from '../rack/types';
import { ModelFamilyLogo } from './ModelIdentity';
import { SyntaxSnippet } from './SyntaxSnippet';
import { usePipeline } from './usePipeline';
export function PipelineConversation({ pipeline, models }: {
  pipeline: ReturnType<typeof usePipeline>;
  models: LocalModelBlade[];
}) {
  return <div className="max-w-3xl mx-auto space-y-8 py-6 select-text">
    {pipeline.runs.map(run => <section key={run.plan.id} aria-label="Pipeline conversation" className="space-y-5">
      <div className="ml-auto w-fit max-w-[90%] rounded-2xl px-4 py-3 bg-[var(--bg-surface)] text-sm whitespace-pre-wrap">{run.plan.request}</div>
      {run.plan.stages.map(stage => {
        const result = run.results.find(result => result.stage_id === stage.id);
        const model = models.find(model => model.id === stage.model_id);
        const text = result?.output ?? pipeline.text[stage.id] ?? '';
        const tools = pipeline.tools.filter(tool => tool.planId === run.plan.id && tool.stageId === stage.id);
        const active = run.status === 'running' && (run.active_stage?.stage_id === stage.id || (!run.active_stage && run.plan.stages[run.next_stage]?.id === stage.id));
        const showError = !!run.error && stage.id === (run.active_stage?.stage_id ?? run.plan.stages[Math.min(run.next_stage, run.plan.stages.length - 1)]?.id);
        if (!text && !tools.length && !active && !showError)
          return null;
        return <article key={stage.id} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium"><ModelFamilyLogo family={model?.family ?? ''} modelId={model?.name ?? result?.model} size={18} /><span>{model?.displayName ?? result?.model ?? stage.model_id}</span>{active && <span role="status" aria-label="Model working" className="inline-flex text-[var(--text-muted)]"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" className="animate-spin motion-reduce:animate-none"><path d="M10 2a8 8 0 0 1 8 8M10 18a8 8 0 0 1-8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>}</div>
          {tools.length > 0 && <div aria-label="Tool calls" className="text-xs text-[var(--text-muted)]">{tools.map(tool => <details key={tool.id} className="group/tool">
            <summary className="list-none flex items-center gap-2 cursor-pointer py-1 [&::-webkit-details-marker]:hidden"><ChevronRight size={12} className="group-open/tool:rotate-90 motion-reduce:transition-none transition-transform" /><span className="font-mono text-[var(--text-main)]">{tool.name}</span><span>{tool.status}</span></summary>
            <div className="pl-5 pb-3"><SyntaxSnippet text={tool.arguments} language="json" />{tool.output && <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] max-h-72 overflow-y-auto">{tool.output}</pre>}</div>
          </details>)}</div>}
          <div className="text-sm leading-7 break-words [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_table]:w-full [&_td]:p-2 [&_th]:p-2 [&_th]:text-left [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-muted)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline">{children}</a>,
              img: ({ alt, src }) => <a href={src} target="_blank" rel="noreferrer" className="underline">{alt || 'Image reference'}</a>,
              code: ({ children, className }) => className ? <SyntaxSnippet text={String(children).replace(/\n$/, '')} language={className.replace('language-', '')} /> : <code className="font-mono text-xs bg-[var(--bg-surface)] rounded px-1">{children}</code>,
              pre: ({ children }) => <div className="my-3 rounded-lg bg-[var(--bg-surface)] p-3 overflow-x-auto">{children}</div>,
            }}>{text}</ReactMarkdown>
          </div>
          {showError && <p role="alert" className="text-xs leading-5 text-[var(--text-muted)] whitespace-pre-wrap">{run.status === 'cancelled' ? 'Response stopped.' : run.error}</p>}
        </article>;
      })}
      {run.status === 'interrupted' && <button disabled={pipeline.busy} onClick={() => void pipeline.run(null, run, models).catch(error => pipeline.setError(String(error)))} className="text-xs underline disabled:opacity-40">Resume from saved state</button>}
    </section>)}
    {pipeline.approvals.map(approval => <section key={approval.id} aria-label="Action approval" className="rounded-xl p-4 bg-[var(--bg-surface)] space-y-3">
      <p className="flex items-center gap-2 text-xs font-medium"><Hand size={15} />{approval.pause ? 'Run paused' : 'Approval required'} · {approval.name}</p>
      {approval.arguments && <SyntaxSnippet text={approval.arguments} language="json" />}
      <div className="flex gap-3"><button onClick={() => void pipeline.decide(approval.id, 'allow')} className="text-xs rounded-lg px-3 py-2 bg-[var(--text-main)] text-[var(--bg-app)]">{approval.pause ? 'Continue' : 'Approve'}</button><button onClick={() => void pipeline.decide(approval.id, 'reject')} className="text-xs px-3 py-2">{approval.pause ? 'Stop' : 'Deny and stop'}</button></div>
    </section>)}
  </div>;
}
