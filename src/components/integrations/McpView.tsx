import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { McpServerConfig, TestResult } from './types';
import {
  getMcpServers,
  saveMcpServer,
  deleteMcpServer,
  toggleMcpServer,
  testMcpServerConnection,
  subscribeIntegrations,
} from './integrationStore';

export const McpView: React.FC = () => {
  const [servers, setServers] = useState<McpServerConfig[]>(getMcpServers());
  const [selectedId, setSelectedId] = useState<string>(servers[0]?.id || '');
  const [isAdding, setIsAdding] = useState(false);

  // Form state for creating/editing server
  const [formName, setFormName] = useState('');
  const [formTransport, setFormTransport] = useState<'stdio' | 'sse'>('stdio');
  const [formCommand, setFormCommand] = useState('npx');
  const [formArgs, setFormArgs] = useState('-y @modelcontextprotocol/server-filesystem ./');
  const [formUrl, setFormUrl] = useState('http://localhost:8080/sse');
  const [formCwd, setFormCwd] = useState('');
  const [formAutoApprove, setFormAutoApprove] = useState('');
  const [formTimeout, setFormTimeout] = useState('');
  const [formHeaders, setFormHeaders] = useState('');
  const [formEnv, setFormEnv] = useState('');

  // Testing feedback
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    setServers(getMcpServers());
    const unsub = subscribeIntegrations(() => {
      setServers(getMcpServers());
    });
    return unsub;
  }, []);

  const selectedServer = servers.find((s) => s.id === selectedId) || servers[0];

  useEffect(() => {
    if (selectedServer && !isAdding) {
      setFormName(selectedServer.name);
      setFormTransport(selectedServer.transport === 'sse' ? 'sse' : 'stdio');
      setFormCommand(selectedServer.command || 'npx');
      setFormArgs(selectedServer.args?.join(' ') || '');
      setFormUrl(selectedServer.url || '');
      setFormCwd(selectedServer.cwd || '');
      setFormAutoApprove(selectedServer.autoApprove?.join(', ') || '');
      setFormTimeout(selectedServer.timeout ? String(selectedServer.timeout) : '');
      setFormHeaders(
        selectedServer.headers && Object.keys(selectedServer.headers).length > 0
          ? JSON.stringify(selectedServer.headers, null, 2)
          : ''
      );
      setFormEnv(
        selectedServer.env && Object.keys(selectedServer.env).length > 0
          ? JSON.stringify(selectedServer.env, null, 2)
          : ''
      );
      setTestResult(null);
    }
  }, [selectedId, isAdding, servers]);

  const handleStartAdd = () => {
    setIsAdding(true);
    setFormName('Custom MCP Server');
    setFormTransport('stdio');
    setFormCommand('npx');
    setFormArgs('-y @modelcontextprotocol/server-fetch');
    setFormUrl('');
    setFormCwd('./');
    setFormAutoApprove('');
    setFormTimeout('60');
    setFormHeaders('');
    setFormEnv('');
    setTestResult(null);
  };

  const handleSaveForm = async () => {
    let parsedEnv: Record<string, string> = {};
    if (formEnv.trim()) {
      try {
        parsedEnv = JSON.parse(formEnv);
      } catch (err) {
        setTestResult({
          success: false,
          message: 'Invalid JSON format for Environment Variables',
          latencyMs: 0,
        });
        return;
      }
    }

    let parsedHeaders: Record<string, string> = {};
    if (formHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(formHeaders);
      } catch (err) {
        setTestResult({
          success: false,
          message: 'Invalid JSON format for HTTP Headers',
          latencyMs: 0,
        });
        return;
      }
    }

    const autoApproveList = formAutoApprove
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedTimeout = formTimeout.trim() ? parseInt(formTimeout.trim(), 10) : undefined;

    const newServer: McpServerConfig = {
      id: isAdding ? `mcp-${Date.now().toString(36)}` : selectedServer.id,
      name: formName.trim() || 'MCP Server',
      transport: formTransport,
      command: formTransport === 'stdio' ? formCommand.trim() : undefined,
      args:
        formTransport === 'stdio'
          ? formArgs
              .split(' ')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      url: formTransport === 'sse' ? formUrl.trim() : undefined,
      headers: formTransport === 'sse' && Object.keys(parsedHeaders).length > 0 ? parsedHeaders : undefined,
      cwd: formTransport === 'stdio' && formCwd.trim() ? formCwd.trim() : undefined,
      autoApprove: autoApproveList.length > 0 ? autoApproveList : undefined,
      timeout: Number.isFinite(parsedTimeout) ? parsedTimeout : undefined,
      env: Object.keys(parsedEnv).length > 0 ? parsedEnv : undefined,
      enabled: isAdding ? true : selectedServer?.enabled ?? true,
      toolsCount: selectedServer?.toolsCount || 4,
      status: 'connected',
    };

    saveMcpServer(newServer);
    setSelectedId(newServer.id);
    setIsAdding(false);
    setTestResult({
      success: true,
      message: 'Server configuration saved',
      latencyMs: 0,
    });
  };

  const handleDelete = (id: string) => {
    deleteMcpServer(id);
    const remaining = servers.filter((s) => s.id !== id);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
    } else {
      handleStartAdd();
    }
  };

  const handleToggle = (id: string, current: boolean) => {
    toggleMcpServer(id, !current);
  };

  const handleTestServer = async () => {
    if (!selectedServer && !isAdding) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const mockConfig: McpServerConfig = {
        id: selectedServer?.id || 'temp',
        name: formName,
        transport: formTransport,
        command: formCommand,
        args: formArgs.split(' ').filter(Boolean),
        url: formUrl,
        cwd: formCwd.trim() || undefined,
        status: 'connected',
        enabled: true,
      };
      const res = await testMcpServerConnection(mockConfig);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const fullCommandPreview =
    formTransport === 'stdio'
      ? `${formCommand} ${formArgs}`.trim()
      : formUrl || 'http://localhost:8080/sse';

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#18181b]">
      {/* LEFT SIDEBAR: INSTALLED SERVERS LIST */}
      <div className="w-44 border-r border-white/[0.06] bg-[#18181b] py-2.5 flex flex-col justify-between shrink-0">
        <div className="overflow-y-auto popup-scroll flex-1">
          <div className="flex items-center justify-between px-3 py-1 mb-1.5">
            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
              Servers ({servers.length})
            </span>
            <button
              type="button"
              onClick={handleStartAdd}
              className="flex items-center gap-1 text-[10.5px] text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 rounded-md border border-white/[0.06] transition-colors cursor-pointer"
              title="Add MCP Server"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </div>

          {servers.map((srv) => {
            const isSelected = !isAdding && selectedServer?.id === srv.id;
            return (
              <div
                key={srv.id}
                onClick={() => {
                  setSelectedId(srv.id);
                  setIsAdding(false);
                }}
                className={`w-full text-left pl-3 pr-2.5 py-2.5 flex items-center justify-between transition-all duration-150 cursor-pointer outline-none select-none relative ${
                  isSelected
                    ? 'border-l-2 border-white bg-white/[0.08] text-white shadow-xs'
                    : 'border-l-2 border-transparent text-white/50 hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1 pl-0.5">
                  <span className="truncate text-xs font-semibold text-white tracking-tight leading-snug">
                    {srv.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/40 truncate mt-0.5">
                    {srv.transport === 'sse'
                      ? srv.url || 'remote sse'
                      : srv.command
                        ? `${srv.command} ${srv.args?.[0] || ''}`.trim()
                        : 'command'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: CLEAN PROFESSIONAL MCP CONFIGURATION FORM */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#18181b] popup-scroll flex flex-col justify-between">
        <div className="space-y-3">
            {/* LIVE COMMAND PREVIEW */}
            <div className="rounded-xl border border-white/[0.06] bg-[#121214] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <code className="text-[11px] font-mono text-white/80 truncate">
                  <span className="text-white/30 select-none mr-1.5">❯</span>
                  {fullCommandPreview || '<empty>'}
                </code>
              </div>
            </div>

            {/* FORM INPUTS (BOLD WHITE LABELS, NO EXTRA SUBTEXT) */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Server Identifier
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. filesystem, postgres, git"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Transport Protocol
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFormTransport('stdio')}
                      className={`h-7 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        formTransport === 'stdio'
                          ? 'bg-white/[0.1] text-white shadow-xs'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      stdio
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTransport('sse')}
                      className={`h-7 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        formTransport === 'sse'
                          ? 'bg-white/[0.1] text-white shadow-xs'
                          : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      SSE
                    </button>
                  </div>
                </div>
              </div>

              {formTransport === 'stdio' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Command
                      </label>
                      <input
                        type="text"
                        value={formCommand}
                        onChange={(e) => setFormCommand(e.target.value)}
                        placeholder="npx / uvx / node / python"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Arguments
                      </label>
                      <input
                        type="text"
                        value={formArgs}
                        onChange={(e) => setFormArgs(e.target.value)}
                        placeholder="-y @modelcontextprotocol/server-filesystem ./src"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Working Directory
                      </label>
                      <input
                        type="text"
                        value={formCwd}
                        onChange={(e) => setFormCwd(e.target.value)}
                        placeholder="./ or /Users/username/workspace"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Timeout
                      </label>
                      <input
                        type="number"
                        value={formTimeout}
                        onChange={(e) => setFormTimeout(e.target.value)}
                        placeholder="60"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Auto-Approve Tools
                    </label>
                    <input
                      type="text"
                      value={formAutoApprove}
                      onChange={(e) => setFormAutoApprove(e.target.value)}
                      placeholder="read_file, list_dir, search_files"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Environment Variables
                    </label>
                    <textarea
                      value={formEnv}
                      onChange={(e) => setFormEnv(e.target.value)}
                      placeholder={'{\n  "API_KEY": "xxx",\n  "WORKSPACE_PATH": "/Users/..."\n}'}
                      rows={2.5}
                      spellCheck={false}
                      className="w-full p-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[10.5px] outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      SSE Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="http://localhost:8080/sse or https://mcp.domain.com/events"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Auto-Approve Tools
                      </label>
                      <input
                        type="text"
                        value={formAutoApprove}
                        onChange={(e) => setFormAutoApprove(e.target.value)}
                        placeholder="query, get_schema"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white mb-1.5">
                        Timeout
                      </label>
                      <input
                        type="number"
                        value={formTimeout}
                        onChange={(e) => setFormTimeout(e.target.value)}
                        placeholder="60"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      HTTP Request Headers
                    </label>
                    <textarea
                      value={formHeaders}
                      onChange={(e) => setFormHeaders(e.target.value)}
                      placeholder={'{\n  "Authorization": "Bearer token_xxx",\n  "X-Custom-Header": "value"\n}'}
                      rows={2.5}
                      spellCheck={false}
                      className="w-full p-2.5 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[10.5px] outline-none transition-all resize-none leading-relaxed"
                    />
                  </div>
                </>
              )}
            </div>

            {/* DIAGNOSTIC TEST RESULT */}
            {testResult && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-tight">{testResult.message}</p>
                  {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                    <span className="text-[9.5px] font-mono text-white/40 block mt-0.5">
                      Handshake Latency: {testResult.latencyMs}ms • JSON-RPC v2.0
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS (NO DIVIDER LINE, ALIGNED AT EXACT SAME HEIGHT AS RAW JSON) */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {isAdding ? (
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="h-8 px-2 text-xs text-white/50 hover:text-white transition-colors cursor-pointer flex items-center"
                >
                  Cancel
                </button>
              ) : (
                selectedServer && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedServer.id)}
                    className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors font-medium cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isAdding && selectedServer && (
                <button
                  type="button"
                  onClick={() => handleToggle(selectedServer.id, selectedServer.enabled ?? true)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs border flex items-center gap-1.5 ${
                    selectedServer.enabled
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                      : 'bg-zinc-800/80 text-zinc-400 border-white/[0.06] hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedServer.enabled
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                        : 'bg-zinc-500'
                    }`}
                  />
                  <span>{selectedServer.enabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveForm}
                disabled={isTesting}
                className="h-8 px-4 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Save Server
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};
