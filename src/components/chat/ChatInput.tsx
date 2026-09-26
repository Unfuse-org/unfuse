import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Square,
  FileDiff,
  FileCode,
  Terminal,
  ShieldCheck,
  BookOpen,
  Trash2,
  FolderSearch,
  KeyRound,
  X,
  FileText,
  Folder,
  Mic,
  MicOff,
} from 'lucide-react';
import { ActiveModelTarget, ClarificationRequest } from './types';
import { ClarificationPanel } from './ClarificationPanel';
import { VoiceOrbSquare } from './VoiceOrbSquare';
import { getModelLogo } from '../rack/MountModelView';
import {
  GitHubLogo,
  LinearLogo,
  SentryLogo,
  SlackLogo,
  BraveLogo,
  TavilyLogo,
  DuckDuckGoLogo,
  ExaLogo,
  GoogleLogo,
  McpLogo,
} from '../integrations/IntegrationLogos';
import { ServiceId } from '../integrations/types';

export interface CodebaseFileItem {
  id: string;
  name: string;
  path: string;
  type: 'code' | 'config' | 'doc';
  size?: string;
  lines?: number;
}

export const WORKSPACE_FILES: CodebaseFileItem[] = [
  { id: 'f-1', name: 'App.tsx', path: 'src/App.tsx', type: 'code', lines: 198, size: '7.8 KB' },
  { id: 'f-2', name: 'ChatPanel.tsx', path: 'src/components/chat/ChatPanel.tsx', type: 'code', lines: 1080, size: '41 KB' },
  { id: 'f-3', name: 'ChatInput.tsx', path: 'src/components/chat/ChatInput.tsx', type: 'code', lines: 635, size: '21 KB' },
  { id: 'f-4', name: 'MessageItem.tsx', path: 'src/components/chat/MessageItem.tsx', type: 'code', lines: 320, size: '14 KB' },
  { id: 'f-5', name: 'ClarificationPanel.tsx', path: 'src/components/chat/ClarificationPanel.tsx', type: 'code', lines: 260, size: '10 KB' },
  { id: 'f-6', name: 'ToolCallItem.tsx', path: 'src/components/chat/ToolCallItem.tsx', type: 'code', lines: 340, size: '12 KB' },
  { id: 'f-7', name: 'RackPanel.tsx', path: 'src/components/rack/RackPanel.tsx', type: 'code', lines: 450, size: '18 KB' },
  { id: 'f-8', name: 'SidebarPanel.tsx', path: 'src/components/sidebar/SidebarPanel.tsx', type: 'code', lines: 380, size: '15 KB' },
  { id: 'f-14', name: 'package.json', path: 'package.json', type: 'config', lines: 42, size: '1.4 KB' },
  { id: 'f-15', name: 'Cargo.toml', path: 'Cargo.toml', type: 'config', lines: 30, size: '1.1 KB' },
  { id: 'f-16', name: 'tsconfig.json', path: 'tsconfig.json', type: 'config', lines: 28, size: '0.8 KB' },
];

interface ChatInputProps {
  onSendMessage: (content: string, modelTarget?: ActiveModelTarget) => void;
  isStreaming?: boolean;
  onStopStreaming?: () => void;
  availableModels?: ActiveModelTarget[];
  activeModel?: ActiveModelTarget;
  onSelectActiveModel?: (model: ActiveModelTarget) => void;
  onOpenIntegrations?: (tabOrService?: ServiceId | 'mcp') => void;
  activeClarification?: ClarificationRequest | null;
  onSubmitClarification?: (response: { selectedOptions: string[]; customText?: string }) => void;
  onDismissClarification?: () => void;
}



export interface CommandItem {
  id: string;
  name: string;
  tag: string;
  description: string;
  category?: 'core' | 'integration';
  serviceId?: ServiceId;
  icon: React.ReactNode;
}

export const COMMAND_LIST: CommandItem[] = [
  // 1. OFFICIAL CONNECTIONS & SERVICE INTEGRATIONS
  {
    id: 'cmd-connections',
    name: 'Connections',
    tag: '#connections',
    category: 'integration',
    description: 'Paste & manage service API keys',
    icon: <KeyRound className="w-3.5 h-3.5 text-amber-300" />,
  },
  {
    id: 'cmd-mcp',
    name: 'MCP',
    tag: '#mcp',
    category: 'integration',
    description: 'Model Context Protocol server manager',
    icon: <McpLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-github',
    name: 'GitHub',
    tag: '#github',
    category: 'integration',
    serviceId: 'github',
    description: 'Assigned PRs, issues & commits',
    icon: <GitHubLogo size={14} className="w-3.5 h-3.5 text-white" />,
  },
  {
    id: 'cmd-linear',
    name: 'Linear',
    tag: '#linear',
    category: 'integration',
    serviceId: 'linear',
    description: 'Sprint backlog & active tickets',
    icon: <LinearLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-sentry',
    name: 'Sentry',
    tag: '#sentry',
    category: 'integration',
    serviceId: 'sentry',
    description: 'Production crashes & triage',
    icon: <SentryLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-slack',
    name: 'Slack',
    tag: '#slack',
    category: 'integration',
    serviceId: 'slack',
    description: 'Channel alerts & summaries',
    icon: <SlackLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-search',
    name: 'Search Web',
    tag: '#search',
    category: 'integration',
    serviceId: 'duckduckgo',
    description: 'Instant default web search (DuckDuckGo)',
    icon: <DuckDuckGoLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-tavily',
    name: 'Tavily Search',
    tag: '#tavily',
    category: 'integration',
    serviceId: 'tavily',
    description: 'AI real-time web & docs search',
    icon: <TavilyLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-brave',
    name: 'Brave Search',
    tag: '#brave',
    category: 'integration',
    serviceId: 'brave',
    description: 'Independent privacy web search',
    icon: <BraveLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-exa',
    name: 'Exa Neural',
    tag: '#exa',
    category: 'integration',
    serviceId: 'exa',
    description: 'Neural code & repo search',
    icon: <ExaLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-google',
    name: 'Google Search',
    tag: '#google',
    category: 'integration',
    serviceId: 'google',
    description: 'Google programmable web search',
    icon: <GoogleLogo size={14} className="w-3.5 h-3.5" />,
  },
  {
    id: 'cmd-ddg',
    name: 'DuckDuckGo',
    tag: '#ddg',
    category: 'integration',
    serviceId: 'duckduckgo',
    description: 'Zero-key instant web search',
    icon: <DuckDuckGoLogo size={14} className="w-3.5 h-3.5" />,
  },

  // 2. CORE CODING ASSISTANT COMMANDS
  {
    id: 'cmd-diff',
    name: 'Diff Patch',
    tag: '#diff',
    category: 'core',
    description: 'Myers AST visual diff patch',
    icon: <FileDiff className="w-3.5 h-3.5 text-emerald-400" />,
  },
  {
    id: 'cmd-read',
    name: 'Read File',
    tag: '#read',
    category: 'core',
    description: 'Inspect sliced line ranges',
    icon: <FileCode className="w-3.5 h-3.5 text-amber-300" />,
  },
  {
    id: 'cmd-find',
    name: 'Find Files',
    tag: '#find',
    category: 'core',
    description: 'Discover project files via fd',
    icon: <FolderSearch className="w-3.5 h-3.5 text-cyan-300" />,
  },
  {
    id: 'cmd-run',
    name: 'Run Terminal',
    tag: '#run',
    category: 'core',
    description: 'Execute native shell command',
    icon: <Terminal className="w-3.5 h-3.5 text-indigo-300" />,
  },
  {
    id: 'cmd-review',
    name: 'Code Review',
    tag: '#review',
    category: 'core',
    description: 'Architectural & security audit',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />,
  },
  {
    id: 'cmd-explain',
    name: 'Explain Code',
    tag: '#explain',
    category: 'core',
    description: 'Logic & structure breakdown',
    icon: <BookOpen className="w-3.5 h-3.5 text-pink-400" />,
  },
  {
    id: 'cmd-clear',
    name: 'Clear Chat',
    tag: '#clear',
    category: 'core',
    description: 'Reset canvas conversation state',
    icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
  },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming = false,
  onStopStreaming,
  availableModels = [],
  activeModel,
  onSelectActiveModel,
  onOpenIntegrations,
  activeClarification,
  onSubmitClarification,
  onDismissClarification,
}) => {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [mentionType, setMentionType] = useState<'model' | 'command' | 'file' | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState<number>(108);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [input, attachedFiles]);

  // Track composer height to ensure VoiceOrbSquare is an exact pixel-matched square
  useEffect(() => {
    if (!composerRef.current) return;
    const updateHeight = () => {
      if (composerRef.current) {
        setComposerHeight(composerRef.current.offsetHeight);
      }
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, [input, attachedFiles]);

  // Check for @, #, or / triggers on text change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastWordMatch = textBeforeCursor.match(/([@#/])([a-zA-Z0-9_./-]*)$/);

    if (lastWordMatch) {
      const trigger = lastWordMatch[1];
      const query = lastWordMatch[2];
      if (trigger === '@') {
        setMentionType('model');
      } else if (trigger === '#') {
        setMentionType('command');
      } else if (trigger === '/') {
        setMentionType('file');
      }
      setMentionQuery(query);
      setSelectedIndex(0);
    } else {
      setMentionType(null);
      setMentionQuery('');
    }
  };

  // Filter models, commands, or files based on query
  const filteredModels = availableModels.filter(
    (m) =>
      m.displayName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      (m.family ? m.family.toLowerCase().includes(mentionQuery.toLowerCase()) : false)
  );

  const filteredCommands = COMMAND_LIST.filter(
    (c) =>
      c.tag.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const filteredFiles = WORKSPACE_FILES.filter(
    (f) =>
      f.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      f.path.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const insertFileMention = (file: CodebaseFileItem) => {
    if (!attachedFiles.includes(file.path)) {
      setAttachedFiles((prev) => [...prev, file.path]);
    }

    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/(\/)([a-zA-Z0-9_./-]*)$/, '');
    const newInput = updatedBefore + textAfterCursor;

    setInput(newInput);
    setMentionType(null);
    setMentionQuery('');

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  const removeAttachedFile = (pathToRemove: string) => {
    setAttachedFiles((prev) => prev.filter((p) => p !== pathToRemove));
  };

  const insertMention = (replacementText: string, modelTarget?: ActiveModelTarget) => {
    if (replacementText === '#connections' || replacementText === '#integrations') {
      onOpenIntegrations?.();
      setMentionType(null);
      setMentionQuery('');
      return;
    }

    if (replacementText === '#mcp' || replacementText === '#mcps') {
      onOpenIntegrations?.('mcp');
      setMentionType(null);
      setMentionQuery('');
      return;
    }

    if (!textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = input.slice(0, cursorPos);
    const textAfterCursor = input.slice(cursorPos);

    const updatedBefore = textBeforeCursor.replace(/([@#])([a-zA-Z0-9_-]*)$/, replacementText + ' ');
    const newInput = updatedBefore + textAfterCursor;

    setInput(newInput);
    setMentionType(null);
    setMentionQuery('');

    if (modelTarget) {
      onSelectActiveModel?.(modelTarget);
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = updatedBefore.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Mentions menu keyboard navigation
    if (mentionType) {
      const listLength =
        mentionType === 'model'
          ? filteredModels.length
          : mentionType === 'command'
          ? filteredCommands.length
          : filteredFiles.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, listLength));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + listLength) % Math.max(1, listLength));
        return;
      }

      if ((e.key === 'Enter' || e.key === 'Tab') && listLength > 0) {
        e.preventDefault();
        if (mentionType === 'model') {
          const chosen = filteredModels[selectedIndex];
          if (chosen) insertMention(`@${chosen.family}`, chosen);
        } else if (mentionType === 'command') {
          const chosen = filteredCommands[selectedIndex];
          if (chosen) insertMention(chosen.tag);
        } else if (mentionType === 'file') {
          const chosen = filteredFiles[selectedIndex];
          if (chosen) insertFileMention(chosen);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionType(null);
        return;
      }
    }

    // Submit on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isStreaming) return;

    // Check if user entered #connections alone
    if (input.trim() === '#connections' || input.trim() === '#integrations') {
      onOpenIntegrations?.();
      setInput('');
      return;
    }

    // Check if user entered #mcp alone
    if (input.trim() === '#mcp' || input.trim() === '#mcps') {
      onOpenIntegrations?.('mcp');
      setInput('');
      return;
    }

    // Build final message payload with attached files if present
    let finalContent = input.trim();
    if (attachedFiles.length > 0) {
      const fileContextTags = attachedFiles.map((f) => `/${f}`).join(' ');
      finalContent = finalContent ? `${fileContextTags} ${finalContent}` : fileContextTags;
    }

    // Check if user specifically mentioned @model in prompt
    let targetModel = activeModel;
    for (const m of availableModels) {
      if (
        finalContent.toLowerCase().includes(`@${m.family}`) ||
        finalContent.toLowerCase().includes(`@${m.displayName.toLowerCase()}`)
      ) {
        targetModel = m;
        break;
      }
    }

    onSendMessage(finalContent, targetModel);
    setInput('');
    setAttachedFiles([]);
    setMentionType(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-5 select-none">
      {/* DOCKED CLARIFICATION PANEL */}
      {activeClarification && onSubmitClarification && onDismissClarification && (
        <ClarificationPanel
          request={activeClarification}
          onSubmit={onSubmitClarification}
          onDismiss={onDismissClarification}
        />
      )}

      {/* COMPOSER & VOICE PANEL FLEX CONTAINER */}
      <div className="flex items-stretch gap-2.5 w-full">
        {/* 1. FLOATING CARD COMPOSER */}
        <div
          ref={composerRef}
          className="flex-1 min-w-0 relative rounded-2xl bg-[#141418] border border-[#27272a] shadow-2xl focus-within:border-[#3f3f46] focus-within:ring-1 focus-within:ring-white/10 p-3 flex flex-col justify-between"
        >
          {/* 1. @ MENTION MODEL POPUP */}
          {mentionType === 'model' && filteredModels.length > 0 && (
            <div className="absolute bottom-full left-3 mb-2 w-72 max-h-60 overflow-y-auto overflow-x-hidden bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in duration-100 font-mono popup-scroll">
              {filteredModels.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => insertMention(`@${m.family}`, m)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    selectedIndex === idx
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center p-0.5 shrink-0">
                      {getModelLogo(m.family || 'custom', 12)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-[12px] font-semibold text-sky-400">
                        @{m.name || m.displayName}
                      </span>
                      <span className="truncate text-[10px] text-white/40 font-sans">
                        {m.displayName}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-sky-300/60 ml-1 shrink-0">
                    {m.port}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 2. # RUN COMMAND POPUP (Without top header bar, perfectly contained scrollbar) */}
          {mentionType === 'command' && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-3 mb-2 w-80 max-h-64 overflow-y-auto overflow-x-hidden bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in duration-100 font-mono popup-scroll">
              {filteredCommands.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => insertMention(c.tag)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                    selectedIndex === idx
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/10">
                    {c.icon}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-[11.5px]">{c.tag}</span>
                      <span className="text-[10px] text-white/30">{c.name}</span>
                    </div>
                    <span className="text-[10.5px] text-white/40 truncate font-sans">
                      {c.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 3. / FILE & CODEBASE CONTEXT POPUP */}
          {mentionType === 'file' && filteredFiles.length > 0 && (
            <div className="absolute bottom-full left-3 mb-2 w-88 max-h-64 overflow-y-auto overflow-x-hidden bg-[#121215] border border-[#27272a] rounded-xl shadow-2xl z-50 p-1 space-y-0.5 animate-in fade-in duration-100 font-mono popup-scroll">
              {filteredFiles.map((f, idx) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => insertFileMention(f)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                    selectedIndex === idx
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
                    <FileCode className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-[12px] truncate">
                        {f.name}
                      </span>
                      {f.lines && (
                        <span className="text-[10px] text-white/30 shrink-0 font-mono">
                          {f.lines}L
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] text-white/40 truncate font-mono">
                      {f.path}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ATTACHED FILE CONTEXT BADGE TRAY */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2">
              {attachedFiles.map((filePath, idx) => {
                const basename = filePath.split('/').pop() || filePath;
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-400/20 text-[11px] font-mono text-emerald-300 select-none group"
                  >
                    <FileCode className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate max-w-[180px]">{basename}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(filePath)}
                      className="text-emerald-400/50 hover:text-emerald-200 transition-colors cursor-pointer"
                      title="Remove context"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* TEXTAREA */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isVoiceActive
                ? 'Listening to your voice... speak naturally'
                : 'Message... type @ for models, # for commands, / for files'
            }
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-white/95 placeholder:text-white/30 text-[13.5px] leading-relaxed px-1.5 pt-0.5 pb-2.5 font-sans max-h-52 overflow-y-auto"
          />

          {/* BOTTOM TOOLBAR */}
          <div className="flex items-center justify-between pt-1.5">
            {/* LEFT: UNIFIED ACTION CHIPS (ATTACH, @MODEL, #COMMAND, /FILE) */}
            <div className="flex items-center gap-1.5">
              {/* ATTACH CHIP */}
              <button
                type="button"
                onClick={() => {
                  setInput((prev) => (prev ? prev + ' /' : '/'));
                  setMentionType('file');
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-medium text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 group"
                title="Attach File or Context (/)"
              >
                <Paperclip className="w-4 h-4 text-orange-400 group-hover:text-orange-300 transition-colors shrink-0" />
                <span>Attach</span>
              </button>

              {/* @MODEL CHIP */}
              <button
                type="button"
                onClick={() => {
                  setInput((prev) => (prev ? prev + ' @' : '@'));
                  setMentionType('model');
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-medium text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 group"
                title="Mention Model (@)"
              >
                <span className="text-sky-400 font-bold text-[14.5px] leading-none group-hover:text-sky-300 transition-colors font-mono">@</span>
                <span>model</span>
              </button>

              {/* #COMMAND CHIP */}
              <button
                type="button"
                onClick={() => {
                  setInput((prev) => (prev ? prev + ' #' : '#'));
                  setMentionType('command');
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-medium text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 group"
                title="Run Command or Connections (#)"
              >
                <span className="text-sky-400 font-bold text-[14.5px] leading-none group-hover:text-cyan-300 transition-colors font-mono">#</span>
                <span>command</span>
              </button>

              {/* /FILE CHIP */}
              <button
                type="button"
                onClick={() => {
                  setInput((prev) => (prev ? prev + ' /' : '/'));
                  setMentionType('file');
                  textareaRef.current?.focus();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[12px] font-medium text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 group"
                title="Attach File or Codebase Context (/)"
              >
                <span className="text-emerald-400 font-bold text-[14.5px] leading-none group-hover:text-emerald-300 transition-colors font-mono">/</span>
                <span>file</span>
              </button>
            </div>

            {/* RIGHT: VOICE BUTTON + SEND / STOP BUTTON */}
            <div className="flex items-center gap-1.5">
              {/* MICROPHONE VOICE DICTATION BUTTON */}
              <button
                type="button"
                onClick={() => setIsVoiceActive((prev) => !prev)}
                className={`w-7 h-7 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                  isVoiceActive
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-xs animate-pulse'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.08]'
                }`}
                title={isVoiceActive ? 'Stop Voice Recording' : 'Voice Input (Live Dictation)'}
              >
                <Mic className="w-3.5 h-3.5" />
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="w-7 h-7 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-colors cursor-pointer"
                  title="Stop Generation"
                >
                  <Square className="w-3 h-3 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={!input.trim()}
                  className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${
                    input.trim()
                      ? 'bg-white text-black hover:bg-white/90 shadow-md scale-100 cursor-pointer active:scale-95'
                      : 'bg-white/10 text-white/20 cursor-not-allowed'
                  }`}
                  title="Send Message (Enter)"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 3a1 1 0 0 1 .707.293l6 6a1 1 0 0 1-1.414 1.414L13 6.414V20a1 1 0 1 1-2 0V6.414L6.707 10.707a1 1 0 0 1-1.414-1.414l6-6A1 1 0 0 1 12 3z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. AUDIO-REACTIVE GRADIENT ORB SQUARE PANEL */}
        {isVoiceActive && (
          <VoiceOrbSquare
            isActive={isVoiceActive}
            size={composerHeight}
            onStop={() => setIsVoiceActive(false)}
            onTranscript={(text) => {
              setInput((prev) => (prev ? `${prev} ${text}` : text));
            }}
          />
        )}
      </div>
    </div>
  );
};
