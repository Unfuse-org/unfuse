import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowUpRight, Bug, ChevronDown, Compass, FileCode2, Plus, Hand, FileCheck2, Paperclip, FolderOpen, Sparkles, Search, MessageSquare, Check, X, FileText, Image as ImageIcon, Terminal, ListTodo, Square } from 'lucide-react';
import { LocalModelBlade } from '../rack/types';
import { isTauri } from '@tauri-apps/api/core';
import { ModelFamilyLogo } from './ModelIdentity';
import { makePlan, ModelTag, moveTags } from './pipeline';
import { usePipeline } from './usePipeline';
import { PipelineConversation } from './PipelineConversation';

interface MainChatPanelProps {
  sessionId: string;
  models: LocalModelBlade[];
  onOpenRack: () => void;
  workspaceRoot: string;
  workspaceError: string;
  onWorkspaceChange: (path: string) => void;
  onSessionStarted: (id: string, title: string) => void;
  pipeline: ReturnType<typeof usePipeline>;
}


const starters = [
  { label: 'Explore a project', icon: Compass, color: '#4f9cf9', description: 'Find your way through the codebase.', prompt: 'Help me understand this project and explain how its main pieces fit together.' },
  { label: 'Investigate a bug', icon: Bug, color: '#ec8066', description: 'Trace a problem to its source.', prompt: 'Help me investigate a bug. Start by asking what is happening and what I expected.' },
  { label: 'Review some code', icon: FileCode2, color: '#a78bfa', description: 'Get a fresh perspective on your code.', prompt: 'Review my code for correctness and explain any issues before suggesting changes.' },
];

export function MainChatPanel({ sessionId, models, onOpenRack, workspaceRoot, onWorkspaceChange, onSessionStarted, workspaceError, pipeline }: MainChatPanelProps) {
  const effectiveSession=sessionId;
  const [projectPath,setProjectPath]=useState(workspaceRoot);
  const [tagsByChat,setTagsByChat]=useState<Record<string,ModelTag[]>>({});
  const [pickerAt,setPickerAt]=useState<number|null>(null);
  const tags=tagsByChat[effectiveSession]??[];
  useEffect(() => { setPickerAt(null); }, [effectiveSession]);
  useEffect(() => { setProjectPath(workspaceRoot); }, [workspaceRoot]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const addMenuRef = useRef<HTMLDetailsElement>(null);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [contextQuery, setContextQuery] = useState('');
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (addMenuRef.current && event.target instanceof Node && !addMenuRef.current.contains(event.target)) addMenuRef.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  const draft = drafts[effectiveSession] ?? '';
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models.find(model=>model.status==='active') ?? models[0];
  const updateDraft = (text: string) => {
    setTagsByChat(current=>({...current,[effectiveSession]:moveTags(draft,text,tags)}));
    setDrafts(current=>({...current,[effectiveSession]:text}));
  };
  const assignModel=(model:LocalModelBlade)=>{
    const at=pickerAt??draft.length;
    const replaceAt=draft[at]==='@'?at+1:at;
    const label=`@${model.displayName}`;
    const text=draft.slice(0,at)+label+' '+draft.slice(replaceAt);
    const shifted=moveTags(draft,text,tags);
    setTagsByChat(current=>({...current,[effectiveSession]:[...shifted,{start:at,end:at+label.length,modelId:model.id}]}));
    setDrafts(current=>({...current,[effectiveSession]:text}));
    setPickerAt(null);
    requestAnimationFrame(()=>{inputRef.current?.focus();inputRef.current?.setSelectionRange(at+label.length+1,at+label.length+1);});
  };
  const send=async()=>{
    try {
      if(pipeline.busy||pipeline.loading)return;
      const plan=makePlan(draft,tags,selectedModel?.id??'');
      if(!workspaceRoot)throw new Error('Set the project directory before running.');
      if(!isTauri())throw new Error('Run this conversation in the Unfuse desktop app.');
      const result=await pipeline.run(plan,null,models);
      if(result){onSessionStarted(effectiveSession,draft.trim().slice(0,70));setDrafts(current=>({...current,[effectiveSession]:''}));setTagsByChat(current=>({...current,[effectiveSession]:[]}));}
    }catch(error){pipeline.setError(String(error));}
  };
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const resize = () => {
      input.style.height = '0px';
      input.style.height = `${Math.min(192, Math.max(44, input.scrollHeight))}px`;
    };
    resize();
    let width = input.clientWidth;
    const observer = new ResizeObserver(() => {
      if (input.clientWidth === width) return;
      width = input.clientWidth;
      resize();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, [draft, sessionId]);


  const composer = (
      <div className="px-4 sm:px-6 pb-5 pt-2 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-[24px] px-3 py-2.5 shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <textarea
              ref={inputRef}
              aria-label="Message draft"
              value={draft}
              readOnly={pipeline.busy}
              onChange={(event) => {updateDraft(event.target.value);const caret=event.target.selectionStart;if(event.target.value[caret-1]==='@')setPickerAt(caret-1);else setPickerAt(null);}}
              onKeyDown={event=>{if(event.key==='Escape')setPickerAt(null);if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();void send();}}}
              placeholder="Ask anything, or describe a task…"
              rows={1}
              className="block w-full resize-none overflow-y-auto bg-transparent outline-none text-sm leading-6 px-2 py-2 min-h-[44px] max-h-48 select-text placeholder:text-[var(--text-muted)]"
            />
            {pickerAt!==null&&<div aria-label="Assign a model" className="absolute bottom-full left-0 mb-2 p-2 rounded-xl bg-[var(--bg-panel)] shadow-lg z-40 max-w-full w-80">
              {models.length?models.map(model=><button key={model.id} onClick={()=>assignModel(model)} className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg hover:bg-[var(--bg-surface)]"><ModelFamilyLogo family={model.family} modelId={model.name} size={18}/><span className="min-w-0"><span className="block text-xs truncate">{model.displayName}</span><span className="block text-[10px] text-[var(--text-muted)] truncate">{model.provider} · {model.endpoint}</span></span></button>):<button onClick={onOpenRack} className="p-2 text-xs">Connect a model in the rack</button>}
            </div>}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1">
              <details ref={addMenuRef} className="group/add" onToggle={event => { if (!event.currentTarget.open) setContextQuery(''); }} onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
                <summary aria-label="Add context" className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-[var(--accent)]" style={{ color: 'var(--text-main)' }}><Plus size={17} /></summary>
                <div aria-label="Add context menu" className="absolute left-0 bottom-full mb-2 w-[480px] max-w-full rounded-2xl p-2 shadow-lg z-30" style={{ backgroundColor: 'var(--bg-panel)' }}>
                  <div className="flex items-center justify-between px-2 mb-2"><span className="text-xs font-medium">Add to chat</span></div>
                  <label className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-[var(--text-muted)]"><Search size={15} /><input aria-label="Search context options" value={contextQuery} onChange={event => setContextQuery(event.target.value)} placeholder="Search files, integrations or skills…" className="w-full min-w-0 bg-transparent outline-none text-xs text-[var(--text-main)]" /></label>
                  <div className="overflow-y-auto overscroll-contain max-h-[min(320px,50vh)]">
                    {[{ name: 'Files and images', icon: Paperclip }, { name: 'Workspace files', icon: FileCode2 }, { name: 'Folders', icon: FolderOpen }, { name: 'Attach terminal', icon: Terminal }, { name: 'Skills', icon: Sparkles }].filter(item => item.name.toLowerCase().includes(contextQuery.toLowerCase())).map(item => <button key={item.name} disabled title="Context attachment is not connected" className="flex items-center gap-2.5 w-full px-2 py-2 text-xs text-left rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"><item.icon size={16} />{item.name}</button>)}
                    <p className="px-2 py-3 text-[11px] text-[var(--text-muted)]">No attached context.</p>
                  </div>
                </div>
              </details>
              <button disabled={pipeline.busy} aria-label="Assign model task" onClick={()=>setPickerAt(inputRef.current?.selectionStart??draft.length)} className="w-8 h-8 rounded-full text-sm hover:bg-[var(--bg-surface-hover)] disabled:opacity-40">@</button>
              <details className="relative group/permissions">
                <summary aria-label="Approval mode" className="list-none [&::-webkit-details-marker]:hidden flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs cursor-pointer hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-[var(--accent)]" style={{ color: 'var(--text-muted)' }}>
                  <Hand size={14} /><span>{pipeline.policy==='ask'?'Ask for approval':'Auto-approve edits'}</span><ChevronDown size={12} className="group-open/permissions:rotate-180 transition-transform" />
                </summary>
                <div className="absolute left-0 bottom-full mb-2 w-64 max-w-[calc(100vw-3rem)] rounded-xl p-2 shadow-xl z-20" style={{ backgroundColor: 'var(--bg-panel)' }}>
                  <p className="px-2 pt-1 pb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Permissions</p>
                  <button disabled={pipeline.busy} aria-pressed={pipeline.policy==='ask'} onClick={()=>pipeline.setPolicy('ask')} className="flex gap-2.5 w-full rounded-lg p-2 text-left disabled:opacity-40" style={{ backgroundColor: pipeline.policy==='ask'?'var(--bg-surface)':undefined }}>
                    <Hand size={16} className="mt-0.5 shrink-0" />
                    <span><span className="block text-xs font-medium">Ask for approval</span><span className="block mt-1 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>Ask before editing files or running commands.</span></span>
                  </button>
                  <button disabled={pipeline.busy} aria-pressed={pipeline.policy==='edits'} onClick={()=>pipeline.setPolicy('edits')} className="flex gap-2.5 w-full rounded-lg p-2 text-left disabled:opacity-40" style={{backgroundColor:pipeline.policy==='edits'?'var(--bg-surface)':undefined}}>
                    <FileCheck2 size={16} className="mt-0.5 shrink-0" />
                    <span><span className="block text-xs font-medium">Auto-approve edits</span><span className="block mt-1 text-[11px] leading-4" style={{ color: 'var(--text-muted)' }}>Allow file edits. Ask before running commands.</span></span>
                  </button>
                </div>
              </details>
              </div>
              <div className="flex items-center justify-end gap-2 min-w-0 ml-auto">
                {models.length > 0 ? (
                  <div className="relative min-w-0 max-w-[180px]">
                    <select aria-label="Choose model" value={selectedModel?.id ?? ''} onChange={(event) => setSelectedModelId(event.target.value)} className="appearance-none w-full truncate text-xs bg-transparent outline-none rounded-lg pl-2 pr-6 py-2 cursor-pointer hover:bg-[var(--bg-surface-hover)]" style={{ color: 'var(--text-muted)' }}>
                      {models.map((model) => <option key={model.id} value={model.id} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-main)' }}>{model.displayName}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                  </div>
                ) : (
                  <button onClick={onOpenRack} className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-2 hover:bg-[var(--bg-surface-hover)] min-w-0" style={{ color: 'var(--text-muted)' }}>
                    <span className="truncate">Select model</span><ChevronDown size={12} className="shrink-0" />
                  </button>
                )}
                <button onClick={()=>void (pipeline.busy?pipeline.cancel():send())} disabled={!pipeline.busy&&(pipeline.loading||!draft.trim()||!models.length)} aria-label={pipeline.busy?'Stop pipeline':'Send message'} title={pipeline.busy?'Stop the current run':'Run assigned models in order'} className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-app)' }}>
                  {pipeline.busy?<Square size={13}/>:<ArrowUp size={17} />}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
  );

  return (
    <main className="flex-1 h-full min-w-0 flex flex-col" style={{ backgroundColor: 'var(--bg-app)' }}>


      <div className="px-6 pt-3 text-xs text-[var(--text-muted)]"><label className="flex items-center gap-2"><FolderOpen size={13}/><input aria-label="Project directory" placeholder="Absolute project directory" value={projectPath} disabled={pipeline.busy} onChange={event=>setProjectPath(event.target.value)} onBlur={()=>onWorkspaceChange(projectPath.trim())} onKeyDown={event=>{if(event.key==='Enter')onWorkspaceChange(projectPath.trim());}} className="min-w-0 flex-1 bg-transparent outline-none py-1 focus-visible:ring-1 focus-visible:ring-[var(--accent)] rounded"/></label></div>
      <div className={`flex-1 min-h-0 overflow-y-auto px-6 ${pipeline.runs.length?'':'flex flex-col justify-center'}`}>
        {pipeline.runs.length>0?<PipelineConversation pipeline={pipeline} models={models}/>:''}
        {pipeline.loading&&<p role="status" className="text-xs text-[var(--text-muted)]">Loading saved conversation…</p>}
        {!pipeline.loading&&!pipeline.runs.length&&(
        <div className="w-full max-w-3xl mx-auto py-12">
          <h2 className="text-[clamp(28px,3.5vw,44px)] leading-[1.15] tracking-[-0.04em] font-medium max-w-lg" style={{ color: 'var(--text-main)' }}>
            What are we<br />working on?
          </h2>
          <div className="mt-9 grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))' }}>
            {starters.map((starter) => (
              <button key={starter.label} onClick={() => { updateDraft(starter.prompt); inputRef.current?.focus(); }} className="group text-left rounded-xl border border-[var(--border-subtle)] p-3 bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] transition-colors">
                <div className="flex items-center justify-between mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  <starter.icon size={20} strokeWidth={1.8} style={{ color: `color-mix(in srgb, ${starter.color} 85%, var(--text-main))` }} />
                  <ArrowUpRight size={15} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{starter.label}</div>
                <div className="text-[11px] leading-4 mt-1" style={{ color: 'var(--text-muted)' }}>{starter.description}</div>
              </button>
            ))}
          </div>
        </div>)}
      </div>
      {(pipeline.error || workspaceError)&&<p role="alert" className="max-w-3xl mx-auto w-full px-6 py-2 text-xs text-[var(--text-muted)]">{pipeline.error || workspaceError}</p>}
      {composer}


    </main>
  );
}
