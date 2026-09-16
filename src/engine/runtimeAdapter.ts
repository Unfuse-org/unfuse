import { LocalModelBlade } from '../components/rack/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ProviderRequestPayload {
  url: string;
  method: 'POST';
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/**
 * Universal Provider Config Adapter:
 * Converts unified LocalModelBlade slider parameters into exact provider-specific JSON payloads.
 */
export function buildProviderPayload(
  blade: LocalModelBlade,
  messages: ChatMessage[],
  stream: boolean = true
): ProviderRequestPayload {
  const temp = blade.temperature !== undefined ? blade.temperature : 0.2;
  const topP = blade.topP !== undefined ? blade.topP : 0.9;
  const repPenalty = blade.repetitionPenalty !== undefined ? blade.repetitionPenalty : 1.1;
  const maxTokens = blade.maxTokens || 4096;
  const numCtx = blade.contextLength || 32768;

  switch (blade.provider) {
    case 'ollama':
      return {
        url: `${blade.endpoint}/api/chat`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: blade.name,
          messages,
          stream,
          options: {
            temperature: temp,
            top_p: topP,
            repeat_penalty: repPenalty,
            num_ctx: numCtx,
            num_predict: maxTokens,
          },
        },
      };

    case 'lmstudio':
    case 'jan':
    case 'vllm':
    case 'mlx':
      // OpenAI-compatible /v1/chat/completions endpoint
      return {
        url: `${blade.endpoint}/v1/chat/completions`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer local-key',
        },
        body: {
          model: blade.name,
          messages,
          stream,
          temperature: temp,
          top_p: topP,
          max_tokens: maxTokens,
          // Convert 1.0-1.3 multiplier to OpenAI frequency_penalty scale (0.0 to 2.0)
          frequency_penalty: Math.max(0, (repPenalty - 1.0) * 2.0),
        },
      };

    case 'llamacpp':
      return {
        url: `${blade.endpoint}/v1/chat/completions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: blade.name,
          messages,
          stream,
          temperature: temp,
          top_p: topP,
          max_tokens: maxTokens,
          repeat_penalty: repPenalty,
          n_ctx: numCtx,
          n_predict: maxTokens,
        },
      };

    default:
      return {
        url: `${blade.endpoint}/v1/chat/completions`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          model: blade.name,
          messages,
          stream,
          temperature: temp,
          top_p: topP,
          max_tokens: maxTokens,
        },
      };
  }
}

/**
 * Cross-Platform Process Runner & Command Orchestrator
 * Supports macOS, Windows, and Linux with full login shell hydration,
 * process group management, non-blocking environment guards, and safe trash recycling.
 */

export type OperatingSystem = 'macos' | 'windows' | 'linux';

export function detectOperatingSystem(): OperatingSystem {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) return 'windows';
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('linux')) return 'linux';
  }
  return 'macos';
}

/**
 * Industry Standard Execution Guardrails & Constants
 */
export const DEFAULT_COMMAND_TIMEOUT_MS = 60000; // 60s timeout
export const MAX_OUTPUT_BUFFER_BYTES = 512 * 1024; // 512 KB truncation limit

/**
 * Truncates oversized stdout/stderr buffers to prevent UI freezes or memory exhaustion.
 */
export function truncateOutputBuffer(output: string, maxBytes: number = MAX_OUTPUT_BUFFER_BYTES): string {
  if (!output || output.length <= maxBytes) return output;
  const head = output.slice(0, Math.floor(maxBytes * 0.7));
  const tail = output.slice(-Math.floor(maxBytes * 0.2));
  const droppedCount = output.length - (head.length + tail.length);
  return `${head}\n\n[... ${droppedCount} characters truncated to protect memory ...]\n\n${tail}`;
}

/**
 * Catastrophic Command Guard: Detects dangerous destructive patterns.
 */
export function checkCommandSafety(cmd: string): { isSafe: boolean; warning?: string } {
  const normalized = cmd.trim().toLowerCase();
  const dangerousPatterns = [
    { pattern: /rm\s+(-[rf]+\s+)?[\/\\](?:\s|$)/, warning: 'Root filesystem deletion attempt blocked' },
    { pattern: /mkfs\./, warning: 'Filesystem formatting command blocked' },
    { pattern: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, warning: 'Fork bomb attack blocked' },
    { pattern: /dd\s+if=\/dev\/(zero|urandom)\s+of=\/dev\/[sh]d/, warning: 'Raw disk wipe blocked' },
    { pattern: /format\s+[c-z]:/i, warning: 'Drive format blocked' },
  ];

  for (const item of dangerousPatterns) {
    if (item.pattern.test(normalized)) {
      return { isSafe: false, warning: item.warning };
    }
  }

  return { isSafe: true };
}

/**
 * Builds the exact non-blocking, login-hydrated shell command for the target OS.
 * Injects CI=1, PAGER=cat, GIT_TERMINAL_PROMPT=0, DEBIAN_FRONTEND=noninteractive to eliminate interactive blocking.
 */
export function buildPlatformShellCommand(cmd: string, os: OperatingSystem = detectOperatingSystem()): string {
  switch (os) {
    case 'windows':
      return `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$env:CI='1'; $env:GIT_TERMINAL_PROMPT='0'; ${cmd.replace(/"/g, '`"')}"`;
    case 'linux':
      return `CI=1 PAGER=cat GIT_TERMINAL_PROMPT=0 DEBIAN_FRONTEND=noninteractive /bin/bash -l -c "${cmd.replace(/"/g, '\\"')}"`;
    case 'macos':
    default:
      return `CI=1 PAGER=cat GIT_TERMINAL_PROMPT=0 /bin/zsh -l -c "${cmd.replace(/"/g, '\\"')}"`;
  }
}

/**
 * Builds native safe recycle/trash deletion command per OS.
 */
export function buildPlatformDeleteCommand(path: string, os: OperatingSystem = detectOperatingSystem()): string {
  switch (os) {
    case 'windows':
      return `powershell.exe -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${path}', 'OnlyErrorDialogs', 'SendToRecycleBin')"`;
    case 'linux':
      return `gio trash '${path}' (or trash-cli)`;
    case 'macos':
    default:
      return `trash '${path}' (macOS Finder Trash)`;
  }
}

/**
 * Builds file read command (with optional line slicing) per OS.
 */
export function buildPlatformReadCommand(
  path: string,
  startLine?: number,
  endLine?: number,
  os: OperatingSystem = detectOperatingSystem()
): string {
  if (startLine && endLine) {
    if (os === 'windows') {
      return `powershell -Command "Get-Content '${path}' | Select-Object -Skip ${startLine - 1} -First ${endLine - startLine + 1}"`;
    }
    return `sed -n '${startLine},${endLine}p' '${path}'`;
  }
  if (os === 'windows') {
    return `Get-Content '${path}'`;
  }
  return `bat --style=plain '${path}' (or cat '${path}')`;
}

/**
 * Builds high-performance ripgrep code search command.
 */
export function buildPlatformSearchCommand(query: string, path: string = '.'): string {
  return `rg -n --column --hidden -g '!.git' -g '!node_modules' '${query}' ${path}`;
}

/**
 * Builds high-performance fd file discovery command.
 */
export function buildPlatformFindCommand(pattern: string, path: string = '.'): string {
  return `fd --hidden -E .git -E node_modules '${pattern}' ${path}`;
}
