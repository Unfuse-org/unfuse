import type { SessionRecord, MessageRecord } from './types';

/**
 * Chat Session & Message Persistence Store
 */
export class SessionStore {
  private sessions = new Map<string, SessionRecord>();
  private messages = new Map<string, MessageRecord[]>();

  public createSession(title: string = 'New Conversation', modelFamily?: string): SessionRecord {
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const record: SessionRecord = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      isPinned: false,
      modelFamily,
    };

    this.sessions.set(id, record);
    this.messages.set(id, []);
    return record;
  }

  public getSession(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  public listSessions(): SessionRecord[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public togglePinSession(id: string): boolean {
    const sess = this.sessions.get(id);
    if (sess) {
      sess.isPinned = !sess.isPinned;
      sess.updatedAt = Date.now();
      return sess.isPinned;
    }
    return false;
  }

  public renameSession(id: string, newTitle: string): boolean {
    const sess = this.sessions.get(id);
    if (sess) {
      sess.title = newTitle;
      sess.updatedAt = Date.now();
      return true;
    }
    return false;
  }

  public deleteSession(id: string): boolean {
    this.messages.delete(id);
    return this.sessions.delete(id);
  }

  public addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    toolCalls?: any[],
    toolCallId?: string
  ): MessageRecord {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: MessageRecord = {
      id: msgId,
      sessionId,
      role,
      content,
      timestamp: Date.now(),
      toolCalls,
      toolCallId,
    };

    const list = this.messages.get(sessionId) || [];
    list.push(record);
    this.messages.set(sessionId, list);

    // Update session timestamp
    const sess = this.sessions.get(sessionId);
    if (sess) {
      sess.updatedAt = Date.now();
    }

    return record;
  }

  public getMessages(sessionId: string): MessageRecord[] {
    return this.messages.get(sessionId) || [];
  }
}
