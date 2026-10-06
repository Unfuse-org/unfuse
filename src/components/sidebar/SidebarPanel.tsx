import React, { useState } from 'react';
import { ChatSession } from './types';
import {
  NewChatIcon,
  SearchIcon,
  MessageBubbleIcon,
  PinIcon,
  TrashIcon,
} from './SidebarSVGs';


export const INITIAL_SESSIONS: ChatSession[] = [
  {
    id: 's-main',
    title: 'General Workspace Chat',
    updatedAt: new Date(),
    messageCount: 0,
    modelUsed: 'Local Model',
    pinned: false,
  },
];

interface SidebarPanelProps {
  activeSessionId?: string;
  sessions?: ChatSession[];
  onSelectSession?: (id: string) => void;
  onNewChat?: () => void;
  onUpdateSessions?: (sessions: ChatSession[]) => void;
}

export const SidebarPanel: React.FC<SidebarPanelProps> = ({
  activeSessionId = 's-main',
  sessions: propSessions,
  onSelectSession,
  onNewChat,
  onUpdateSessions,
}) => {
  const [internalSessions, setInternalSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const sessions = propSessions || internalSessions;
  const setSessions = (updater: ((prev: ChatSession[]) => ChatSession[]) | ChatSession[]) => {
    const updated = typeof updater === 'function' ? updater(sessions) : updater;
    setInternalSessions(updated);
    onUpdateSessions?.(updated);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeId, setActiveId] = useState<string>(activeSessionId);

  React.useEffect(() => {
    setActiveId(activeSessionId);
  }, [activeSessionId]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    onSelectSession?.(id);
  };

  const handleCreateNew = () => {
    const newSess: ChatSession = {
      id: `s-${Date.now()}`,
      title: 'New Conversation',
      updatedAt: new Date(),
      messageCount: 0,
    };
    setSessions((prev) => [newSess, ...prev]);
    setActiveId(newSess.id);
    onSelectSession?.(newSess.id);
    onNewChat?.();
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    if (activeId === id) {
      setActiveId(updated[0]?.id ?? '');
      onSelectSession?.(updated[0]?.id ?? '');
    }
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, pinned: !s.pinned } : s
    );
    setSessions(updated);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, title: newTitle.trim() } : s
    );
    setSessions(updated);
  };

  const filteredSessions = sessions.filter((s) =>
    [s.title, s.modelUsed ?? ''].join(' ').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  return (
    <div className="flex flex-col h-full w-full select-none text-[var(--text-main)] overflow-hidden font-sans">
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Chats</h2>
        </div>
        <button type="button" onClick={handleCreateNew}
          className="w-full flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium border"
          style={{ backgroundColor: 'var(--bg-active)', borderColor: 'var(--border-subtle)' }}>
          <NewChatIcon size={13} /> New chat
        </button>
        <div className="relative mt-3">
          <span className="absolute left-3 top-2.5 opacity-50 pointer-events-none"><SearchIcon size={14} /></span>
          <input type="search" aria-label="Search chats by title or model" placeholder="Search chats..."
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-current"
            style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }} />
        </div>
      </div>

      {/* 3. CHAT SESSIONS LIST */}
      <div className="flex-1 overflow-y-auto px-2 space-y-5 pb-4">
        {filteredSessions.length === 0 && (
          <p className="text-xs opacity-60 px-3 py-5 text-center">
            {searchQuery ? 'No chats match your search.' : 'Start a new chat to begin.'}
          </p>
        )}
        {/* PINNED SESSIONS */}
        {pinnedSessions.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[10px] font-semibold text-[var(--text-main)] opacity-50 uppercase tracking-wider">
              Pinned
            </div>
            <div className="space-y-0.5">
              {pinnedSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={activeId === session.id}
                  onSelect={handleSelect}
                  onTogglePin={handleTogglePin}
                  onDelete={handleDeleteSession}
                  onRename={handleRenameSession}
                />
              ))}
            </div>
          </div>
        )}

        {/* RECENT SESSIONS */}
        <div>
          <div className="px-2 mb-1 text-[10px] font-semibold text-[var(--text-main)] opacity-50 uppercase tracking-wider">
            Recent
          </div>
          <div className="space-y-0.5">
            {unpinnedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={activeId === session.id}
                onSelect={handleSelect}
                onTogglePin={handleTogglePin}
                onDelete={handleDeleteSession}
                onRename={handleRenameSession}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onTogglePin,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(session.title);
  };

  const handleSubmit = () => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle.trim() !== session.title) {
      onRename(session.id, editTitle.trim());
    } else {
      setEditTitle(session.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(session.title);
    }
  };

  return (
    <div
      onClick={() => onSelect(session.id)}
      onDoubleClick={handleDoubleClick}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(session.id); }
        if (e.key === 'F2') { setEditTitle(session.title); setIsEditing(true); }
      }}
      className={`group relative flex items-center justify-between px-1.5 py-0.5 rounded text-xs transition-all cursor-pointer ${
        isActive
          ? 'bg-[var(--bg-active)] text-[var(--text-main)] font-medium border border-[var(--border-subtle)]'
          : 'text-[var(--text-main)] hover:bg-[var(--bg-active)] border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
        <MessageBubbleIcon
          size={13}
          className={isActive ? 'text-[var(--text-main)] shrink-0' : 'text-[var(--text-main)] opacity-50 shrink-0'}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-[var(--text-main)] text-[13px] border-b border-white/60 pb-0.5 outline-none font-medium leading-tight focus:border-white"
          />
        ) : (
          <div className="min-w-0">
            <p className="truncate tracking-tight text-[13px]" title="Double click or press F2 to rename">{session.title}</p>
          </div>
        )}
      </div>

      {/* HOVER ACTIONS */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={(e) => onTogglePin(e, session.id)}
          title={session.pinned ? 'Unpin' : 'Pin'}
          className={`p-1.5 rounded-md text-[var(--text-main)] opacity-60 hover:text-[var(--text-main)] hover:bg-white/[0.08] transition-all cursor-pointer ${
            session.pinned ? 'text-[var(--text-main)]' : ''
          }`}
        >
          <PinIcon size={13.5} />
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, session.id)}
          title="Delete Chat"
          className="p-1.5 rounded-md text-[var(--text-main)] opacity-60 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <TrashIcon size={13.5} />
        </button>
      </div>
    </div>
  );
};
