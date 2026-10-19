import { useRef, useState } from 'react';
import { Plus, Trash2, Unplug, Pencil, Globe2, Terminal, ChevronRight, ExternalLink, Info, Wrench } from 'lucide-react';
import { McpLogo } from './IntegrationLogos';
import type { McpServerConfig } from './types';
import { getCustomMcpServers, saveCustomMcpServer, connectCustomMcpServer, disconnectCustomMcpServer } from './integrationStore';

const field = 'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]';
const quietButton = 'inline-flex items-center justify-center rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-main)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-40';
function stringMap(text:string):Record<string,string>{
  const value:unknown=JSON.parse(text);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(item=>typeof item!=='string'))throw new Error('Environment and headers must contain string values.');
  return value as Record<string,string>;
}

export function McpView({workspaceRoot}:{workspaceRoot:string}) {
  const [servers,setServers]=useState(getCustomMcpServers);
  const [editing,setEditing]=useState<string|null>(()=>`custom-${crypto.randomUUID()}`);
  const [name,setName]=useState('');
  const [transport,setTransport]=useState<McpServerConfig['transport']>('streamable-http');
  const [command,setCommand]=useState('');
  const [args,setArgs]=useState('[]');
  const [cwd,setCwd]=useState(workspaceRoot);
  const [domains,setDomains]=useState('[]');
  const [environment,setEnvironment]=useState('{}');
  const [url,setUrl]=useState('');
  const [headers,setHeaders]=useState('{}');
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [errorServer,setErrorServer]=useState<string|null>(null);
  const advanced=useRef<HTMLDetailsElement>(null);
  const closeEditor=()=>{setEditing(null);setEnvironment('{}');setHeaders('{}');setError('');};

  function open(config?:McpServerConfig,connection:McpServerConfig['transport']='streamable-http'){
    setEditing(config?.id??`custom-${crypto.randomUUID()}`);setName(config?.name??'');setTransport(config?.transport??connection);
    setCommand(config?.command??'');setArgs(JSON.stringify(config?.args??[]));setCwd(config?.cwd??workspaceRoot);setDomains(JSON.stringify(config?.allowedDomains??[]));
    setEnvironment(JSON.stringify(config?.env??{}));setUrl(config?.url??'');setHeaders(JSON.stringify(config?.headers??{}));setError('');setErrorServer(null);
    if(advanced.current)advanced.current.open=false;
  }
  function save(event:React.FormEvent){
    event.preventDefault();setError('');
    try {
      if(!editing||!name.trim())throw new Error('Name is required.');
      const config:McpServerConfig={id:editing,name:name.trim(),transport,enabled:true};
      if(transport==='stdio'){
        const argv:unknown=JSON.parse(args), allowed:unknown=JSON.parse(domains);
        if(!Array.isArray(argv)||argv.some(item=>typeof item!=='string'))throw new Error('Arguments must be a JSON array of strings.');
        if(!Array.isArray(allowed)||allowed.some(item=>typeof item!=='string'))throw new Error('Allowed domains must be a JSON array of hostnames.');
        if(!command.trim()||!cwd.trim())throw new Error('An installed executable and sandbox workspace are required.');
        Object.assign(config,{command:command.trim(),args:argv,cwd:cwd.trim(),allowedDomains:allowed,env:stringMap(environment)});
      }else{
        const endpoint=new URL(url.trim());
        if(!['https:','http:'].includes(endpoint.protocol))throw new Error('Use an HTTP(S) MCP endpoint.');
        Object.assign(config,{url:endpoint.toString(),headers:stringMap(headers)});
      }
      saveCustomMcpServer(config);setServers(getCustomMcpServers());setEditing(null);
      setEnvironment('{}');setHeaders('{}');
    }catch(failure){setError(failure instanceof SyntaxError?'Enter valid JSON in the configuration fields.':String(failure instanceof Error?failure.message:failure));if(advanced.current)advanced.current.open=true;}
  }
  async function connect(config:McpServerConfig){
    setBusy(config.id);setError('');setErrorServer(config.id);
    try{const result=await connectCustomMcpServer(config);if(!result.success)setError(result.message);}catch(failure){setError(String(failure));}
    finally{setServers(getCustomMcpServers());setBusy(null);}
  }
  async function disconnect(id:string,remove=false){
    setError('');setErrorServer(id);try{await disconnectCustomMcpServer(id,remove);setServers(getCustomMcpServers());}catch(failure){setError(String(failure));}
  }
  const connected=servers.filter(server=>server.result?.success).length;
  return <section className="h-full min-h-0 flex flex-col overflow-y-auto bg-[var(--bg-app)] px-6 py-7 text-[var(--text-main)] sm:px-8">
    <div className="w-full flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-2.5"><McpLogo size={21}/><h1 className="text-xl font-semibold text-balance">MCP servers</h1></div><p className="mt-2 text-[13px] text-[var(--text-muted)]">External tools for your models.</p></div>
        <button onClick={()=>open()} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--text-main)] px-3 py-2 text-xs font-medium text-[var(--bg-app)] hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"><Plus size={14} aria-hidden="true"/>Add server</button>
      </header>

      <div className="mt-7 flex flex-1 flex-wrap items-start gap-8"><aside className="w-56 min-w-0 grow-0 shrink-0 max-w-full">{servers.length>0?<div>
        <div className="mb-2 flex items-center justify-between text-xs"><h2 className="font-medium">Your servers</h2><span className="tabular-nums text-[var(--text-muted)]">{connected} of {servers.length} connected</span></div>
        <ul className="divide-y divide-[var(--border-subtle)]">{servers.map(({config,result})=>{
          const Icon=config.transport==='stdio'?Terminal:Globe2;
          const active=!!result?.success;
          return <li key={config.id} className="py-4" aria-busy={busy===config.id}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)]"><Icon size={18} aria-hidden="true"/></div>
              <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-medium">{config.name}</h3><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]"><span>{config.transport==='stdio'?'Local command':'Remote HTTP'}</span><span aria-hidden="true">·</span><span role="status" className="inline-flex items-center gap-1.5"><span aria-hidden="true" className={`size-1.5 rounded-full ${active?'bg-emerald-400':busy===config.id?'bg-amber-400':'bg-[var(--text-faint)]'}`}/>{busy===config.id?'Connecting…':active?'Connected':'Disconnected'}</span></div></div>
              <div className="flex shrink-0 items-center gap-0.5">
                {active?<button aria-label={`Disconnect ${config.name}`} title="Disconnect" onClick={()=>void disconnect(config.id)} className={quietButton}><Unplug size={16}/></button>:<><button disabled={busy!==null} onClick={()=>void connect(config)} className="mr-1 rounded-md bg-[var(--bg-active)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-surface-hover)] disabled:opacity-40">{busy===config.id?'Connecting…':'Connect'}</button><button disabled={busy===config.id} aria-label={`Edit ${config.name}`} title="Edit server" onClick={()=>open(config)} className={quietButton}><Pencil size={15}/></button></>}
                <button aria-label={`Remove ${config.name}`} title="Remove server" onClick={()=>void disconnect(config.id,true)} className={quietButton}><Trash2 size={15}/></button>
              </div>
            </div>
            {!editing&&error&&errorServer===config.id&&<p role="alert" className="mt-3 break-words text-xs leading-5 text-red-400">{error}</p>}
            {active&&<details className="group mt-3 pl-12 text-xs"><summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] [&::-webkit-details-marker]:hidden"><ChevronRight size={13} className="group-open:rotate-90"/><Wrench size={12}/>{result.toolsCount} {result.toolsCount===1?'tool':'tools'} available</summary><ul className="mt-3 space-y-3">{result.tools.map(tool=><li key={tool.name}><span className="font-mono text-[11px]">{tool.name}</span>{tool.description&&<p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{tool.description}</p>}</li>)}</ul></details>}
          </li>;
        })}</ul>
      </div>:<div>
        <h2 className="text-sm font-medium">Connect your first server</h2>
        <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">Choose how to connect. You’ll find these details in the server’s setup guide.</p>
        <div className="mt-5 space-y-1">
          {([{type:'streamable-http',title:'Remote server',description:'Connect using a server URL.',Icon:Globe2},{type:'stdio',title:'Local server',description:'Run an installed command on your machine.',Icon:Terminal}] as const).map(({type,title,description,Icon})=><button key={type} onClick={()=>open(undefined,type)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-4 text-left hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)]"><Icon size={19} aria-hidden="true"/></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs text-[var(--text-muted)]">{description}</span></span><ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)]" aria-hidden="true"/></button>)}
        </div>
      </div>}

      <footer className="mt-7 space-y-3 text-[11px] leading-5 text-[var(--text-muted)]"><p className="flex items-center gap-1.5"><Info size={12}/>Connections last for this app session.</p><a href="https://modelcontextprotocol.io/docs/getting-started/intro" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">About MCP<ExternalLink size={11}/></a></footer>
      </aside><div className="min-w-0 basis-72 flex-1 rounded-xl bg-[var(--bg-surface)]">
      {editing&&<form onSubmit={save} className="flex flex-col">
        <header className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-5"><div><h2 id="mcp-form-title" className="text-base font-semibold">{servers.some(server=>server.config.id===editing)?'Edit server':'Add MCP server'}</h2><p id="mcp-form-description" className="mt-1 text-xs text-[var(--text-muted)]">Use the connection details supplied by your server.</p></div></header>
        <div className="space-y-4 px-6 pb-5">
          <label className="block space-y-1.5 text-xs font-medium"><span>Name</span><input autoFocus required value={name} onChange={event=>setName(event.target.value)} placeholder="Server name" className={field}/></label>
          <fieldset><legend className="mb-2 text-xs font-medium">Connection type</legend><div className="grid grid-cols-2 gap-2">{([{value:'streamable-http',label:'Remote',Icon:Globe2},{value:'stdio',label:'Local command',Icon:Terminal}] as const).map(({value,label,Icon})=><label key={value} className="cursor-pointer"><input className="peer sr-only" type="radio" name="mcp-transport" value={value} checked={transport===value} onChange={()=>setTransport(value)}/><span className="flex items-center justify-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 text-xs text-[var(--text-muted)] peer-checked:border-[var(--text-muted)] peer-checked:bg-[var(--bg-active)] peer-checked:text-[var(--text-main)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)]"><Icon size={15} aria-hidden="true"/>{label}</span></label>)}</div></fieldset>
          {transport==='stdio'?<>
            <label className="block space-y-1.5 text-xs font-medium"><span>Installed executable</span><input required spellCheck={false} autoCapitalize="none" value={command} onChange={event=>setCommand(event.target.value)} placeholder="Executable path or command on PATH" className={`${field} font-mono text-xs`}/></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Arguments (JSON array)</span><textarea rows={2} spellCheck={false} autoCorrect="off" autoCapitalize="none" value={args} onChange={event=>setArgs(event.target.value)} className={`${field} font-mono text-xs`}/></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Sandbox workspace</span><input required spellCheck={false} autoCapitalize="none" value={cwd} onChange={event=>setCwd(event.target.value)} placeholder="Absolute project directory" aria-describedby="mcp-workspace-help" className={field}/></label><p id="mcp-workspace-help" className="!mt-1.5 text-[11px] leading-5 text-[var(--text-muted)]">Local servers run inside SRT with access to this workspace.</p>
          </>:<label className="block space-y-1.5 text-xs font-medium"><span>Server URL</span><input type="url" required spellCheck={false} autoCapitalize="none" value={url} onChange={event=>setUrl(event.target.value)} placeholder="https://your-server.example/mcp" aria-describedby="mcp-url-help" className={field}/><span id="mcp-url-help" className="block text-[11px] font-normal text-[var(--text-muted)]">Streamable HTTP endpoint</span></label>}
          <details ref={advanced} className="group"><summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] [&::-webkit-details-marker]:hidden"><ChevronRight size={13} className="group-open:rotate-90"/>Advanced settings</summary><div className="mt-3 space-y-4">{transport==='stdio'?<>
            <label className="block space-y-1.5 text-xs font-medium"><span>Allowed network domains (JSON array)</span><textarea rows={2} spellCheck={false} autoCorrect="off" autoCapitalize="none" value={domains} onChange={event=>setDomains(event.target.value)} aria-describedby="mcp-domains-help" className={`${field} font-mono text-xs`}/><span id="mcp-domains-help" className="block text-[11px] font-normal leading-5 text-[var(--text-muted)]">An empty list denies network access. Use hostnames such as api.example.com.</span></label>
            <label className="block space-y-1.5 text-xs font-medium"><span>Environment (JSON object)</span><textarea rows={3} spellCheck={false} autoCorrect="off" autoCapitalize="none" value={environment} onChange={event=>setEnvironment(event.target.value)} className={`${field} font-mono text-xs`}/></label>
          </>:<label className="block space-y-1.5 text-xs font-medium"><span>Request headers (JSON object)</span><textarea rows={3} spellCheck={false} autoCorrect="off" autoCapitalize="none" value={headers} onChange={event=>setHeaders(event.target.value)} className={`${field} font-mono text-xs`}/></label>}</div></details>
          {error&&!errorServer&&<p role="alert" id="mcp-error" className="break-words text-xs leading-5 text-red-400">{error}</p>}
        </div>
        <footer className="flex shrink-0 items-center justify-end gap-2 bg-[var(--bg-app)] px-6 py-4"><button type="button" onClick={closeEditor} className="rounded-lg px-3 py-2 text-xs hover:bg-[var(--bg-surface-hover)]">Cancel</button><button className="rounded-lg bg-[var(--text-main)] px-4 py-2 text-xs font-medium text-[var(--bg-app)] hover:opacity-90">Save server</button></footer>
      </form>}
      {!editing&&<div className="p-6"><h2 className="text-sm font-medium">Connection saved</h2><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">Connect your server from the list to discover its tools, or select Edit to update its configuration.</p><button onClick={()=>open()} className="mt-5 text-xs underline">Add another server</button></div>}
      </div></div></div>
  </section>;
}
