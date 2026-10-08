import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Archive, ArchiveRestore, Copy, Hash, Check, ArrowLeft, Eye, EyeOff, FolderInput, GitFork, Download, ChevronRight } from 'lucide-react';
import { ChatSession } from './types';
import {
  NewChatIcon,
  SearchIcon,
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
  const [showSearch, setShowSearch] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeId, setActiveId] = useState<string>(activeSessionId);

  React.useEffect(() => {
    setActiveId(activeSessionId);
  }, [activeSessionId]);

  const handleSelect = (id: string) => {
    setSessions(sessions.map(session => session.id === id ? { ...session, unread: false } : session));
    setActiveId(id);
    onSelectSession?.(id);
  };

  const handleCreateNew = () => {
    setShowArchived(false);
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

  const handleToggleUnread = (id: string) => {
    setSessions(sessions.map(session => session.id === id ? { ...session, unread: !session.unread } : session));
  };

  const handleToggleArchive = (id: string) => {
    setSessions(sessions.map(session => session.id === id ? { ...session, archived: !session.archived } : session));
    if (activeId === id) {
      const next = sessions.find(session => session.id !== id && Boolean(session.archived) === showArchived);
      setActiveId(next?.id ?? '');
      onSelectSession?.(next?.id ?? '');
    }
  };

  const filteredSessions = sessions.filter(s => Boolean(s.archived) === showArchived).filter((s) =>
    [s.title, s.modelUsed ?? ''].join(' ').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const pinnedSessions = filteredSessions.filter((s) => s.pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.pinned);

  return (
    <div className="flex flex-col h-full w-full select-none text-[var(--text-main)] overflow-hidden font-sans">
      <div className="px-2 pt-3 pb-5">
        <div className="px-3 py-2 mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">Unfuse</span>
        </div>
        <button type="button" onClick={handleCreateNew}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--bg-active)] transition-colors">
          <NewChatIcon size={18} /> New chat
        </button>
        <button type="button" onClick={() => { setShowSearch((open) => !open); setSearchQuery(''); }}
          aria-expanded={showSearch}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-[var(--bg-active)] transition-colors">
          <SearchIcon size={18} /> Search chats
        </button>
        {showSearch && (
          <input autoFocus type="search" aria-label="Search chats by title or model" placeholder="Search by title or model"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
            className="w-full rounded-lg border px-3 py-2 mt-2 text-xs outline-none focus:ring-1 focus:ring-current"
            style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-subtle)' }} />
        )}
      </div>

      <button type="button" onClick={() => setShowArchived(value => !value)} className="mx-2 mb-3 flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-active)]">
        {showArchived ? <ArrowLeft size={16} /> : <Archive size={16} />}
        {showArchived ? 'Back to chats' : `Archived chats${sessions.some(session => session.archived) ? ` (${sessions.filter(session => session.archived).length})` : ''}`}
      </button>
      {/* 3. CHAT SESSIONS LIST */}
      <div className="flex-1 overflow-y-auto px-2 space-y-5 pb-4">
        {filteredSessions.length === 0 && (
          <p className="text-xs opacity-60 px-3 py-5 text-center">
            {searchQuery ? 'No chats match your search.' : showArchived ? 'No archived chats.' : 'Start a new chat to begin.'}
          </p>
        )}
        {/* PINNED SESSIONS */}
        {pinnedSessions.length > 0 && (
          <div>
            <div className="px-2 mb-1 text-xs font-medium text-[var(--text-muted)]">
              Pinned chats
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
                  onToggleArchive={handleToggleArchive}
                  onToggleUnread={handleToggleUnread}
                />
              ))}
            </div>
          </div>
        )}

        {/* RECENT SESSIONS */}
        <div>
          <div className="px-2 mb-1 text-xs font-medium text-[var(--text-muted)]">
            {showArchived ? 'Archived chats' : 'Your chats'}
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
                  onToggleArchive={handleToggleArchive}
                  onToggleUnread={handleToggleUnread}
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
  onToggleArchive: (id: string) => void;
  onToggleUnread: (id: string) => void;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onTogglePin,
  onDelete,
  onRename,
  onToggleArchive,
  onToggleUnread,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const copyValue = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setCopyNotice(`${label} copied`); }
    catch { setCopyNotice('Could not copy'); }
  };
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);
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
      className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${
        isActive
          ? 'bg-[var(--bg-active)] text-[var(--text-main)]'
          : 'text-[var(--text-main)] hover:bg-[var(--bg-active)]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 pr-1">
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
            <p className={`truncate tracking-tight text-sm ${session.unread ? 'font-semibold' : ''}`} title="Double click or press F2 to rename">{session.title}</p>
          </div>
        )}
      </div>

      {session.unread && <span role="img" aria-label="Unread chat" className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mr-2" />}
      <div ref={menuRef} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label={`Options for ${session.title}`} aria-expanded={menuOpen}
          onClick={() => { setCopyNotice(''); setCopyOpen(false); setMenuOpen((open) => !open); }}
          className={`p-1 rounded-md hover:bg-[var(--bg-surface-hover)] transition-opacity ${menuOpen || isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}`}>
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 max-h-[min(520px,60vh)] overflow-y-auto p-1.5 rounded-xl border shadow-xl z-20"
            style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
            <button type="button" onClick={() => { setMenuOpen(false); setEditTitle(session.title); setIsEditing(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]">
              <Pencil size={14} /> Rename
            </button>
            <button type="button" onClick={(e) => { onTogglePin(e, session.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]">
              <PinIcon size={14} /> {session.pinned ? 'Unpin chat' : 'Pin chat'}
            </button>
            <button type="button" onClick={() => { onToggleUnread(session.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]">
              {session.unread ? <Eye size={14} /> : <EyeOff size={14} />} Mark as {session.unread ? 'read' : 'unread'}
            </button>
            <button type="button" disabled title="Unavailable until workspace projects are connected" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-40 cursor-not-allowed"><FolderInput size={14} /> Move to project</button>
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <button type="button" disabled title="Unavailable until conversation history is connected; forks must preserve the actual context" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-40 cursor-not-allowed"><GitFork size={14} /> Fork conversation</button>
            <button type="button" disabled title="Unavailable until conversation messages can be loaded" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs opacity-40 cursor-not-allowed"><Download size={14} /> Export conversation</button>
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <button type="button" aria-expanded={copyOpen} onClick={() => setCopyOpen(open => !open)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]"><Copy size={14} /> Copy<ChevronRight size={13} className={`ml-auto transition-transform ${copyOpen ? 'rotate-90' : ''}`} /></button>
            {copyOpen && <div className="pl-3">
              <button type="button" onClick={() => copyValue(session.title, 'Name')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]"><Pencil size={14} /> Chat name</button>
              <button type="button" onClick={() => copyValue(session.id, 'Chat ID')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]"><Hash size={14} /> Chat ID</button>
              <button type="button" disabled title="Unavailable until conversation messages can be loaded" className="w-full px-3 py-2 text-left text-xs opacity-40 cursor-not-allowed">Conversation</button>
            </div>}
            {copyNotice && <p role="status" className="flex items-center gap-2 px-3 py-1 text-[10px] text-[var(--text-muted)]"><Check size={12} />{copyNotice}</p>}
            <div className="my-1 border-t border-[var(--border-subtle)]" />
            <button type="button" title="Organise the current UI session; not yet saved across restarts" onClick={() => { onToggleArchive(session.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-[var(--bg-active)]">
              {session.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />} {session.archived ? 'Restore chat' : 'Archive chat'}
            </button>
            <button type="button" onClick={(e) => { onDelete(e, session.id); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10">
              <TrashIcon size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
