import { useState } from 'react';
import { Plus, Server, Trash2, Unplug, Pencil } from 'lucide-react';
import { McpLogo } from './IntegrationLogos';
import type { McpServerConfig } from './types';
import { getCustomMcpServers, saveCustomMcpServer, connectCustomMcpServer, disconnectCustomMcpServer } from './integrationStore';

const field = 'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]';
function stringMap(text:string):Record<string,string>{
  const value:unknown=JSON.parse(text);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(item=>typeof item!=='string'))throw new Error('Environment and headers must contain string values.');
  return value as Record<string,string>;
}

export function McpView({workspaceRoot}:{workspaceRoot:string}) {
  const [servers,setServers]=useState(getCustomMcpServers);
  const [editing,setEditing]=useState<string|null>(null);
  const [name,setName]=useState('');
  const [transport,setTransport]=useState<McpServerConfig['transport']>('stdio');
  const [command,setCommand]=useState('');
  const [args,setArgs]=useState('[]');
  const [cwd,setCwd]=useState(workspaceRoot);
  const [domains,setDomains]=useState('[]');
  const [environment,setEnvironment]=useState('{}');
  const [url,setUrl]=useState('');
  const [headers,setHeaders]=useState('{}');
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState('');

  function open(config?:McpServerConfig){
    setEditing(config?.id??`custom-${crypto.randomUUID()}`);setName(config?.name??'');setTransport(config?.transport??'stdio');
    setCommand(config?.command??'');setArgs(JSON.stringify(config?.args??[]));setCwd(config?.cwd??workspaceRoot);setDomains(JSON.stringify(config?.allowedDomains??[]));
    setEnvironment(JSON.stringify(config?.env??{}));setUrl(config?.url??'');setHeaders(JSON.stringify(config?.headers??{}));setError('');
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
    }catch(failure){setError(failure instanceof SyntaxError?'Enter valid JSON in the configuration fields.':String(failure instanceof Error?failure.message:failure));}
  }
  async function connect(config:McpServerConfig){
    setBusy(config.id);setError('');
    try{const result=await connectCustomMcpServer(config);if(!result.success)setError(result.message);}catch(failure){setError(String(failure));}
    finally{setServers(getCustomMcpServers());setBusy(null);}
  }
  async function disconnect(id:string,remove=false){
    setError('');try{await disconnectCustomMcpServer(id,remove);setServers(getCustomMcpServers());}catch(failure){setError(String(failure));}
  }
  return <section className="h-full overflow-y-auto p-6 text-[var(--text-main)] bg-[var(--bg-app)]">
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><McpLogo size={28}/><h1 className="text-xl font-semibold">MCP servers</h1></div><button onClick={()=>open()} className="inline-flex items-center gap-2 rounded-lg bg-[var(--bg-active)] px-3 py-2 text-sm"><Plus size={16}/>Add server</button></header>
      <p className="text-sm leading-6 text-[var(--text-muted)]">Connect local stdio or remote Streamable HTTP servers. Configurations and credentials stay in memory for this app session. Local servers run through SRT; tool calls require approval.</p>
      {error&&<p role="alert" id="mcp-error" className="text-sm text-red-400 break-words">{error}</p>}
      {editing&&<form onSubmit={save} aria-describedby={error?'mcp-error':undefined} className="space-y-4 rounded-xl bg-[var(--bg-panel)] p-5">
        <h2 className="font-semibold">Server configuration</h2>
        <label className="block space-y-1 text-sm"><span>Name</span><input autoFocus required value={name} onChange={event=>setName(event.target.value)} className={field}/></label>
        <label className="block space-y-1 text-sm"><span>Transport</span><select value={transport} onChange={event=>setTransport(event.target.value as McpServerConfig['transport'])} className={field}><option value="stdio">Local command (stdio)</option><option value="streamable-http">Streamable HTTP</option></select></label>
        {transport==='stdio'?<>
          <label className="block space-y-1 text-sm"><span>Installed executable</span><input required value={command} onChange={event=>setCommand(event.target.value)} placeholder="Absolute executable path or command on PATH" className={field}/></label>
          <label className="block space-y-1 text-sm"><span>Arguments (JSON array)</span><textarea value={args} onChange={event=>setArgs(event.target.value)} className={`${field} font-mono`}/></label>
          <label className="block space-y-1 text-sm"><span>Sandbox workspace</span><input required value={cwd} onChange={event=>setCwd(event.target.value)} placeholder="Absolute project directory" className={field}/></label>
          <label className="block space-y-1 text-sm"><span>Allowed network domains (JSON array)</span><textarea value={domains} onChange={event=>setDomains(event.target.value)} className={`${field} font-mono`}/></label>
          <p className="text-xs text-[var(--text-muted)]">An empty domain list denies network access.</p>
          <label className="block space-y-1 text-sm"><span>Environment (JSON object)</span><textarea value={environment} onChange={event=>setEnvironment(event.target.value)} className={`${field} font-mono`}/></label>
        </>:<>
          <label className="block space-y-1 text-sm"><span>MCP endpoint</span><input type="url" required value={url} onChange={event=>setUrl(event.target.value)} className={field}/></label>
          <label className="block space-y-1 text-sm"><span>Request headers (JSON object)</span><textarea value={headers} onChange={event=>setHeaders(event.target.value)} className={`${field} font-mono`}/></label>
        </>}
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>{setEditing(null);setEnvironment('{}');setHeaders('{}');}} className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-surface-hover)]">Cancel</button><button className="rounded-lg bg-[var(--bg-active)] px-3 py-2 text-sm">Save server</button></div>
      </form>}
      {servers.length?<ul className="divide-y divide-[var(--border-subtle)]">{servers.map(({config,result})=><li key={config.id} className="py-4">
        <div className="flex items-center gap-3"><Server size={20} className="shrink-0 text-[var(--text-muted)]"/><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-medium">{config.name}</h2><p className="truncate text-xs text-[var(--text-muted)]">{config.transport} · {config.transport==='stdio'?config.command:config.url}</p><p role="status" className="text-xs mt-1 text-[var(--text-muted)]">{busy===config.id?'Connecting…':result?.success?`Connected · ${result.toolsCount} tools`:'Not connected'}</p></div>
          {result?.success?<button aria-label={`Disconnect ${config.name}`} onClick={()=>void disconnect(config.id)} className="p-2"><Unplug size={16}/></button>:<><button disabled={busy!==null} onClick={()=>void connect(config)} className="rounded-lg bg-[var(--bg-active)] px-3 py-2 text-xs disabled:opacity-40">Connect</button><button disabled={busy===config.id} aria-label={`Edit ${config.name}`} onClick={()=>open(config)} className="p-2 disabled:opacity-40"><Pencil size={16}/></button></>}
          <button aria-label={`Remove ${config.name}`} onClick={()=>void disconnect(config.id,true)} className="p-2"><Trash2 size={16}/></button>
        </div>
        {result?.success&&<details className="mt-3 text-xs"><summary className="cursor-pointer">Discovered tools</summary><ul className="mt-2 space-y-2">{result.tools.map(tool=><li key={tool.name}><span className="font-mono">{tool.name}</span>{tool.description&&<p className="text-[var(--text-muted)] mt-1">{tool.description}</p>}</li>)}</ul></details>}
      </li>)}</ul>:!editing&&<div className="py-14 text-center"><McpLogo size={40}/><h2 className="mt-4 font-medium">Your tools, your choice</h2><p className="mt-2 text-sm text-[var(--text-muted)]">Add a reviewed local executable or an MCP endpoint from its provider.</p><button onClick={()=>open()} className="mt-5 rounded-lg bg-[var(--bg-active)] px-4 py-2 text-sm">Add your first server</button></div>}
    </div>
  </section>;
}
