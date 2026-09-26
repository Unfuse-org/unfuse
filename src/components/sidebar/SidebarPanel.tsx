import React, { useState } from 'react';
import { ChatSession } from './types';
import {
  HomeIcon,
  NewChatIcon,
  SearchIcon,
  MessageBubbleIcon,
  PinIcon,
  TrashIcon,
} from './SidebarSVGs';

import { BtopTelemetryPopover } from '../chat/BtopTelemetryPopover';

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
  activeSessionId = 's-1',
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
    onNewChat?.();
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    onUpdateSessions?.(updated);
    if (activeId === id && updated.length > 0) {
      setActiveId(updated[0].id);
      onSelectSession?.(updated[0].id);
    }
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, pinned: !s.pinned } : s
    );
    setSessions(updated);
    onUpdateSessions?.(updated);
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updated = sessions.map((s) =>
      s.id === id ? { ...s, title: newTitle.trim() } : s
    );
    setSessions(updated);
    onUpdateSessions?.(updated);
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  return (
    <div className="flex flex-col h-full w-full select-none text-white/90 overflow-hidden font-sans">
      {/* 1. TOP TITLEBAR DRAG REGION (MACOS TRAFFIC LIGHT PADDING) */}
      <div
        className="h-8 w-full flex-shrink-0"
        data-tauri-drag-region
      />

      {/* 2. ACTIONS: SEARCH BAR */}
      <div className="px-3 mb-2">
        <div className="relative flex items-center">
          <div className="absolute left-2.5 text-white/30 pointer-events-none flex items-center">
            <SearchIcon size={13} />
          </div>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-7 pr-7 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/[0.08] focus:border-white/20 rounded-lg text-xs text-white placeholder-white/30 outline-none transition-all"
          />
          <span className="absolute right-2 text-[9.5px] font-mono text-white/25 pointer-events-none">
            ⌘K
          </span>
        </div>
      </div>

      {/* 3. TOOLBAR BUTTONS: HOME, NEW CHAT, SYSTEM INFO (EVENLY ALIGNED) */}
      <div className="px-3 mb-3 grid grid-cols-3 gap-1.5">
        {/* HOME BUTTON */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-launcher'))}
          title="Home / Workspace Launcher"
          className="h-7 px-1.5 rounded-lg bg-[#121215] hover:bg-[#18181c] border border-[#222228] hover:border-[#33333a] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[#a1a1aa] hover:text-white"
        >
          <HomeIcon size={12} />
          <span className="text-[11px] font-medium tracking-tight">Home</span>
        </button>

        {/* NEW CHAT BUTTON */}
        <button
          type="button"
          onClick={handleCreateNew}
          title="New Chat (⌘N)"
          className="h-7 px-1.5 rounded-lg bg-[#121215] hover:bg-[#18181c] border border-[#222228] hover:border-[#33333a] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-[#a1a1aa] hover:text-white"
        >
          <NewChatIcon size={12} />
          <span className="text-[11px] font-medium tracking-tight">New</span>
        </button>

        {/* SYSTEM MONITOR / TELEMETRY */}
        <div className="h-7 rounded-lg bg-[#121215] hover:bg-[#18181c] border border-[#222228] hover:border-[#33333a] transition-all flex items-center justify-center">
          <BtopTelemetryPopover />
        </div>
      </div>

      {/* 3. CHAT SESSIONS LIST */}
      <div className="flex-1 overflow-y-auto px-2 space-y-3 pb-3">
        {/* PINNED SESSIONS */}
        {pinnedSessions.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
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
          <div className="px-2 mb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
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
      className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
        isActive
          ? 'bg-[#18181c] text-white font-medium shadow-xs border border-[#27272a]'
          : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#121215]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
        <MessageBubbleIcon
          size={13}
          className={isActive ? 'text-white shrink-0' : 'text-white/30 shrink-0'}
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
            className="w-full bg-transparent text-white text-[11.5px] border-b border-white/60 pb-0.5 outline-none font-medium leading-tight focus:border-white"
          />
        ) : (
          <span
            className="truncate tracking-tight text-[11.5px]"
            title="Double click to rename"
          >
            {session.title}
          </span>
        )}
      </div>

      {/* HOVER ACTIONS */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          type="button"
          onClick={(e) => onTogglePin(e, session.id)}
          title={session.pinned ? 'Unpin' : 'Pin'}
          className={`p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer ${
            session.pinned ? 'text-white/80' : ''
          }`}
        >
          <PinIcon size={13.5} />
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, session.id)}
          title="Delete Chat"
          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <TrashIcon size={13.5} />
        </button>
      </div>
    </div>
  );
};
