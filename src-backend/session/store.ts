/**
 * @file session/store.ts
 * @description In-memory active session manager with JSONL disk persistence and context budget compaction.
 * 
 * CORE RULES:
 * 1. Maintains active session state, conversation history, and auto-allowed tool sets in memory.
 * 2. Persists every message to a JSONL file on disk (`~/.unfuse/sessions/{sessionId}.jsonl`) for resumability.
 * 3. Compacts oldest conversation turns when history approaches `CONTEXT_TOKEN_BUDGET` (100k tokens),
 *    preserving the system prompt and recent turns.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { LLMConfig, SessionMessage, SessionState } from '../types';
import { CONTEXT_TOKEN_BUDGET } from '../config/defaults';

const SESSIONS_DIR = path.join(os.homedir(), '.unfuse', 'sessions');
const activeSessions = new Map<string, SessionState>();

/**
 * Ensures the `~/.unfuse/sessions/` directory exists.
 */
async function ensureSessionsDirectory(): Promise<void> {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
  } catch {
    // Directory creation error or exists
  }
}

/**
 * Appends a message to the session's JSONL persistence file on disk.
 */
async function appendToJsonl(sessionId: string, message: SessionMessage): Promise<void> {
  try {
    await ensureSessionsDirectory();
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    const line = JSON.stringify(message) + '\n';
    await fs.appendFile(filePath, line, 'utf-8');
  } catch {
    // Disk write errors should not crash the in-memory agent loop
  }
}

/**
 * Retrieves an active in-memory session or initializes a new one.
 */
export function getOrCreateSession(
  sessionId: string,
  workspaceRoot: string,
  llmConfig: LLMConfig
): SessionState {
  let session = activeSessions.get(sessionId);
  if (!session) {
    session = {
      id: sessionId,
      workspaceRoot,
      llmConfig,
      messages: [],
      startedAt: Date.now(),
      autoAllowedTools: new Set<string>(),
    };
    activeSessions.set(sessionId, session);
  } else {
    // Update config if changed by UI
    session.llmConfig = llmConfig;
    session.workspaceRoot = workspaceRoot;
  }
  return session;
}

/**
 * Retrieves an active in-memory session if it exists.
 */
export function getSession(sessionId: string): SessionState | undefined {
  return activeSessions.get(sessionId);
}

/**
 * Adds a message to an active session, persists it to JSONL, and manages context compaction.
 */
export async function addSessionMessage(
  sessionId: string,
  message: Omit<SessionMessage, 'id' | 'timestamp'>
): Promise<SessionMessage> {
  const session = activeSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session '${sessionId}' does not exist.`);
  }

  const fullMessage: SessionMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };

  session.messages.push(fullMessage);
  await appendToJsonl(sessionId, fullMessage);

  // Context compaction check (rough estimation: 1 token ~= 4 chars)
  compactSessionHistory(session);

  return fullMessage;
}

/**
 * Drops oldest conversational turns if message history exceeds the token budget threshold.
 */
function compactSessionHistory(session: SessionState): void {
  let totalChars = session.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  if (estimatedTokens <= CONTEXT_TOKEN_BUDGET) {
    return;
  }

  // Keep system prompt (index 0) and the 6 most recent messages
  if (session.messages.length > 8) {
    const systemPrompt = session.messages[0].role === 'system' ? session.messages[0] : null;
    const recentMessages = session.messages.slice(-6);

    session.messages = systemPrompt ? [systemPrompt, ...recentMessages] : recentMessages;
  }
}

/**
 * Loads a past session's message history from its JSONL file on disk.
 */
export async function loadSessionFromDisk(sessionId: string): Promise<SessionMessage[]> {
  try {
    const filePath = path.join(SESSIONS_DIR, `${sessionId}.jsonl`);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as SessionMessage);
  } catch {
    return [];
  }
}
