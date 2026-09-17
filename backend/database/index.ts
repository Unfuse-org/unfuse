import { ShadowBackupEngine } from './shadow_backups';
import { SessionStore } from './session_store';
import { ProjectMemoryStore } from './memory_store';
import type { SessionRecord, MessageRecord, ShadowBackupRecord, ProjectMemoryItem } from './types';

export * from './types';
export * from './shadow_backups';
export * from './session_store';
export * from './memory_store';

/**
 * Main Database Engine for Unfuse
 * Coordinates session threads, atomic shadow backups (/undo), and project memory
 */
export class DatabaseEngine {
  public sessions: SessionStore;
  public shadowBackups: ShadowBackupEngine;
  public memory: ProjectMemoryStore;

  constructor() {
    this.sessions = new SessionStore();
    this.shadowBackups = new ShadowBackupEngine();
    this.memory = new ProjectMemoryStore();
  }
}
