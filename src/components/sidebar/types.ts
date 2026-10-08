export interface ChatSession {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
  modelUsed?: string;
  pinned?: boolean;
  archived?: boolean;
  unread?: boolean;
}

export interface WorkspaceNode {
  id: string;
  name: string;
  path: string;
  isDirectory: boolean;
  isOpen?: boolean;
  children?: WorkspaceNode[];
  extension?: string;
}
