/**
 * @file services/agentEngine.ts
 * @description In-memory autonomous agent execution engine with zero network ports.
 * 
 * CORE RULES:
 * 1. ZERO OPEN PORTS — Runs 100% in-process within the Tauri desktop application.
 * 2. Plan -> Act -> Observe execution loop.
 * 3. Supports the 4 Core Tools: `read`, `write`, `edit`, and `bash`.
 * 4. Model-agnostic: streams standard OpenAI-compatible `/v1/chat/completions` from the active blade.
 * 5. In-memory permission gate pauses execution until the user clicks Allow/Auto-Allow/Modify/Reject.
 * 6. Creates a single atomic Git turn snapshot upon prompt completion.
 */

import {
  nativeReadFile,
  nativeWriteFile,
  nativeEditFile,
  nativeRunCommand,
  nativeGitTurnCommit,
  nativeGitUndo,
  nativeGetSystemInfo,
  SystemInfo,
} from './tauriBridge';
import {
  getServiceState,
  getDefaultWebSearchProvider,
} from '../components/integrations/integrationStore';
import { ToolName } from '../types/pipeline';
import { getScopedToolSchemas } from './toolGate';

export interface LLMConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  repetitionPenalty?: number;
}

export interface AgentConfig {
  sessionId: string;
  workspaceRoot: string;
  llmConfig: LLMConfig;
  allowedTools?: ToolName[];
}

export interface ToolCallRequest {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs?: number;
}

export type PermissionDecision = 'allow' | 'auto_allow' | 'modify' | 'reject';

export interface PermissionResolution {
  decision: PermissionDecision;
  modifiedArgs?: Record<string, unknown>;
}

export type BackendEvent =
  | { type: 'token_chunk'; sessionId: string; chunk: string }
  | { type: 'tool_pending'; sessionId: string; tool: ToolCallRequest }
  | { type: 'tool_result'; sessionId: string; result: ToolResult }
  | { type: 'agent_status'; sessionId: string; status: string }
  | { type: 'tokens_update'; sessionId: string; totalTokens: number; model: string }
  | { type: 'agent_done'; sessionId: string; finalMessage?: string }
  | { type: 'agent_error'; sessionId: string; error: string };

interface SessionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCallRequest[];
  toolCallId?: string;
}

interface ActiveSession {
  id: string;
  workspaceRoot: string;
  llmConfig: LLMConfig;
  messages: SessionMessage[];
  autoAllowedTools: Set<string>;
  abortController?: AbortController;
}

const activeSessions = new Map<string, ActiveSession>();
const pendingPermissions = new Map<string, (res: PermissionResolution) => void>();

/**
 * Builds the crisp, model-agnostic Unfuse system prompt with universal cross-platform context.
 */
function buildSystemPrompt(workspaceRoot: string, sysInfo?: SystemInfo): string {
  const osName = sysInfo?.os || 'macos';
  const username = sysInfo?.username || 'user';
  const homeDir = sysInfo?.home_dir || (osName === 'windows' ? 'C:/Users/user' : `/Users/${username}`);
  const shell = sysInfo?.shell || (osName === 'windows' ? 'cmd' : '/bin/zsh');

  return `You are Unfuse, an autonomous local AI software engineering workstation.
You have direct native access to inspect files, edit code, and execute shell commands.

Environment:
- Platform: ${osName} (macos | linux | windows)
- User: ${username}
- Home Directory: ${homeDir}
- Shell: ${shell}
- Workspace Root: ${workspaceRoot || '.'}

Path & Filesystem Rules:
1. Workspace Scope (Default): Relative paths (e.g. "src/index.ts") resolve against the workspace root (${workspaceRoot || '.'}).
2. User Scope: Paths starting with "~" or referencing user personal files, configs, or directories resolve relative to the user's home directory (${homeDir}).
3. Cross-Platform Paths: Always use forward slashes ("/") in tool calls—the native layer automatically normalizes paths across Windows, Linux, and macOS.
4. Shell Execution: Commands execute with the workspace root as their current working directory. To target files outside the workspace with bash or read, use absolute paths or "~" (e.g. read(path: "~/Documents") or bash(command: "ls -la ~/")).

Core Philosophy:
- Direct, concise, technical execution. No filler or corporate preamble.
- Inspect files thoroughly before making surgical modifications.
- Ensure all edits preserve existing style, indentation, and comments.

Available Tools:
1. read: Read file contents or list directory entries (accepts workspace-relative paths, absolute paths, or ~/ paths).
   Args: { "path": string, "startLine"?: number, "endLine"?: number }

2. write: Create or completely overwrite a file (accepts workspace-relative paths, absolute paths, or ~/ paths).
   Args: { "path": string, "content": string }

3. edit: Surgically replace a contiguous block of text.
   Args: { "path": string, "target": string, "replacement": string, "startLine"?: number, "endLine"?: number }

4. bash: Run shell commands inside the workspace (or target other directories using absolute or ~ paths).
   Args: { "command": string }

5. web_search: Search the web for up-to-date documentation, libraries, or news.
   Args: { "query": string }

6. fetch_web_page: Fetch and read the text content of a public URL.
   Args: { "url": string }

Format tool calls using standard function calling or XML tags:
<tool_call>
{"name": "read", "arguments": {"path": "src/App.tsx"}}
</tool_call>`;
}

/**
 * Parses tool calls from JSON or XML text tags in LLM responses.
 */
function parseToolCalls(text: string): { cleanText: string; toolCalls: ToolCallRequest[] } {
  const toolCalls: ToolCallRequest[] = [];
  let cleanText = text;

  // 1. XML <tool_call> tags
  const toolCallRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi;
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: parsed.name,
          args: parsed.arguments || parsed.args || {},
        });
      }
    } catch {
      // Ignore parse failure on partial tags
    }
  }

  // 2. Direct XML tool invocations
  const directTools = [
    'read',
    'write',
    'edit',
    'bash',
    'web_search',
    'fetch_web_page',
    'github_query',
    'linear_query',
    'sentry_query',
    'slack_post',
  ];
  for (const toolName of directTools) {
    const tagRegex = new RegExp(`<${toolName}>\\s*([\\s\S]*?)\\s*<\\/${toolName}>`, 'gi');
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tagRegex.exec(text)) !== null) {
      try {
        const rawContent = tMatch[1].trim();
        let args: Record<string, unknown> = {};
        if (rawContent.startsWith('{') && rawContent.endsWith('}')) {
          args = JSON.parse(rawContent);
        } else if (toolName === 'web_search') {
          args = { query: rawContent };
        } else if (toolName === 'fetch_web_page') {
          args = { url: rawContent };
        } else if (toolName === 'bash') {
          args = { command: rawContent };
        } else {
          args = { path: rawContent };
        }
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: toolName,
          args,
        });
      } catch {
        // Ignore
      }
    }
  }

  if (toolCalls.length > 0) {
    cleanText = cleanText
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<(read|write|edit|bash|web_search|fetch_web_page|github_query|linear_query|sentry_query|slack_post)>[\s\S]*?<\/\1>/gi, '')
      .trim();
  }

  return { cleanText, toolCalls };
}

/**
 * Searches the web via the configured search integration.
 */
async function executeWebSearch(query: string): Promise<string> {
  const providerId = getDefaultWebSearchProvider();
  const searchState = getServiceState(providerId);
  const config = (searchState.config || {}) as Record<string, any>;
  const apiKey = (config.apiKey || searchState.apiKey || '') as string;

  // 1. Tavily
  if (providerId === 'tavily' && apiKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Tavily error: ${res.statusText}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results
          .map((r: any) => `### [${r.title}](${r.url})\n${r.content}`)
          .join('\n\n');
      }
      return 'No web search results found for the given query.';
    } catch (e: any) {
      return `Tavily search error: ${e.message}`;
    }
  }

  // 2. Brave Search
  if (providerId === 'brave' && apiKey) {
    try {
      const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Brave error: ${res.statusText}`);
      const data = await res.json();
      const results = data.web?.results || [];
      if (results.length > 0) {
        return results
          .map((r: any) => `### [${r.title}](${r.url})\n${r.description}`)
          .join('\n\n');
      }
      return 'No web search results found on Brave Search.';
    } catch (e: any) {
      return `Brave search error: ${e.message}`;
    }
  }

  // 3. Exa Neural Search
  if (providerId === 'exa' && apiKey) {
    try {
      const res = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, numResults: 5, useAutoprompt: true, type: 'auto' }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`Exa error: ${res.statusText}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results
          .map((r: any) => `### [${r.title || 'Untitled'}](${r.url})\n${r.text || ''}`)
          .join('\n\n');
      }
      return 'No results found on Exa search.';
    } catch (e: any) {
      return `Exa search error: ${e.message}`;
    }
  }

  // 4. Google Custom Search
  if (providerId === 'google' && apiKey) {
    const cx = config.searchEngineId || config.cx || '';
    if (cx) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&num=5`,
          { signal: AbortSignal.timeout(15_000) }
        );
        if (!res.ok) throw new Error(`Google API error: ${res.statusText}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          return data.items
            .map((item: any) => `### [${item.title}](${item.link})\n${item.snippet}`)
            .join('\n\n');
        }
        return 'No results found on Google Custom Search.';
      } catch (e: any) {
        return `Google search error: ${e.message}`;
      }
    }
  }

  // 5. DuckDuckGo Real Web Search (Zero-Config, Free, No API Key Required)
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (res.ok) {
      const html = await res.text();
      const blocks = html.split('<div class="result results_links');
      const results: { title: string; url: string; snippet: string }[] = [];

      for (let i = 1; i < blocks.length && results.length < 5; i++) {
        const b = blocks[i];
        const titleMatch = b.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = b.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
        if (!titleMatch) continue;

        const rawUrl = titleMatch[1];
        let cleanUrl = rawUrl;
        const uddgMatch = rawUrl.match(/[?&]uddg=([^&]+)/);
        if (uddgMatch) {
          try {
            cleanUrl = decodeURIComponent(uddgMatch[1]);
          } catch {
            cleanUrl = rawUrl;
          }
        }

        const decodeEntities = (s: string) =>
          s
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');

        const title = decodeEntities(titleMatch[2].replace(/<[^>]+>/g, '').trim());
        const snippet = snippetMatch
          ? decodeEntities(snippetMatch[1].replace(/<[^>]+>/g, '').trim())
          : '';

        if (title && cleanUrl) {
          results.push({ title, url: cleanUrl, snippet });
        }
      }

      if (results.length > 0) {
        return results
          .map((r) => `### [${r.title}](${r.url})\n${r.snippet}`)
          .join('\n\n');
      }
    }
  } catch (err: any) {
    console.error('DuckDuckGo search error:', err);
  }

  return `No web search results found for "${query}". Check your internet connection or configure an API key for Brave, Tavily, or Exa in Settings > Integrations.`;
}

/**
 * Fetches and extracts readable text from a webpage URL.
 */
async function executeFetchWebPage(url: string): Promise<string> {
  try {
    const target = url.startsWith('http') ? url : `https://${url}`;
    const res = await fetch(target, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return `Failed to fetch URL (${res.status} ${res.statusText}): ${target}`;
    }

    const html = await res.text();
    let cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length > 8000) {
      cleaned = cleaned.slice(0, 8000) + '\n\n...[Page content truncated at 8,000 characters]';
    }

    return cleaned || 'Fetched page contained no readable text content.';
  } catch (err: any) {
    return `Error fetching webpage: ${err?.message || String(err)}`;
  }
}

/**
 * Dispatches tool execution to the native Tauri IPC or integration services.
 */
async function executeTool(
  name: string,
  callId: string,
  args: Record<string, unknown>,
  workspaceRoot: string
): Promise<ToolResult> {
  const normName = name.toLowerCase();

  if (normName === 'read' || normName === 'view_file' || normName === 'read_file') {
    const path = (args.path || args.filePath || args.targetFile || '') as string;
    const start = typeof args.startLine === 'number' ? args.startLine : undefined;
    const end = typeof args.endLine === 'number' ? args.endLine : undefined;
    const res = await nativeReadFile(path, start, end);
    return {
      toolCallId: callId,
      toolName: 'read',
      success: res.success,
      output: res.output,
      error: res.error,
      durationMs: res.durationMs,
    };
  }

  if (normName === 'write' || normName === 'write_to_file' || normName === 'create_file') {
    const path = (args.path || args.filePath || args.targetFile || '') as string;
    const content = (args.content || args.codeContent || '') as string;
    const res = await nativeWriteFile(path, content);
    return {
      toolCallId: callId,
      toolName: 'write',
      success: res.success,
      output: res.output,
      error: res.error,
      durationMs: res.durationMs,
    };
  }

  if (normName === 'edit' || normName === 'replace_file_content' || normName === 'patch') {
    const path = (args.path || args.filePath || args.targetFile || '') as string;
    const target = (args.target || args.targetContent || '') as string;
    const replacement = (args.replacement || args.replacementContent || '') as string;
    const start = typeof args.startLine === 'number' ? args.startLine : undefined;
    const end = typeof args.endLine === 'number' ? args.endLine : undefined;
    const res = await nativeEditFile(path, target, replacement, start, end);
    return {
      toolCallId: callId,
      toolName: 'edit',
      success: res.success,
      output: res.output,
      error: res.error,
      durationMs: res.durationMs,
    };
  }

  if (normName === 'bash' || normName === 'run_command' || normName === 'terminal' || normName === 'shell') {
    const command = (args.command || args.cmd || args.commandLine || '') as string;
    const rawTimeout = typeof args.timeoutMs === 'number' ? args.timeoutMs : (typeof args.timeout === 'number' ? args.timeout : undefined);
    const res = await nativeRunCommand(command, workspaceRoot, rawTimeout);
    return {
      toolCallId: callId,
      toolName: 'bash',
      success: res.success,
      output: res.output,
      error: res.error,
      durationMs: res.durationMs,
    };
  }

  if (normName === 'web_search' || normName === 'duckduckgo_search' || normName === 'search_web' || normName === 'search') {
    const query = (args.query || args.q || args.search || '') as string;
    const startT = performance.now();
    const output = await executeWebSearch(query);
    return {
      toolCallId: callId,
      toolName: 'web_search',
      success: true,
      output,
      durationMs: Math.round(performance.now() - startT),
    };
  }

  if (normName === 'fetch_web_page' || normName === 'fetch_url' || normName === 'web_fetch' || normName === 'read_url') {
    const url = (args.url || args.targetUrl || args.link || '') as string;
    const startT = performance.now();
    const output = await executeFetchWebPage(url);
    return {
      toolCallId: callId,
      toolName: 'fetch_web_page',
      success: true,
      output,
      durationMs: Math.round(performance.now() - startT),
    };
  }

  return {
    toolCallId: callId,
    toolName: name,
    success: false,
    output: '',
    error: `Unknown tool '${name}'. Available tools: read, write, edit, bash, web_search, fetch_web_page.`,
    durationMs: 0,
  };
}

class AgentEngine {
  /**
   * Resolves a pending tool permission gate request from the UI.
   */
  public resolvePermission(
    callId: string,
    decision: PermissionDecision,
    modifiedArgs?: Record<string, unknown>
  ): boolean {
    const resolver = pendingPermissions.get(callId);
    if (!resolver) return false;

    pendingPermissions.delete(callId);
    resolver({ decision, modifiedArgs });
    return true;
  }

  /**
   * Stops an active agent session loop immediately.
   */
  public stopSession(sessionId: string): boolean {
    const session = activeSessions.get(sessionId);
    if (session?.abortController) {
      session.abortController.abort();
      activeSessions.delete(sessionId);
    }
    return true;
  }

  /**
   * Undoes the last completed turn snapshot via Git rollback.
   */
  public async undoTurn(workspaceRoot: string = '.'): Promise<boolean> {
    return nativeGitUndo(workspaceRoot);
  }

  /**
   * Runs the in-memory agent execution loop for a user message.
   */
  public async sendChatMessage(
    config: AgentConfig,
    prompt: string,
    onEvent: (event: BackendEvent) => void,
    externalSignal?: AbortSignal
  ): Promise<void> {
    const { sessionId, workspaceRoot, llmConfig } = config;

    let session = activeSessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        workspaceRoot,
        llmConfig,
        messages: [],
        autoAllowedTools: new Set<string>(),
      };
      activeSessions.set(sessionId, session);
    } else {
      session.llmConfig = llmConfig;
      session.workspaceRoot = workspaceRoot;
    }

    const abortController = new AbortController();
    session.abortController = abortController;

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => abortController.abort());
    }

    try {
      // 1. Initialize system prompt if fresh session
      if (session.messages.length === 0) {
        const sysInfo = await nativeGetSystemInfo();
        session.messages.push({
          role: 'system',
          content: buildSystemPrompt(workspaceRoot, sysInfo),
        });
      }

      // 2. Append user message
      session.messages.push({
        role: 'user',
        content: prompt,
      });

      let keepLooping = true;
      let turnCount = 0;
      const MAX_TURNS = 25;

      while (keepLooping && turnCount < MAX_TURNS) {
        turnCount++;

        if (abortController.signal.aborted) break;

        onEvent({
          type: 'agent_status',
          sessionId,
          status: turnCount === 1 ? 'Ingesting prompt & generating...' : 'Analyzing tool output & reasoning...',
        });

        // 3. Prepare messages payload for OpenAI /v1/chat/completions
        const requestMessages = session.messages.map((m) => {
          if (m.role === 'tool') {
            return {
              role: 'tool',
              tool_call_id: m.toolCallId,
              content: m.content,
            };
          }
          if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
            return {
              role: 'assistant',
              content: m.content || '',
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.args),
                },
              })),
            };
          }
          return {
            role: m.role,
            content: m.content,
          };
        });

        // 4. Stream completion from local model
        const targetUrl = `${llmConfig.baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const authKey =
          llmConfig.apiKey ||
          (typeof window !== 'undefined' ? localStorage.getItem('unfuse_unsloth_api_key') : null);
        if (authKey && authKey.trim()) {
          headers['Authorization'] = `Bearer ${authKey.trim()}`;
        }

        const scopedTools = getScopedToolSchemas(config.allowedTools ?? ['read', 'write', 'edit', 'bash']);

        // Network connection & stream stall timeout controller
        const streamAbortController = new AbortController();
        const onUserAbort = () => {
          streamAbortController.abort(abortController.signal.reason);
        };
        abortController.signal.addEventListener('abort', onUserAbort, { once: true });

        // Connect timeout: 60s
        let streamTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
          streamAbortController.abort(
            new Error(`Model runner (${llmConfig.baseUrl}) connection timed out after 60 seconds. Verify that your model runner is running.`)
          );
        }, 60_000);

        const resetStreamTimer = (delayMs = 90_000) => {
          if (streamTimer) clearTimeout(streamTimer);
          streamTimer = setTimeout(() => {
            streamAbortController.abort(
              new Error(`Model generation stalled: no response received from runner for ${delayMs / 1000} seconds.`)
            );
          }, delayMs);
        };

        let res: Response;
        let accumulatedText = '';
        const nativeToolCalls: ToolCallRequest[] = [];

        try {
          res = await fetch(targetUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: llmConfig.model,
              messages: requestMessages,
              ...(scopedTools ? { tools: scopedTools } : {}),
              temperature: llmConfig.temperature ?? 0.2,
              top_p: llmConfig.topP ?? 0.95,
              max_tokens: llmConfig.maxTokens ?? 4096,
              stream: true,
            }),
            signal: streamAbortController.signal,
          });

          // Dynamic fallback: If runner rejects tools parameter for any model, retry without it
          if (!res.ok && res.status === 400) {
            const errText = await res.text();
            if (
              errText.toLowerCase().includes('support tools') ||
              errText.toLowerCase().includes('tools are not supported') ||
              errText.toLowerCase().includes('unsupported parameter: tools')
            ) {
              res = await fetch(targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  model: llmConfig.model,
                  messages: requestMessages,
                  temperature: llmConfig.temperature ?? 0.2,
                  top_p: llmConfig.topP ?? 0.95,
                  max_tokens: llmConfig.maxTokens ?? 4096,
                  stream: true,
                }),
                signal: streamAbortController.signal,
              });
            } else {
              throw new Error(`LLM endpoint returned error (${res.status}): ${errText}`);
            }
          }

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`LLM endpoint returned error (${res.status}): ${errText}`);
          }

          if (!res.body) {
            throw new Error('ReadableStream not supported on LLM response body.');
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let sseBuffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Received stream chunk: reset stall timeout
            resetStreamTimer(90_000);

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const dataStr = trimmed.slice(5).trim();
              if (dataStr === '[DONE]') continue;

              try {
                const chunk = JSON.parse(dataStr);
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) {
                  accumulatedText += delta.content;
                  onEvent({
                    type: 'token_chunk',
                    sessionId,
                    chunk: delta.content,
                  });
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    if (!nativeToolCalls[idx]) {
                      nativeToolCalls[idx] = {
                        id: tc.id || `call_${Date.now()}_${idx}`,
                        name: '',
                        args: {},
                      };
                    }
                    if (tc.id) {
                      nativeToolCalls[idx].id = tc.id;
                    }
                    if (tc.function?.name && !nativeToolCalls[idx].name) {
                      nativeToolCalls[idx].name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      const existingArgs = (nativeToolCalls[idx] as any)._rawArgs || '';
                      (nativeToolCalls[idx] as any)._rawArgs = existingArgs + tc.function.arguments;
                    }
                  }
                }
              } catch {
                // Ignore non-JSON SSE chunks
              }
            }
          }
        } finally {
          if (streamTimer) clearTimeout(streamTimer);
          abortController.signal.removeEventListener('abort', onUserAbort);
        }

        // Parse arguments for any native tool calls
        for (const tc of nativeToolCalls) {
          const raw = (tc as any)._rawArgs;
          if (raw) {
            try {
              tc.args = JSON.parse(raw);
            } catch {
              tc.args = {};
            }
          }
        }

        // Parse XML fallback tool calls from text
        const parsed = parseToolCalls(accumulatedText);
        const finalToolCalls = nativeToolCalls.length > 0 ? nativeToolCalls : parsed.toolCalls;

        session.messages.push({
          role: 'assistant',
          content: parsed.cleanText || accumulatedText,
          toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
        });

        // Calculate and broadcast live cumulative tokens
        const totalChars = session.messages.reduce(
          (acc, m) => acc + (m.content?.length || 0) + (m.toolCalls ? JSON.stringify(m.toolCalls).length : 0),
          0
        );
        const approxTokens = Math.max(1, Math.ceil(totalChars / 3.8));
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('unfuse-tokens-update', {
              detail: {
                model: llmConfig.model,
                totalTokens: approxTokens,
                usedTokens: approxTokens,
              },
            })
          );
        }

        onEvent({
          type: 'tokens_update',
          sessionId,
          totalTokens: approxTokens,
          model: llmConfig.model,
        });

        // 5. If no tool calls emitted, end the turn
        if (finalToolCalls.length === 0) {
          keepLooping = false;
          break;
        }

        // 6. Process tool calls through permission gate
        const READ_ONLY_TOOLS = new Set([
          'read',
          'view_file',
          'read_file',
          'web_search',
          'duckduckgo_search',
          'search_web',
          'search',
          'fetch_web_page',
          'fetch_url',
          'web_fetch',
          'read_url',
        ]);

        for (const tool of finalToolCalls) {
          if (abortController.signal.aborted) {
            keepLooping = false;
            break;
          }

          let argsToExecute = tool.args;
          const isAutoAllowed =
            session.autoAllowedTools.has(tool.name) || READ_ONLY_TOOLS.has(tool.name.toLowerCase());

          onEvent({
            type: 'agent_status',
            sessionId,
            status: `Executing ${tool.name}...`,
          });

          // Always emit tool_pending so UI immediately renders the tool card
          onEvent({
            type: 'tool_pending',
            sessionId,
            tool,
          });

          if (!isAutoAllowed) {
            // Pause and wait for UI approval
            const resolution = await new Promise<PermissionResolution>((resolve) => {
              pendingPermissions.set(tool.id, resolve);
            });

            if (resolution.decision === 'reject') {
              const rejectedResult: ToolResult = {
                toolCallId: tool.id,
                toolName: tool.name,
                success: false,
                output: '',
                error: `User rejected execution of tool '${tool.name}'.`,
                durationMs: 0,
              };

              session.messages.push({
                role: 'tool',
                content: rejectedResult.error || '',
                toolCallId: tool.id,
              });

              onEvent({
                type: 'tool_result',
                sessionId,
                result: rejectedResult,
              });
              continue;
            }

            if (resolution.decision === 'auto_allow') {
              session.autoAllowedTools.add(tool.name);
            }

            if (resolution.decision === 'modify' && resolution.modifiedArgs) {
              argsToExecute = resolution.modifiedArgs;
            }
          }

          // Execute tool via Native Tauri IPC
          const result = await executeTool(tool.name, tool.id, argsToExecute, workspaceRoot);

          session.messages.push({
            role: 'tool',
            content: result.success ? result.output : `Error: ${result.error || result.output}`,
            toolCallId: tool.id,
          });

          onEvent({
            type: 'tool_result',
            sessionId,
            result,
          });
        }
      }

      // 7. Single atomic Git turn snapshot
      await nativeGitTurnCommit(workspaceRoot, prompt);

      onEvent({ type: 'agent_done', sessionId });
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        onEvent({ type: 'agent_done', sessionId, finalMessage: 'Agent stopped by user.' });
      } else {
        const message = err instanceof Error ? err.message : String(err);
        onEvent({ type: 'agent_error', sessionId, error: message });
      }
    }
  }
}

export const agentEngine = new AgentEngine();
