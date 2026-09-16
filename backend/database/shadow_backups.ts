import type { ShadowBackupRecord } from './types';

const MAX_SNAPSHOT_FILE_BYTES = 10 * 1024 * 1024; // 10MB limit per snapshot
const MAX_SESSION_BACKUPS = 50;

/**
 * Shadow Backup & /undo Restoration Engine
 * Captures atomic snapshots of files before any agent modification occurs
 */
export class ShadowBackupEngine {
  private backups = new Map<string, ShadowBackupRecord[]>();

  /**
   * Capture a snapshot before a tool modifies a file
   */
  public async captureBackup(
    sessionId: string,
    filePath: string,
    toolName: string
  ): Promise<string> {
    const fs = await import('node:fs/promises');

    let originalContent = '';
    try {
      const stats = await fs.stat(filePath);
      if (stats.size <= MAX_SNAPSHOT_FILE_BYTES) {
        originalContent = await fs.readFile(filePath, 'utf-8');
      } else {
        originalContent = ''; // Skip backing up huge files to prevent OOM
      }
    } catch {
      // File was newly created (didn't exist before)
      originalContent = '';
    }

    const backupId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: ShadowBackupRecord = {
      id: backupId,
      sessionId,
      filePath,
      originalContent,
      modifiedContent: '',
      timestamp: Date.now(),
      toolName,
      reverted: false,
    };

    const sessionList = this.backups.get(sessionId) || [];
    sessionList.push(record);

    // Evict oldest if exceeding capacity
    if (sessionList.length > MAX_SESSION_BACKUPS) {
      sessionList.shift();
    }

    this.backups.set(sessionId, sessionList);
    return backupId;
  }

  /**
   * Finalize backup with modified content after write/edit completes
   */
  public recordModification(backupId: string, modifiedContent: string) {
    for (const list of this.backups.values()) {
      const found = list.find((b) => b.id === backupId);
      if (found) {
        found.modifiedContent =
          Buffer.byteLength(modifiedContent) <= MAX_SNAPSHOT_FILE_BYTES ? modifiedContent : '';
        break;
      }
    }
  }

  /**
   * Revert the most recent file change in the active session (/undo)
   */
  public async undoLastChange(sessionId: string): Promise<{
    success: boolean;
    filePath?: string;
    message?: string;
  }> {
    const fs = await import('node:fs/promises');

    const list = this.backups.get(sessionId);
    if (!list || list.length === 0) {
      return { success: false, message: 'No changes found to undo in this session.' };
    }

    // Find latest non-reverted backup
    const target = [...list].reverse().find((b) => !b.reverted);
    if (!target) {
      return { success: false, message: 'All session changes have already been undone.' };
    }

    try {
      if (target.originalContent === '') {
        // If file was originally created from scratch, delete it on undo
        await fs.unlink(target.filePath);
      } else {
        // Restore original content
        await fs.writeFile(target.filePath, target.originalContent, 'utf-8');
      }

      target.reverted = true;
      return {
        success: true,
        filePath: target.filePath,
        message: `Successfully reverted changes to ${target.filePath}`,
      };
    } catch (err: any) {
      return {
        success: false,
        filePath: target.filePath,
        message: `Failed to restore file: ${err.message}`,
      };
    }
  }

  /**
   * List all backup snapshots for a session
   */
  public getSessionBackups(sessionId: string): ShadowBackupRecord[] {
    return this.backups.get(sessionId) || [];
  }
}
