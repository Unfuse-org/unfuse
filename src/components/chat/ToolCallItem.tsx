import React, { useState } from 'react';
import {
  FileCode,
  FileEdit,
  Terminal,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  FolderSearch,
  Trash2,
  Globe,
  Brain,
  ExternalLink,
  RotateCcw,
  Play,
  X,
} from 'lucide-react';
import { ToolCall } from './types';
import {
  GitHubLogo,
  LinearLogo,
  SentryLogo,
  SlackLogo,
  PostgreSQLLogo,
  SQLiteLogo,
  BraveLogo,
  TavilyLogo,
  DuckDuckGoLogo,
  ExaLogo,
  GoogleLogo,
  McpLogo,
} from '../integrations/IntegrationLogos';
import {
  buildPlatformShellCommand,
  buildPlatformDeleteCommand,
  buildPlatformReadCommand,
  buildPlatformSearchCommand,
  buildPlatformFindCommand,
} from '../../engine/runtimeAdapter';

interface ToolCallItemProps {
  tool: ToolCall;
}

interface ParsedTool {
  actionVerb: string;
  targetDescription: string;
  shellCommand?: string;
  path?: string;
  icon: React.ReactNode;
  badge?: string;
}

function parseToolInfo(tool: ToolCall): ParsedTool {
  const name = (tool.name || '').toLowerCase();
  const args = tool.args || {};

  // 1. MCP TOOLS (PREFIX: mcp_)
  if (name.startsWith('mcp_') || name.startsWith('mcp:')) {
    const cleanName = name.replace(/^(mcp_|mcp:)/, '');
    const parts = cleanName.split('_');
    const serverName = parts[0] || 'mcp';
    const method = parts.slice(1).join('_') || cleanName;

    let icon: React.ReactNode = <McpLogo size={14} className="w-3.5 h-3.5 text-white/90 shrink-0" />;
    let desc = JSON.stringify(args);

    if (serverName === 'filesystem' || serverName === 'files') {
      const path = (args.path || args.directory || args.filePath || '') as string;
      desc = path ? `${method} '${path}'` : method;
      icon = <FileCode className="w-3.5 h-3.5 text-amber-300/85 shrink-0" />;
    } else if (serverName === 'github' || serverName === 'git') {
      const query = (args.query || args.repo || args.issueTitle || '') as string;
      desc = query ? `${method} "${query}"` : method;
      icon = <GitHubLogo size={14} className="w-3.5 h-3.5 text-white shrink-0" />;
    } else if (serverName === 'postgres' || serverName === 'sql' || serverName === 'db') {
      const query = (args.query || args.sql || '') as string;
      desc = query ? `${query.slice(0, 50)}${query.length > 50 ? '...' : ''}` : method;
      icon = <PostgreSQLLogo size={14} className="w-3.5 h-3.5 shrink-0" />;
    } else if (serverName === 'puppeteer' || serverName === 'browser') {
      const url = (args.url || args.selector || '') as string;
      desc = url ? `${method} ${url}` : method;
      icon = <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    } else if (serverName === 'memory') {
      desc = `${method} (${Object.keys(args).length} keys)`;
      icon = <Brain className="w-3.5 h-3.5 text-purple-300 shrink-0" />;
    }

    return {
      actionVerb: `MCP [${serverName}]`,
      targetDescription: desc,
      icon,
    };
  }

  // 2. NATIVE INTEGRATIONS (WEB SEARCH)
  if (name.includes('brave')) {
    const query = (args.query || args.searchQuery || '') as string;
    return {
      actionVerb: 'Brave Search',
      targetDescription: query ? `"${query}"` : 'web',
      icon: <BraveLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.includes('tavily')) {
    const query = (args.query || args.searchQuery || '') as string;
    return {
      actionVerb: 'Tavily Search',
      targetDescription: query ? `"${query}"` : 'web intelligence',
      icon: <TavilyLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.includes('duckduckgo') || name.includes('ddg')) {
    const query = (args.query || args.searchQuery || '') as string;
    return {
      actionVerb: 'DuckDuckGo',
      targetDescription: query ? `"${query}"` : 'web',
      icon: <DuckDuckGoLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.includes('exa')) {
    const query = (args.query || args.searchQuery || '') as string;
    return {
      actionVerb: 'Exa Neural',
      targetDescription: query ? `"${query}"` : 'web embeddings',
      icon: <ExaLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.includes('google_search') || name.includes('google_custom')) {
    const query = (args.query || args.searchQuery || '') as string;
    return {
      actionVerb: 'Google Search',
      targetDescription: query ? `"${query}"` : 'web',
      icon: <GoogleLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  // 3. NATIVE INTEGRATIONS (DEV & APPS)
  if (name.startsWith('github_')) {
    const action = name.replace('github_', '').replace(/_/g, ' ');
    const repo = (args.repo || args.repository || args.owner || '') as string;
    return {
      actionVerb: `GitHub ${action}`,
      targetDescription: repo ? repo : JSON.stringify(args),
      icon: <GitHubLogo size={14} className="w-3.5 h-3.5 text-white shrink-0" />,
    };
  }

  if (name.startsWith('linear_')) {
    const action = name.replace('linear_', '').replace(/_/g, ' ');
    const title = (args.title || args.issueTitle || args.ticket || '') as string;
    return {
      actionVerb: `Linear ${action}`,
      targetDescription: title ? `"${title}"` : 'Linear GraphQL',
      icon: <LinearLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.startsWith('postgres_') || name.startsWith('postgresql_')) {
    const query = (args.query || args.sql || '') as string;
    return {
      actionVerb: 'PostgreSQL',
      targetDescription: query ? `${query.slice(0, 50)}${query.length > 50 ? '...' : ''}` : 'query',
      icon: <PostgreSQLLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.startsWith('sqlite_')) {
    const query = (args.query || args.sql || '') as string;
    return {
      actionVerb: 'SQLite',
      targetDescription: query ? `${query.slice(0, 50)}${query.length > 50 ? '...' : ''}` : 'query',
      icon: <SQLiteLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.startsWith('sentry_')) {
    const action = name.replace('sentry_', '').replace(/_/g, ' ');
    const proj = (args.project || args.issue || '') as string;
    return {
      actionVerb: `Sentry ${action}`,
      targetDescription: proj ? proj : 'telemetry',
      icon: <SentryLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  if (name.startsWith('slack_')) {
    const action = name.replace('slack_', '').replace(/_/g, ' ');
    const chan = (args.channel || args.recipient || '') as string;
    return {
      actionVerb: `Slack ${action}`,
      targetDescription: chan ? chan : 'message',
      icon: <SlackLogo size={14} className="w-3.5 h-3.5 shrink-0" />,
    };
  }

  // 4. CORE CODEBASE & OS TOOLS (BASIC TOOLS: READ, EDIT, CREATE, SEARCH, FIND, RUN, DELETE)
  // READ FILE
  if (name.includes('read')) {
    const path = (args.path || args.filePath || args.targetFile || args.file || '') as string;
    const start = args.startLine !== undefined ? Number(args.startLine) : args.start !== undefined ? Number(args.start) : undefined;
    const end = args.endLine !== undefined ? Number(args.endLine) : args.end !== undefined ? Number(args.end) : undefined;
    const lineRange = start && end ? ` (lines ${start}-${end})` : '';

    return {
      actionVerb: 'Read',
      targetDescription: path ? `${path}${lineRange}` : 'file',
      shellCommand: buildPlatformReadCommand(path, start, end),
      path,
      icon: <FileCode className="w-3.5 h-3.5 text-amber-300/85 shrink-0" />,
    };
  }

  // PATCH / EDIT FILE
  if (name.includes('patch') || name.includes('edit')) {
    const path = (args.path || args.filePath || args.targetFile || '') as string;
    return {
      actionVerb: 'Edited',
      targetDescription: path || 'file',
      shellCommand: `AST patch '${path}' (Myers Diff)`,
      path,
      icon: <FileEdit className="w-3.5 h-3.5 text-emerald-300/85 shrink-0" />,
    };
  }

  // WRITE / CREATE FILE
  if (name.includes('write') || name.includes('create')) {
    const path = (args.path || args.filePath || args.targetFile || '') as string;
    return {
      actionVerb: 'Created',
      targetDescription: path || 'file',
      shellCommand: `mkdir -p "$(dirname '${path}')" && cat << 'EOF' > '${path}'`,
      path,
      icon: <FileCode className="w-3.5 h-3.5 text-blue-300/85 shrink-0" />,
    };
  }

  // SEARCH CODE
  if (name.includes('search') || name.includes('grep')) {
    const query = (args.query || args.pattern || args.searchQuery || '') as string;
    const path = (args.path || args.searchPath || '') as string;
    return {
      actionVerb: 'Searched',
      targetDescription: query ? `"${query}"${path ? ` in ${path}` : ''}` : 'codebase',
      shellCommand: buildPlatformSearchCommand(query, path || '.'),
      path,
      icon: <Search className="w-3.5 h-3.5 text-sky-400/85 shrink-0" />,
    };
  }

  // FIND FILES / GLOB
  if (name.includes('find') || name.includes('glob') || name.includes('list_files')) {
    const pattern = (args.pattern || args.glob || args.extension || '') as string;
    const path = (args.directory || args.path || '.') as string;
    return {
      actionVerb: 'Found',
      targetDescription: pattern ? `${pattern}${path !== '.' ? ` in ${path}` : ''}` : 'files',
      shellCommand: buildPlatformFindCommand(pattern, path || '.'),
      path,
      icon: <FolderSearch className="w-3.5 h-3.5 text-cyan-300/85 shrink-0" />,
    };
  }

  // RUN COMMAND
  if (name.includes('command') || name.includes('run') || name.includes('bash') || name.includes('shell')) {
    const cmd = (args.command || args.cmd || args.commandLine || '') as string;
    return {
      actionVerb: 'Ran',
      targetDescription: cmd || 'command',
      shellCommand: buildPlatformShellCommand(cmd),
      icon: <Terminal className="w-3.5 h-3.5 text-indigo-300/85 shrink-0" />,
    };
  }

  // DELETE FILE
  if (name.includes('delete') || name.includes('remove') || name.includes('rm')) {
    const path = (args.path || args.filePath || '') as string;
    return {
      actionVerb: 'Deleted',
      targetDescription: path || 'file',
      shellCommand: buildPlatformDeleteCommand(path),
      path,
      icon: <Trash2 className="w-3.5 h-3.5 text-rose-400/85 shrink-0" />,
    };
  }

  // DEFAULT / FALLBACK
  return {
    actionVerb: tool.name.replace(/_/g, ' '),
    targetDescription: Object.keys(args).length > 0 ? JSON.stringify(args) : '',
    icon: <Terminal className="w-3.5 h-3.5 text-white/50 shrink-0" />,
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

export const ToolCallItem: React.FC<ToolCallItemProps> = ({ tool }) => {
  const [isOpen, setIsOpen] = useState(tool.status === 'running' || tool.status === 'pending');
  const [liveStatus, setLiveStatus] = useState(tool.status);
  const [streamedText, setStreamedText] = useState(tool.result || '');
  const [isSimulating, setIsSimulating] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const parsed = parseToolInfo(tool);
  const [currentCommand, setCurrentCommand] = useState(parsed.shellCommand || '');
  const sourcesCount = tool.sources?.length || 0;

  const executeAction = (commandToRun?: string) => {
    setIsModifying(false);
    setIsSimulating(true);
    setLiveStatus('running');
    setIsOpen(true);
    setStreamedText('');

    const fullResult = tool.result || 'Execution completed with 0 errors.';
    const lines = fullResult.split('\n');
    let currentLine = 0;

    const interval = setInterval(() => {
      currentLine++;
      setStreamedText(lines.slice(0, currentLine).join('\n'));
      if (currentLine >= lines.length) {
        clearInterval(interval);
        setTimeout(() => {
          setLiveStatus('completed');
          setIsSimulating(false);
        }, 350);
      }
    }, Math.max(100, Math.floor(800 / Math.max(lines.length, 1))));
  };

  const handleAllow = (e: React.MouseEvent) => {
    e.stopPropagation();
    executeAction();
  };

  const handleAutoAllow = (e: React.MouseEvent) => {
    e.stopPropagation();
    executeAction();
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsModifying(false);
    setLiveStatus('rejected');
    setStreamedText('Action cancelled by user.');
  };

  const handleRunModified = (e: React.MouseEvent) => {
    e.stopPropagation();
    executeAction(currentCommand);
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSimulating) return;
    executeAction();
  };

  return (
    <div className="select-none text-[12px] font-mono min-w-0 max-w-full overflow-hidden">
      {/* 1. NATURAL HUMAN ACTION ROW (UNBOXED, FLAT DIRECTLY ON CANVAS) */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-1 text-white/70 hover:text-white transition-colors cursor-pointer w-fit max-w-full group min-w-0"
      >
        <div className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>

        {/* TOOL CATEGORY ICON */}
        {parsed.icon}

        {/* NATURAL HUMAN VERB + TARGET */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-full">
          <span className="font-semibold text-white tracking-tight shrink-0">{parsed.actionVerb}</span>
          {parsed.targetDescription && (
            <span className="text-white/70 truncate text-[11.5px] font-normal min-w-0 max-w-[280px] sm:max-w-[420px] md:max-w-[540px]">
              {parsed.targetDescription}
            </span>
          )}
        </div>

        {/* SOURCES BADGE (IF PRESENT) */}
        {sourcesCount > 0 && (
          <span className="px-1.5 py-0.5 text-[10px] font-mono text-sky-300/80 bg-sky-500/10 border border-sky-500/20 rounded shrink-0">
            {sourcesCount} {sourcesCount === 1 ? 'source' : 'sources'}
          </span>
        )}

        {/* STATUS INDICATOR (ALL MONOCHROMATIC WHITE/GRAY) */}
        {liveStatus === 'pending' && (
          <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse ml-1 shrink-0" />
        )}
        {liveStatus === 'running' && (
          <div className="flex items-center ml-0.5 shrink-0">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin stroke-[2.2]" />
          </div>
        )}
        {liveStatus === 'completed' && (
          <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5 stroke-[2.5] shrink-0" />
        )}
        {liveStatus === 'rejected' && (
          <X className="w-3.5 h-3.5 text-white/40 ml-0.5 shrink-0" />
        )}
        {liveStatus === 'failed' && (
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 ml-0.5 shrink-0" />
        )}

        {/* DURATION */}
        {tool.durationMs && liveStatus === 'completed' && (
          <span className="text-[10.5px] text-white/30 ml-0.5 shrink-0">({tool.durationMs}ms)</span>
        )}

        {/* REPLAY ANIMATION BUTTON (ON HOVER) */}
        {liveStatus === 'completed' && (
          <button
            onClick={handleReplay}
            title="Replay execution animation"
            className="opacity-0 group-hover:opacity-100 p-0.5 text-white/30 hover:text-white transition-all rounded hover:bg-white/10 ml-1 shrink-0"
          >
            <RotateCcw className={`w-3 h-3 ${isSimulating ? 'animate-spin text-white' : ''}`} />
          </button>
        )}
      </div>

      {/* 2. COLLAPSIBLE DIRECT COMMAND & OUTPUT (NO REDUNDANT HEADERS) */}
      {isOpen && (
        <div className="pl-6 pt-1 pb-2 space-y-2 text-[11.5px] font-mono min-w-0 max-w-full overflow-hidden">
          {/* CLEAN COMMAND LINE (ONLY FOR BASIC OS/CODEBASE TOOLS) */}
          {(currentCommand || parsed.shellCommand) && !isModifying && (
            <div className="text-amber-300/90 select-text flex items-baseline gap-2 font-mono min-w-0 max-w-full">
              <span className="text-white/30 select-none shrink-0">$</span>
              <span className="whitespace-pre-wrap break-all break-words min-w-0 max-w-full">
                {currentCommand || parsed.shellCommand}
                {liveStatus === 'running' && (
                  <span className="inline-block w-1.5 h-3.5 bg-amber-400 animate-pulse ml-1.5 align-middle shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                )}
              </span>
            </div>
          )}

          {/* INLINE MODIFICATION EDITOR */}
          {isModifying && (
            <div className="space-y-2 pt-0.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/40">
                Modify Command before running
              </div>
              <textarea
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/20 rounded p-2 text-white font-mono text-[11.5px] focus:outline-none focus:border-white resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunModified}
                  className="px-3 py-1 bg-white text-black font-semibold text-[11px] rounded hover:bg-white/90 transition-all active:scale-[0.98]"
                >
                  Run Modified
                </button>
                <button
                  onClick={() => setIsModifying(false)}
                  className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/20 font-medium text-[11px] rounded transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* MONOCHROMATIC ALL-WHITE 4-BUTTON PERMISSION BAR (FOR PENDING STATE) */}
          {liveStatus === 'pending' && !isModifying && (
            <div className="flex items-center gap-2 pt-1.5 font-sans">
              <button
                onClick={handleAllow}
                className="px-3 py-1 bg-white text-black font-semibold text-[11px] rounded hover:bg-white/90 transition-all active:scale-[0.98] shadow-sm"
              >
                Allow
              </button>
              <button
                onClick={handleAutoAllow}
                className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/20 font-medium text-[11px] rounded transition-all active:scale-[0.98]"
              >
                Auto-Allow
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModifying(true);
                }}
                className="px-3 py-1 bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/20 font-medium text-[11px] rounded transition-all active:scale-[0.98]"
              >
                Modify
              </button>
              <button
                onClick={handleReject}
                className="px-3 py-1 bg-white/[0.04] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/10 font-medium text-[11px] rounded transition-all active:scale-[0.98]"
              >
                Reject
              </button>
            </div>
          )}

          {/* OUTPUT / RESULT OR ACTIVE STREAMING LOADER */}
          {liveStatus === 'running' && !streamedText && (
            <div className={`text-zinc-400 select-text text-[11px] font-mono flex items-center gap-2 pt-0.5 ${parsed.shellCommand ? 'pl-4' : ''}`}>
              <Loader2 className="w-3 h-3 animate-spin text-amber-400 shrink-0" />
              <span className="text-zinc-400 italic">Streaming stdout from process...</span>
              <span className="inline-block w-1.5 h-3 bg-amber-400/80 animate-pulse" />
            </div>
          )}

          {streamedText && (
            <div className={`text-zinc-400 select-text text-[11px] whitespace-pre-wrap break-words font-mono ${parsed.shellCommand ? 'pl-4' : ''}`}>
              {streamedText}
              {liveStatus === 'running' && (
                <span className="inline-block w-1.5 h-3 bg-amber-400 animate-pulse ml-1 align-middle shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              )}
            </div>
          )}

          {/* 3. INTERACTIVE SOURCE REFERENCE PILLS / CARDS */}
          {tool.sources && tool.sources.length > 0 && (
            <div className={`pt-1 space-y-1.5 font-sans ${parsed.shellCommand ? 'pl-4' : ''}`}>
              <div className="text-[10px] uppercase font-mono tracking-wider text-white/40 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-sky-400/80" />
                <span>Gathered from {tool.sources.length} sources</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {tool.sources.map((src, idx) => {
                  const domain = src.domain || extractDomain(src.url);
                  return (
                    <a
                      key={idx}
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${src.title}\n${src.url}${src.snippet ? `\n\n"${src.snippet}"` : ''}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.08] hover:border-white/20 rounded text-[11px] transition-all duration-150 group/src max-w-[320px] select-text"
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                        alt=""
                        className="w-3 h-3 rounded-xs shrink-0 opacity-70 group-hover/src:opacity-100"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="font-mono text-[10px] text-white/40 group-hover/src:text-white/70 truncate shrink-0">
                        {domain}
                      </span>
                      <span className="text-zinc-300 group-hover/src:text-white truncate font-normal">
                        {src.title}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 text-white/30 group-hover/src:text-white/80 shrink-0 ml-0.5" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
