/**
 * Database & State Persistence Types for Unit 01
 */

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
  modelFamily?: string;
  workingDirectory?: string;
  totalTokensUsed?: number;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: any[];
  toolCallId?: string;
}

export interface ShadowBackupRecord {
  id: string;
  sessionId: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  timestamp: number;
  toolName: string;
  reverted: boolean;
}

export interface ProjectMemoryItem {
  id: string;
  key: string;
  category: 'convention' | 'architecture' | 'preference' | 'rule';
  value: string;
  createdAt: number;
  updatedAt: number;
}
