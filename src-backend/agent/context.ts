/**
 * @file agent/context.ts
 * @description Token estimation, context budget tracking, and intelligent message compaction.
 * 
 * CORE RULES:
 * 1. Estimates tokens using character-to-token heuristics (approx. 4 chars per token).
 * 2. Determines when a session's token count approaches the configured budget.
 * 3. Compacts older session history while strictly preserving the initial system prompt and recent turns.
 * 4. Model-agnostic: operates strictly on message content length and budget parameters.
 */

import { SessionMessage } from '../types';
import { CONTEXT_TOKEN_BUDGET } from '../config/defaults';

/**
 * Estimates token count for a given text string using standard ~4 chars/token heuristic.
 * 
 * @param text The input string to estimate.
 * @returns Estimated token count.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Calculates the total estimated token count across all messages in a session.
 * 
 * @param messages Array of session messages.
 * @returns Total estimated token count.
 */
export function calculateMessagesTokens(messages: SessionMessage[]): number {
  return messages.reduce((sum, msg) => {
    let msgTokens = estimateTokens(msg.content);
    if (msg.toolCalls) {
      msgTokens += estimateTokens(JSON.stringify(msg.toolCalls));
    }
    return sum + msgTokens;
  }, 0);
}

/**
 * Checks if a session's total token count exceeds the budget threshold.
 * 
 * @param messages Array of session messages.
 * @param budget Maximum token budget (defaults to CONTEXT_TOKEN_BUDGET).
 * @returns boolean true if compaction is required.
 */
export function shouldCompact(
  messages: SessionMessage[],
  budget: number = CONTEXT_TOKEN_BUDGET
): boolean {
  return calculateMessagesTokens(messages) > budget;
}

/**
 * Compacts message history by dropping the oldest non-system message pairs
 * until total tokens fit safely within 75% of the target budget.
 * Strictly preserves the system prompt (index 0) and at least the last 4 messages.
 * 
 * @param messages Original session messages.
 * @param budget Target token budget.
 * @returns Compacted array of messages.
 */
export function compactSessionMessages(
  messages: SessionMessage[],
  budget: number = CONTEXT_TOKEN_BUDGET
): SessionMessage[] {
  if (messages.length <= 4) {
    return [...messages];
  }

  const targetTokens = Math.floor(budget * 0.75);
  const systemMessage = messages.find((m) => m.role === 'system');
  const workingMessages = messages.filter((m) => m.role !== 'system');

  // Keep at least the latest 4 messages regardless of length
  while (workingMessages.length > 4) {
    const total = (systemMessage ? estimateTokens(systemMessage.content) : 0) +
      calculateMessagesTokens(workingMessages);

    if (total <= targetTokens) {
      break;
    }

    // Drop the oldest message
    workingMessages.shift();
  }

  const result: SessionMessage[] = [];
  if (systemMessage) {
    result.push(systemMessage);
  }
  result.push(...workingMessages);

  return result;
}
