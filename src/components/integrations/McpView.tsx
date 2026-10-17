import { useState } from 'react';
import { Plus, Server, Trash2 } from 'lucide-react';
import { McpLogo } from './IntegrationLogos';
import { getMcpServers, saveMcpServer, deleteMcpServer } from './integrationStore';
import type { McpServerConfig } from './types';

const inputClass = 'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--text-muted)]';

export function McpView() {
  const [servers, setServers] = useState(getMcpServers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<McpServerConfig['transport']>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('[]');
  const [url, setUrl] = useState('');
  const [cwd, setCwd] = useState('');
  const [error, setError] = useState('');

  function openForm(server?: McpServerConfig) {
    setEditingId(server?.id ?? null);
    setName(server?.name ?? '');
    setTransport(server?.transport ?? 'stdio');
    setCommand(server?.command ?? '');
    setArgs(JSON.stringify(server?.args ?? []));
    setUrl(server?.url ?? '');
    setCwd(server?.cwd ?? '');
    setError('');
    setShowForm(true);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    try {
      if (!name.trim()) throw new Error('Enter a server name.');
      let parsedArgs: string[] = [];
      if (transport === 'stdio') {
        if (!command.trim()) throw new Error('Enter the command used to start your MCP server.');
        const parsed: unknown = JSON.parse(args);
        if (!Array.isArray(parsed) || !parsed.every(value => typeof value === 'string')) {
          throw new Error('Arguments must be a JSON array of strings.');
        }
        parsedArgs = parsed;
      } else {
        let endpoint: URL;
        try { endpoint = new URL(url.trim()); } catch { throw new Error('Enter a complete server URL.'); }
        const protocols = transport === 'sse' ? ['http:', 'https:'] : ['ws:', 'wss:'];
        if (!protocols.includes(endpoint.protocol)) throw new Error(transport === 'sse' ? 'Use an HTTP or HTTPS URL.' : 'Use a WS or WSS URL.');
      }
      const previous = servers.find(server => server.id === editingId);
      const config: McpServerConfig = {
        ...previous,
        id: editingId ?? crypto.randomUUID(), name: name.trim(), transport,
        command: transport === 'stdio' ? command.trim() : undefined,
        args: transport === 'stdio' ? parsedArgs : undefined,
        cwd: transport === 'stdio' ? cwd.trim() || undefined : undefined,
        url: transport !== 'stdio' ? url.trim() : undefined,
        status: 'disconnected', enabled: previous?.enabled ?? true,
      };
      saveMcpServer(config);
      if (!getMcpServers().some(server => server.id === config.id && server.name === config.name)) {
        throw new Error('Could not save this server on your device.');
      }
      setServers(getMcpServers());
      setShowForm(false);
    } catch (failure) {
      setError(failure instanceof SyntaxError ? 'Arguments must be valid JSON, for example ["-y", "your-mcp-package"].' : String(failure instanceof Error ? failure.message : failure));
    }
  }

  return (
    <section className="h-full w-full overflow-y-auto p-6 text-[var(--text-main)]" style={{ backgroundColor: 'var(--bg-app)' }}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3"><McpLogo size={28} /><div>
            <h1 className="text-xl font-semibold">MCP servers</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Add your own tools and services with Model Context Protocol.</p>
          </div></div>
          <button onClick={() => openForm()} className="flex shrink-0 items-center gap-2 rounded-lg bg-[var(--bg-active)] px-3 py-2 text-sm hover:bg-[var(--bg-surface-hover)]"><Plus size={16} />Add server</button>
        </header>

        <p role="status" className="rounded-lg border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-muted)]">
          Server configurations are saved on this device. Live MCP connections are not available in this build yet.
        </p>

        {showForm && <form onSubmit={save} className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
          <h2 className="font-semibold">{editingId ? 'Edit server' : 'Add MCP server'}</h2>
          <label className="block space-y-1 text-sm"><span>Name</span><input autoFocus required value={name} onChange={event => setName(event.target.value)} placeholder="My MCP server" className={inputClass} /></label>
          <label className="block space-y-1 text-sm"><span>Transport</span><select value={transport} onChange={event => setTransport(event.target.value as McpServerConfig['transport'])} className={inputClass}>
            <option value="stdio">Local command (stdio)</option><option value="sse">Remote server (SSE)</option><option value="websocket">Remote server (WebSocket)</option>
          </select></label>
          {transport === 'stdio' ? <>
            <label className="block space-y-1 text-sm"><span>Command</span><input required value={command} onChange={event => setCommand(event.target.value)} placeholder="npx, uvx, or an executable path" className={inputClass} /></label>
            <label className="block space-y-1 text-sm"><span>Arguments (JSON array)</span><textarea value={args} onChange={event => setArgs(event.target.value)} placeholder={'["-y", "your-mcp-package"]'} className={`${inputClass} font-mono`} rows={3} /></label>
            <label className="block space-y-1 text-sm"><span>Working directory (optional)</span><input value={cwd} onChange={event => setCwd(event.target.value)} className={inputClass} /></label>
          </> : <label className="block space-y-1 text-sm"><span>Server URL</span><input required type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder={transport === 'sse' ? 'https://your-server.example/sse' : 'wss://your-server.example'} className={inputClass} /></label>}
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-surface-hover)]">Cancel</button><button type="submit" className="rounded-lg bg-[var(--bg-active)] px-3 py-2 text-sm hover:bg-[var(--bg-surface-hover)]">Save server</button></div>
        </form>}

        {servers.length ? <ul className="space-y-3">{servers.map(server => <li key={server.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
          <Server size={20} className="shrink-0 text-[var(--text-muted)]" />
          <button className="min-w-0 flex-1 text-left" onClick={() => openForm(server)}><span className="block truncate font-medium">{server.name}</span><span className="block truncate text-xs text-[var(--text-muted)]">{server.transport} · {server.transport === 'stdio' ? server.command : server.url}</span></button>
          <span className="text-xs text-[var(--text-muted)]">Saved</span>
          <button title={`Remove ${server.name}`} aria-label={`Remove ${server.name}`} onClick={() => { deleteMcpServer(server.id); setServers(getMcpServers()); }} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]"><Trash2 size={16} /></button>
        </li>)}</ul> : !showForm && <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border-subtle)] px-6 py-14 text-center">
          <McpLogo size={40} /><h2 className="mt-4 font-semibold">Your tools, your choice</h2><p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">Add a local command or remote server using the configuration supplied by its provider.</p><button onClick={() => openForm()} className="mt-5 rounded-lg bg-[var(--bg-active)] px-4 py-2 text-sm">Add your first server</button>
        </div>}
      </div>
    </section>
  );
}
