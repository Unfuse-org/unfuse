import type { ProjectMemoryItem } from './types';

/**
 * Project Memory & Developer Conventions Store
 */
export class ProjectMemoryStore {
  private memories = new Map<string, ProjectMemoryItem>();

  public setMemory(
    key: string,
    value: string,
    category: 'convention' | 'architecture' | 'preference' | 'rule' = 'convention'
  ): ProjectMemoryItem {
    const existing = Array.from(this.memories.values()).find((m) => m.key === key);
    const now = Date.now();

    if (existing) {
      existing.value = value;
      existing.category = category;
      existing.updatedAt = now;
      return existing;
    }

    const id = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const record: ProjectMemoryItem = {
      id,
      key,
      category,
      value,
      createdAt: now,
      updatedAt: now,
    };

    this.memories.set(id, record);
    return record;
  }

  public getMemory(key: string): string | undefined {
    const item = Array.from(this.memories.values()).find((m) => m.key === key);
    return item?.value;
  }

  public listMemories(): ProjectMemoryItem[] {
    return Array.from(this.memories.values());
  }

  public deleteMemory(key: string): boolean {
    const item = Array.from(this.memories.values()).find((m) => m.key === key);
    if (item) {
      return this.memories.delete(item.id);
    }
    return false;
  }

  /**
   * Formats all conventions and rules into a prompt memory block
   */
  public formatPromptBlock(): string {
    const items = this.listMemories();
    if (items.length === 0) return '';

    const lines = items.map((i) => `- [${i.category.toUpperCase()}] ${i.key}: ${i.value}`);
    return `<project_conventions>\n${lines.join('\n')}\n</project_conventions>`;
  }
}
