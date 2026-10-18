import React,{useState} from 'react';
import {ArrowLeft,ExternalLink,RefreshCw,Unplug} from 'lucide-react';
import {ServiceId,SERVICE_METADATA,McpServerConfig} from './types';
import {getServiceState,connectService,authorizeService,disconnectService} from './integrationStore';
import {renderIntegrationLogo} from './IntegrationLogos';

export const PluginDetailCanvas:React.FC<{serviceId:ServiceId;onBack:()=>void;workspaceRoot?:string}>=({serviceId,onBack,workspaceRoot})=>{
 const preset=SERVICE_METADATA[serviceId];
 const [state,setState]=useState(()=>getServiceState(serviceId));
 const saved=state.config;
 const [transport,setTransport]=useState<McpServerConfig['transport']>(saved?.transport??(preset.endpoint?'streamable-http':'stdio'));
 const [url,setUrl]=useState(saved?.url??preset.endpoint??'');
 const [command,setCommand]=useState(saved?.command??preset.command??'');
 const [args,setArgs]=useState(JSON.stringify(saved?.args??preset.args??[]));
 const [cwd,setCwd]=useState(saved?.cwd??workspaceRoot??'');
 const [domains,setDomains]=useState(JSON.stringify(saved?.allowedDomains??[]));
 const [env,setEnv]=useState(JSON.stringify(saved?.env??{}));
 const [headers,setHeaders]=useState(JSON.stringify(saved?.headers??{}));
 const [token,setToken]=useState('');
 const [clientId,setClientId]=useState(saved?.oauthClientId??'');
 const [clientSecret,setClientSecret]=useState(saved?.oauthClientSecret??'');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [authUrl,setAuthUrl]=useState('');
 const field='w-full rounded-lg bg-[var(--bg-app)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-main)] outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]';
 const parseMap=(text:string):Record<string,string>=>{const value:unknown=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string'))throw new Error('Headers and environment must be JSON objects with string values.');return value as Record<string,string>;};
 const config=():McpServerConfig=>{
   const argumentsList:unknown=JSON.parse(args);if(!Array.isArray(argumentsList)||argumentsList.some(arg=>typeof arg!=='string'))throw new Error('Arguments must be a JSON array of strings.');
   const allowedDomains:unknown=transport==='stdio'?JSON.parse(domains):[];if(!Array.isArray(allowedDomains)||allowedDomains.some(d=>typeof d!=='string'))throw new Error('Allowed domains must be a JSON array of hostnames.');
   const extraHeaders=parseMap(headers);if(token.trim())extraHeaders.Authorization=`Bearer ${token.trim()}`;
   return {id:serviceId,name:preset.name,transport,enabled:true,...(transport==='stdio'?{command,args:argumentsList as string[],env:parseMap(env),cwd:cwd.trim()||undefined,allowedDomains:allowedDomains as string[]}:{url,headers:extraHeaders,oauthClientId:clientId.trim()||undefined,oauthClientSecret:clientSecret||undefined})};
 };
 const disconnect=async()=>{try{await disconnectService(serviceId);setState(getServiceState(serviceId));setMessage('Disconnected.');}catch(error){setMessage(String(error));}};
 const connect=async(oauth:boolean)=>{setBusy(true);setMessage('');setAuthUrl('');try{const selected=config();if(state.isConnected)await disconnectService(serviceId);if(oauth){const flow=await authorizeService(serviceId,selected);setAuthUrl(flow.url);const result=await flow.complete();setMessage(result.message);}else{const result=await connectService(serviceId,selected);setMessage(result.message);}setState(getServiceState(serviceId));}catch(error){setMessage(typeof error==='string'?error:error instanceof Error?error.message:'Connection failed.');}finally{setBusy(false);setAuthUrl('');}};
 return <div className="text-[var(--text-main)] pb-6">
  <button onClick={onBack} className="flex items-center gap-2 text-xs mb-6"><ArrowLeft size={14}/>All integrations</button>
  <header className="flex items-center gap-4 mb-4">{renderIntegrationLogo(serviceId,32)}<div><h2 className="text-xl font-semibold">{preset.name}</h2><p className="text-xs text-[var(--text-muted)] mt-1">{preset.description}</p></div></header>
  <p className="text-xs leading-6 text-[var(--text-muted)]">{preset.requirement}</p>
  <a href={preset.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs underline mt-2">Official setup documentation<ExternalLink size={12}/></a>
  <p role="status" className="text-xs my-5">{state.isConnected?`Connected · ${state.tools.length} tools discovered`:'Not connected'}</p>
  {preset.unavailable?<p className="text-xs text-[var(--text-muted)]">This preset is unavailable. Use a supported service or configure a reviewed Custom MCP server.</p>:<fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
    <label className="block text-xs">Transport<select value={transport} onChange={e=>setTransport(e.target.value as McpServerConfig['transport'])} className={`${field} mt-2`}><option value="streamable-http">Streamable HTTP</option><option value="stdio">Local stdio</option></select></label>
    {transport==='streamable-http'?<>
      <label className="block text-xs">MCP endpoint<input type="url" value={url} onChange={e=>setUrl(e.target.value)} className={`${field} mt-2`}/></label>
      <label className="block text-xs">Bearer token, if required<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} className={`${field} mt-2`}/></label>
      <details><summary className="text-xs cursor-pointer">OAuth client and request headers</summary><div className="space-y-3 mt-3"><label className="block text-xs">Registered OAuth client ID, if required<input value={clientId} onChange={e=>setClientId(e.target.value)} className={`${field} mt-2`}/></label><label className="block text-xs">OAuth client secret, if required<input type="password" autoComplete="off" value={clientSecret} onChange={e=>setClientSecret(e.target.value)} className={`${field} mt-2`}/></label><label className="block text-xs">Additional headers (JSON)<textarea value={headers} onChange={e=>setHeaders(e.target.value)} className={`${field} mt-2 font-mono`}/></label></div></details>
    </>:<>
      <label className="block text-xs">Installed executable<input value={command} onChange={e=>setCommand(e.target.value)} placeholder="Absolute executable path or command on PATH" className={`${field} mt-2`}/></label>
      <label className="block text-xs">Arguments (JSON array)<textarea value={args} onChange={e=>setArgs(e.target.value)} className={`${field} mt-2 font-mono`}/></label>
      <label className="block text-xs">Sandbox workspace<input value={cwd} onChange={e=>setCwd(e.target.value)} placeholder="Absolute project directory" className={`${field} mt-2`}/></label>
      <label className="block text-xs">Allowed network domains (JSON array)<textarea value={domains} onChange={e=>setDomains(e.target.value)} placeholder='["api.example.com"]' className={`${field} mt-2 font-mono`}/><span className="block mt-1 text-[var(--text-muted)]">Local servers run through SRT. An empty list denies network access.</span></label>
      <label className="block text-xs">Environment (JSON object)<textarea value={env} onChange={e=>setEnv(e.target.value)} className={`${field} mt-2 font-mono`}/></label>
    </>}
    <div className="flex gap-3"><button onClick={()=>connect(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-xs"><RefreshCw size={13}/>{busy?'Connecting…':'Connect and discover'}</button>{transport==='streamable-http'&&<button onClick={()=>connect(true)} className="px-3 py-2 text-xs rounded-lg bg-[var(--bg-active)]">Authorize in browser</button>}</div>
  </fieldset>}
  {authUrl&&<a href={authUrl} target="_blank" rel="noreferrer" className="block text-sm underline my-4">Open authorization page</a>}
  {busy&&<button className="text-xs underline mt-3" onClick={disconnect}>Cancel connection</button>}
  {message&&<p role="status" className="text-xs leading-5 mt-4 break-words">{message}</p>}
  <p className="text-[11px] leading-5 text-[var(--text-muted)] mt-5">Connections and credentials are kept for this app session only. External tool calls require approval. A successful connection does not bypass vendor access restrictions.</p>
  {state.isConnected&&<button className="flex items-center gap-2 text-xs mt-4" onClick={disconnect}><Unplug size={13}/>Disconnect</button>}
  <section className="mt-6"><h3 className="text-xs font-medium">Discovered tools</h3>{state.tools.length===0?<p className="text-xs text-[var(--text-muted)] mt-3">Connect to discover the server’s actual tools and schemas.</p>:state.tools.map(tool=><details key={tool.name} className="py-3 border-b border-[var(--border-subtle)]"><summary className="text-xs cursor-pointer font-mono">{tool.name}</summary><p className="text-xs mt-2 text-[var(--text-muted)]">{tool.description}</p><pre className="text-[10px] whitespace-pre-wrap break-all mt-3">{JSON.stringify({inputSchema:tool.inputSchema,outputSchema:tool.outputSchema,annotations:tool.annotations},null,2)}</pre></details>)}</section>
 </div>;
};
