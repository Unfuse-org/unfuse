import { QuickLookPreview } from './QuickLookPreview';
import { TerminalPanel } from './TerminalPanel';
import React, { useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-mermaid';
import {
  Terminal,
  Folder,
  FolderOpen,
  GitCompare,
  FileCode,
  FileText,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Copy,
  Check,
  Bookmark,
  MessageSquare,
  Code2,
  ShieldCheck,
  WrapText,
} from 'lucide-react';
import {
  siTauri,
  siTypescript,
  siJavascript,
  siReact,
  siRust,
  siHtml5,
  siCss,
  siSass,
  siJson,
  siPython,
  siMarkdown,
  siGit,
  siDocker,
  siToml,
  siYaml,
  siGo,
  siCplusplus,
  siC,
  siSwift,
  siKotlin,
  siRuby,
  siPhp,
  siGnubash,
  siWebassembly,
  siVite,
  siTailwindcss,
  siEslint,
  siPrettier,
  siNpm,
  siSqlite,
  siPostgresql,
  siSvg,
  siGraphql,
  siPrisma,
} from 'simple-icons';
import { LinearLogo, NotionLogo } from '../integrations/IntegrationLogos';

export type AddPanelOption = 'terminal' | 'files' | 'changes' | 'library';

interface AddPanelProps {
  onClose: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  size?: string;
  children?: FileNode[];
}

interface ArtifactItem {
  id: string;
  title: string;
  type: 'markdown' | 'json' | 'diff' | 'diagram';
  size: string;
  timestamp: string;
  description: string;
  content: string;
}

interface IntegrationItem {
  id: string;
  service: 'linear' | 'notion';
  title: string;
  subtitle: string;
  timestamp: string;
  url: string;
}

interface LibraryItem {
  id: string;
  title: string;
  category: 'prompt' | 'context' | 'snippet' | 'rule';
  description: string;
  content: string;
  usageCount: number;
  logo?: 'tauri' | 'tailwind' | 'integrations';
  language?: string;
}

// OFFICIAL COLORED FILE ICONS FOR ALL LANGUAGES, FORMATS, AND DEV TOOLS
export const FileIcon: React.FC<{ filename: string; size?: number }> = ({ filename, size = 14 }) => {
  const lower = filename.toLowerCase();

  const renderSvg = (path: string, color: string) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="shrink-0">
      <path d={path} />
    </svg>
  );

  // 1. Exact Filenames & Configs
  if (lower === 'package.json' || lower === 'package-lock.json') return renderSvg(siNpm.path, '#CB3837');
  if (lower === 'vite.config.ts' || lower === 'vite.config.js') return renderSvg(siVite.path, '#646CFF');
  if (lower.startsWith('tailwind.config')) return renderSvg(siTailwindcss.path, '#06B6D4');
  if (lower.startsWith('tsconfig')) return renderSvg(siTypescript.path, '#3178C6');
  if (lower.startsWith('cargo.')) return renderSvg(siRust.path, '#CE412B');
  if (lower.startsWith('.git')) return renderSvg(siGit.path, '#F05032');
  if (lower === 'dockerfile' || lower.startsWith('docker-compose')) return renderSvg(siDocker.path, '#2496ED');
  if (lower.includes('eslint')) return renderSvg(siEslint.path, '#4B32C3');
  if (lower.includes('prettier')) return renderSvg(siPrettier.path, '#F7B93E');
  if (lower === 'schema.prisma') return renderSvg(siPrisma.path, '#5A67D8');

  // 2. Language & File Extensions
  const ext = lower.slice(lower.lastIndexOf('.'));
  switch (ext) {
    case '.tsx':
      return renderSvg(siReact.path, '#61DAFB');
    case '.ts':
      return renderSvg(siTypescript.path, '#3178C6');
    case '.jsx':
      return renderSvg(siReact.path, '#61DAFB');
    case '.js':
    case '.mjs':
    case '.cjs':
      return renderSvg(siJavascript.path, '#F7DF1E');
    case '.rs':
      return renderSvg(siRust.path, '#CE412B');
    case '.html':
    case '.htm':
      return renderSvg(siHtml5.path, '#E34F26');
    case '.css':
      return renderSvg(siCss.path, '#1572B6');
    case '.scss':
    case '.sass':
      return renderSvg(siSass.path, '#CC6699');
    case '.json':
    case '.json5':
    case '.jsonl':
      return renderSvg(siJson.path, '#FBC02D');
    case '.py':
      return renderSvg(siPython.path, '#3776AB');
    case '.md':
    case '.markdown':
      return renderSvg(siMarkdown.path, '#42A5F5');
    case '.svg':
      return renderSvg(siSvg.path, '#FFB13B');
    case '.toml':
      return renderSvg(siToml.path, '#9C4121');
    case '.yaml':
    case '.yml':
      return renderSvg(siYaml.path, '#CB171E');
    case '.sh':
    case '.bash':
    case '.zsh':
      return renderSvg(siGnubash.path, '#4EAA25');
    case '.go':
      return renderSvg(siGo.path, '#00ADD8');
    case '.cpp':
    case '.cc':
    case '.cxx':
      return renderSvg(siCplusplus.path, '#00599C');
    case '.c':
    case '.h':
      return renderSvg(siC.path, '#A8B9CC');
    case '.sql':
      return renderSvg(siPostgresql.path, '#4169E1');
    case '.sqlite':
      return renderSvg(siSqlite.path, '#003B57');
    case '.graphql':
    case '.gql':
      return renderSvg(siGraphql.path, '#E10098');
    case '.wasm':
      return renderSvg(siWebassembly.path, '#654FF0');
    case '.swift':
      return renderSvg(siSwift.path, '#F05138');
    case '.kt':
    case '.kts':
      return renderSvg(siKotlin.path, '#7F52FF');
    case '.rb':
      return renderSvg(siRuby.path, '#CC342D');
    case '.php':
      return renderSvg(siPhp.path, '#777BB4');
    case '.diff':
    case '.patch':
      return renderSvg(siGit.path, '#F05032');
    default:
      return <FileText size={size} className="shrink-0 text-zinc-400" />;
  }
};

const INITIAL_WORKSPACE_FILES: FileNode[] = [];

const SAMPLE_FILES_CODE: Record<string, string> = {};

const getFileCode = (filename: string): string => {
  if (SAMPLE_FILES_CODE[filename]) return SAMPLE_FILES_CODE[filename];
  return '';
};

const getPrismLang = (filename: string) => {
  const lower = filename.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf('.'));
  let lang = 'typescript';
  if (ext === '.tsx') lang = 'tsx';
  else if (ext === '.ts') lang = 'typescript';
  else if (ext === '.jsx') lang = 'jsx';
  else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') lang = 'javascript';
  else if (ext === '.rs') lang = 'rust';
  else if (ext === '.py') lang = 'python';
  else if (ext === '.json' || ext === '.json5') lang = 'json';
  else if (ext === '.css' || ext === '.scss') lang = 'css';
  else if (ext === '.html' || ext === '.htm') lang = 'html';
  else if (ext === '.md' || ext === '.markdown') lang = 'markdown';
  else if (ext === '.sh' || ext === '.bash' || ext === '.zsh' || lower === 'dockerfile') lang = 'bash';
  else if (ext === '.go') lang = 'go';
  else if (ext === '.diff' || ext === '.patch') lang = 'diff';
  else if (ext === '.mermaid' || ext === '.mmd') lang = 'mermaid';

  const grammar = (Prism.languages as Record<string, Prism.Grammar>)[lang] || Prism.languages.typescript || Prism.languages.javascript;
  return { lang, grammar };
};

const CONTROL_FLOW_KEYWORDS = new Set([
  'import', 'export', 'from', 'as', 'default', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
  'yield', 'await', 'async'
]);

Prism.hooks.add('wrap', (env) => {
  if (env.type === 'keyword' && typeof env.content === 'string' && CONTROL_FLOW_KEYWORDS.has(env.content.trim())) {
    env.classes.push('control-flow');
  }
});

['javascript', 'jsx', 'typescript', 'tsx', 'python', 'rust', 'go'].forEach((lang) => {
  if (Prism.languages[lang]) {
    Prism.languages.insertBefore(lang, 'punctuation', {
      property: /(?<=\.)[a-zA-Z_$][a-zA-Z0-9_$]*/,
      'class-name': /\b[A-Z][a-zA-Z0-9_$]*\b/,
      variable: /\b[a-z_$][a-zA-Z0-9_$]*\b/,
    });
  }
});

// RECENTS (RECENTLY MADE ARTIFACTS CREATED BY AGENT/WORKSPACE)
const INITIAL_ARTIFACTS: ArtifactItem[] = [];

// PUSHED TO INTEGRATIONS (NOTION, LINEAR - KEEP ORIGINAL LOGOS)
const INITIAL_INTEGRATIONS: IntegrationItem[] = [];

// LIBRARY ITEMS (THE STUFF PEOPLE SEND TO AI: PROMPTS, CONTEXT, TEMPLATES, REFERENCES)
const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [];

export const AddPanel: React.FC<AddPanelProps> = ({ onClose, onExpandedChange }) => {
  const [activeOption, setActiveOption] = useState<AddPanelOption | null>(null);

  // Files state (Left: code editor blank canvas, Right: files tree)
  const [fileSearch, setFileSearch] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [wordWrap, setWordWrap] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/components': true,
  });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  // Library view state (stuff people send to AI)
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'prompt' | 'context' | 'snippet' | 'rule'>('all');
  const [librarySearch, setLibrarySearch] = useState('');

  const [quickLook, setQuickLook] = useState<{ source: 'recents' | 'saved'; id: string } | null>(null);

  // Downside Recents state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSelectOption = (opt: AddPanelOption | null) => {
    setActiveOption(opt);
    if (opt === 'files' || opt === 'changes') {
      onExpandedChange?.(true);
    } else {
      onExpandedChange?.(false);
    }
  };

  const toggleFolder = (path: string) => {
    setOpenFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const filteredLibraryItems = INITIAL_LIBRARY_ITEMS.filter((item) => {
    const matchesCategory = libraryFilter === 'all' || item.category === libraryFilter;
    const matchesSearch =
      !librarySearch ||
      item.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      item.description.toLowerCase().includes(librarySearch.toLowerCase()) ||
      item.content.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderFileTree = (nodes: FileNode[], parentPath = '') => {
    return nodes
      .filter((n) => !fileSearch || n.name.toLowerCase().includes(fileSearch.toLowerCase()))
      .map((node) => {
        const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
        if (node.type === 'folder') {
          const isOpen = !!openFolders[fullPath];
          return (
            <div key={fullPath} className="flex flex-col">
              <button
                onClick={() => toggleFolder(fullPath)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer hover:bg-[var(--bg-surface-hover)]"
                style={{ color: 'var(--text-main)' }}
              >
                {isOpen ? (
                  <ChevronDown size={14} className="shrink-0 text-zinc-400" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-zinc-400" />
                )}
                {isOpen ? (
                  <FolderOpen size={14} className="shrink-0 text-white fill-white" />
                ) : (
                  <Folder size={14} className="shrink-0 text-white fill-white" />
                )}
                <span className="font-medium truncate">{node.name}</span>
              </button>
              {isOpen && node.children && (
                <div className="pl-3.5 border-l ml-3 my-0.5" style={{ borderColor: 'var(--border-subtle)' }}>
                  {renderFileTree(node.children, fullPath)}
                </div>
              )}
            </div>
          );
        }

        const isSelected = selectedFilePath === fullPath;
        return (
          <button
            key={fullPath}
            onClick={() => { setSelectedFile(node.name); setSelectedFilePath(fullPath); setCodeSearch(''); }}
            className="flex items-center justify-between gap-1.5 px-2 py-1 text-xs rounded-md transition-colors text-left cursor-pointer ml-4"
            style={{
              backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
              color: isSelected ? 'var(--accent)' : 'var(--text-main)',
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <FileIcon filename={node.name} size={14} />
              <span className="truncate">{node.name}</span>
            </div>
            {node.size && (
              <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--text-muted)' }}>
                {node.size}
              </span>
            )}
          </button>
        );
      });
  };

  return (
    <div
      className="flex flex-col h-full w-full select-none"
      style={{
        backgroundColor: 'var(--bg-panel)',
        color: 'var(--text-main)',
      }}
    >
      {/* 2. BODY CONTENT */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* MAIN CANVAS VIEW: 4 BUTTONS IN CANVAS + DOWNSIDE (RECENTS & INTEGRATIONS) */}
        {!activeOption && (
          <div
            className="flex-1 overflow-y-auto px-4 pb-4 pt-4 space-y-6"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* 4 BUTTONS IN THE CANVAS: TERMINAL, FILES, CHANGES, LIBRARY (ALL WHITE ICONS) */}
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr))]">
              {/* BUTTON 1: TERMINAL */}
              <button
                onClick={() => handleSelectOption('terminal')}
                className="min-h-[66px] px-3 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 transition-colors cursor-pointer group text-left hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] active:bg-[var(--bg-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Terminal size={20} strokeWidth={1.8} className="text-[var(--text-main)] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium tracking-tight text-[var(--text-main)]">
                      Terminal
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Interactive shell
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-main)] opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 2: FILES */}
              <button
                onClick={() => handleSelectOption('files')}
                className="min-h-[66px] px-3 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 transition-colors cursor-pointer group text-left hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] active:bg-[var(--bg-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder size={20} strokeWidth={1.8} className="text-[var(--text-main)] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium tracking-tight text-[var(--text-main)]">
                      Files
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Project directory tree
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-main)] opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 3: CHANGES */}
              <button
                onClick={() => handleSelectOption('changes')}
                className="min-h-[66px] px-3 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 transition-colors cursor-pointer group text-left hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] active:bg-[var(--bg-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GitCompare size={20} strokeWidth={1.8} className="text-[var(--text-main)] shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium tracking-tight text-[var(--text-main)]">
                      Changes
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Git diff & status
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-main)] opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 4: LIBRARY (STUFF PEOPLE SEND TO AI) */}
              <button
                onClick={() => handleSelectOption('library')}
                className="min-h-[66px] px-3 py-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex items-center justify-between gap-3 transition-colors cursor-pointer group text-left hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)] active:bg-[var(--bg-active)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Bookmark size={20} strokeWidth={1.8} className="shrink-0" style={{ color: 'var(--text-main)' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium tracking-tight text-[var(--text-main)]">
                      Saved
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Reusable prompts, context & code
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-[var(--text-main)] opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>

            <section className="space-y-3 unfuse-artifact-previews" aria-label="Recent artifact previews">
              <style>{`
                .unfuse-artifact-previews .token { color: var(--text-main) !important; }
                .unfuse-artifact-previews .token.comment { color: var(--text-muted) !important; }
                .unfuse-artifact-previews .token.keyword,
                .unfuse-artifact-previews .token.property,
                .unfuse-artifact-previews .token.title { color: color-mix(in srgb, #58a6ff 65%, var(--text-main)) !important; }
                .unfuse-artifact-previews .token.string,
                .unfuse-artifact-previews .token.attr-value { color: color-mix(in srgb, #e89b63 65%, var(--text-main)) !important; }
                .unfuse-artifact-previews .token.number,
                .unfuse-artifact-previews .token.inserted { color: color-mix(in srgb, #56ad78 65%, var(--text-main)) !important; }
                .unfuse-artifact-previews .token.deleted { color: color-mix(in srgb, #e06c75 65%, var(--text-main)) !important; }
                .unfuse-artifact-previews .token.operator,
                .unfuse-artifact-previews .token.boolean { color: color-mix(in srgb, #ba8fe3 65%, var(--text-main)) !important; }
              `}</style>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">Recents</h3>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{INITIAL_ARTIFACTS.length} files</span>
              </div>
              <div>
                {INITIAL_ARTIFACTS.length === 0 && <p className="py-6 text-xs text-[var(--text-muted)]">No recent files.</p>}
                {INITIAL_ARTIFACTS.map((artifact) => (
                  <article key={artifact.id} tabIndex={0} aria-label={`Preview ${artifact.title}`} onClick={() => setQuickLook({ source: 'recents', id: artifact.id })} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setQuickLook({ source: 'recents', id: artifact.id }); } }} className="group min-w-0 px-3 py-4 cursor-pointer rounded-md hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-[var(--accent)]">
                    <div className="flex items-start gap-3">
                      <div className="pt-1 shrink-0"><FileIcon filename={artifact.title} size={19} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><span className="text-xs font-medium truncate flex-1" title={artifact.title}>{artifact.title}</span><span className="text-[10px] shrink-0 text-[var(--text-muted)]">{artifact.timestamp}</span><button onClick={event => { event.stopPropagation(); copyToClipboard(artifact.content, artifact.id); }} aria-label={`Copy ${artifact.title}`} title="Copy artifact content" className="p-1 shrink-0 rounded hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-[var(--accent)] text-[var(--text-muted)]">{copiedId === artifact.id ? <Check size={13} /> : <Copy size={13} />}</button></div>
                        <p className="text-[11px] leading-5 mt-1 text-[var(--text-muted)] line-clamp-1" title={artifact.description}>{artifact.description}</p>
                        <div className="relative max-h-[54px] overflow-hidden mt-2 select-text">
                          <pre aria-label={`${artifact.title} content preview`} className="text-[10px] leading-[18px] font-mono whitespace-pre-wrap break-all text-[var(--text-muted)]"><code dangerouslySetInnerHTML={{ __html: Prism.highlight(artifact.content.replace(/\\n/g, '\n'), getPrismLang(artifact.title).grammar, getPrismLang(artifact.title).lang) }} /></pre>
                        </div>
                        <p className="mt-2 text-[10px] text-[var(--text-muted)]">{artifact.type} · {artifact.size}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="space-y-3" aria-label="Latest integration previews">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold">Latest</h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {INITIAL_INTEGRATIONS.length === 0 && <p className="py-6 text-xs text-[var(--text-muted)]">No integration activity.</p>}
                {INITIAL_INTEGRATIONS.map((item) => (
                  <article key={item.id} className="py-4 flex gap-3 min-w-0 hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <div className="w-6 pt-1 flex items-center justify-center shrink-0" style={{ color: 'var(--text-main)' }}>
                      {item.service === 'linear' ? <LinearLogo size={18} /> : <NotionLogo size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span className="uppercase tracking-wider font-medium">{item.service === 'linear' ? 'Linear' : 'Notion'}</span>
                        <span className="shrink-0">{item.timestamp}</span>
                      </div>
                      <p className="text-xs font-medium leading-5 line-clamp-2" title={item.title}>{item.title}</p>
                      <p className="mt-1 text-[11px] leading-4 truncate" title={item.subtitle} style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ACTIVE OPTION 1: TERMINAL */}
        {activeOption === 'terminal' && (
          <TerminalPanel onBack={() => handleSelectOption(null)} onClose={onClose} />
        )}

        {/* ACTIVE OPTION 2: FILES (LEFT: CODE EDITOR CANVAS WITH SYNTAX HIGHLIGHTING, RIGHT: FILE TREE) */}
        {activeOption === 'files' && (
          <div
            className="flex-1 min-h-0 flex flex-row overflow-hidden"
            style={{ backgroundColor: 'var(--bg-app)' }}
          >
            {/* LEFT SIDE: CODE CANVAS */}
            <div
              className="flex-1 min-w-0 flex flex-col h-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-app)' }}
            >
              {selectedFile ? (
                (() => {
                  const code = getFileCode(selectedFile);
                  const { lang, grammar } = getPrismLang(selectedFile);
                  const highlightedFull = Prism.highlight(code, grammar, lang);
                  const lines = highlightedFull.split('\n');

                  return (
                    <div className="flex-1 min-h-0 flex flex-col unfuse-file-viewer">
                      <style>{`
                        .unfuse-file-viewer .token { color: var(--text-main); }
                        .unfuse-file-viewer .token.comment,
                        .unfuse-file-viewer .token.prolog { color: var(--text-muted); }
                        .unfuse-file-viewer .token.keyword,
                        .unfuse-file-viewer .token.tag,
                        .unfuse-file-viewer .token.boolean { color: var(--accent); }
                        .unfuse-file-viewer .token.string,
                        .unfuse-file-viewer .token.number { color: color-mix(in srgb, var(--accent) 65%, var(--text-main)); }
                      `}</style>
                      <div className="h-10 px-3 flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                        <FileIcon filename={selectedFile} />
                        <span title={selectedFilePath} className="flex-1 truncate text-xs" style={{ color: 'var(--text-main)' }}>{selectedFilePath}</span>
                        <button onClick={() => setWordWrap((wrap) => !wrap)} title="Toggle word wrap" aria-label="Word wrap" aria-pressed={wordWrap} className="p-1.5 rounded hover:bg-[var(--bg-surface-hover)]" style={{ color: wordWrap ? 'var(--accent)' : 'var(--text-muted)' }}><WrapText size={15} /></button>
                      </div>
                      <div className="px-3 py-2 flex items-center gap-2 border-b text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        <Search size={13} />
                        <input aria-label="Find in file" placeholder="Find in file…" value={codeSearch} onChange={(event) => setCodeSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none select-text" />
                        {codeSearch && <span className="shrink-0 text-[10px]">{code.split('\n').filter((line) => line.toLowerCase().includes(codeSearch.toLowerCase())).length} matching lines</span>}
                        {codeSearch && <button onClick={() => setCodeSearch('')} aria-label="Clear file search"><X size={13} /></button>}
                      </div>
                      <div className="flex-1 min-h-0 overflow-auto py-3 font-mono text-xs leading-6 select-text" style={{ scrollbarWidth: 'thin' }}>
                        {lines.map((highlightedLine, idx) => {
                          const matches = codeSearch.length > 0 && code.split('\n')[idx].toLowerCase().includes(codeSearch.toLowerCase());
                          return (
                            <div key={idx} className="flex min-w-full w-max" style={{ backgroundColor: matches ? 'var(--bg-active)' : undefined, ...(wordWrap ? { width: '100%' } : {}) }}>
                              <span className="sticky left-0 w-12 shrink-0 select-none text-right pr-3 tabular-nums text-[11px]" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)' }}>{idx + 1}</span>
                              <span className={`flex-1 pr-4 ${wordWrap ? 'whitespace-pre-wrap break-words min-w-0' : 'whitespace-pre'}`} style={{ color: 'var(--text-main)' }} dangerouslySetInnerHTML={{ __html: highlightedLine || '&nbsp;' }} />
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-3 py-1.5 border-t flex justify-between text-[10px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><span>{lang} · {lines.length} lines</span><span>{wordWrap ? 'Wrap on' : 'Wrap off'}</span></div>
                    </div>
                  );
                })()
              ) : (
                /* BLANK CANVAS ON LEFT WHEN NO FILE IS SELECTED */
                <div
                  className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center"
                  style={{ backgroundColor: 'var(--bg-app)' }}
                >
                  <FileCode size={40} className="mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <span className="font-semibold text-xs tracking-tight" style={{ color: 'var(--text-main)' }}>
                    No File Selected
                  </span>
                  <span className="text-[11px] mt-1 max-w-[240px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Select a file in the explorer on the right to view its source code.
                  </span>
                </div>
              )}
            </div>

            <div
              role="separator" aria-label="Resize file explorer" aria-orientation="vertical" tabIndex={0}
              aria-valuemin={160} aria-valuemax={360} aria-valuenow={explorerWidth}
              className="w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent)] focus:bg-[var(--accent)] outline-none"
              onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); }}
              onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) setExplorerWidth((width) => Math.min(360, Math.max(160, width - event.movementX))); }}
              onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
              onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setExplorerWidth((width) => Math.min(360, Math.max(160, width + (event.key === 'ArrowLeft' ? 10 : -10)))); } }}
            />
            {/* RIGHT SIDE: FILE EXPLORER SHIFTED TO RIGHT */}
            <div
              className="shrink-0 h-full flex flex-col overflow-hidden"
              style={{
                width: explorerWidth,
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* SEARCH & NAVIGATION CONTROLS */}
              <div
                className="p-2 shrink-0 flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  onClick={() => handleSelectOption(null)}
                  className="p-1 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}
                  title="Back to workspace"
                >
                  <ArrowLeft size={14} />
                </button>
                <div
                  className="flex-1 flex items-center gap-2 px-2.5 py-1.5 border rounded-lg text-xs"
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Search size={13} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files..."
                    className="bg-transparent border-none outline-none flex-1 text-xs placeholder:text-zinc-600"
                    style={{ color: 'var(--text-main)' }}
                  />
                </div>
                <button
                  onClick={onClose}
                  className="p-1 hover:text-white transition-colors cursor-pointer rounded hover:bg-white/5"
                  style={{ color: 'var(--text-muted)' }}
                  title="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* FILE TREE WITH OFFICIAL COLORED ICONS */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5" style={{ scrollbarWidth: 'thin' }}>
                {renderFileTree(INITIAL_WORKSPACE_FILES)}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE OPTION 3: CHANGES (GIT DIFF) */}
        {activeOption === 'changes' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <button onClick={() => handleSelectOption(null)}
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs">
                <ArrowLeft size={14} /> Back
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-6 text-center text-sm text-[var(--text-muted)]">No changes to review.</div>
          </div>
        )}

        {/* ACTIVE OPTION 4: LIBRARY (STUFF PEOPLE SEND TO AI) */}
        {activeOption === 'library' && (
          <div className="flex-1 flex flex-col min-h-0" style={{ color: 'var(--text-main)' }}>
            <header className="px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
              <button onClick={() => handleSelectOption(null)} title="Back to workspace" aria-label="Back to workspace" className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)]"><ArrowLeft size={15} /></button>
              <div className="flex-1"><h2 className="text-sm font-medium">Saved</h2><p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Reusable material for your next conversation</p></div>
              <button onClick={onClose} aria-label="Close Saved" className="p-1.5 rounded-md hover:bg-[var(--bg-surface-hover)]"><X size={15} /></button>
            </header>
            <div className="px-4 pt-4 pb-3 shrink-0 space-y-3">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)' }}>
                <Search size={15} />
                <input aria-label="Search saved material" value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search prompts, context, code…" className="min-w-0 flex-1 bg-transparent outline-none text-xs select-text" style={{ color: 'var(--text-main)' }} />
                {librarySearch && <button onClick={() => setLibrarySearch('')} aria-label="Clear search"><X size={13} /></button>}
              </div>
              <div className="flex flex-wrap gap-1">
                {(['all', 'prompt', 'context', 'snippet', 'rule'] as const).map((category) => (
                  <button key={category} onClick={() => setLibraryFilter(category)} aria-pressed={libraryFilter === category} className="px-2.5 py-1.5 rounded-md text-[11px] hover:bg-[var(--bg-surface-hover)]" style={{ backgroundColor: libraryFilter === category ? 'var(--bg-active)' : undefined, color: libraryFilter === category ? 'var(--text-main)' : 'var(--text-muted)' }}>
                    {{ all: 'All', prompt: 'Prompts', context: 'Context', snippet: 'Code', rule: 'Rules' }[category]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
              {filteredLibraryItems.length === 0 && (
                <div className="py-12 text-center"><Search size={22} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} /><p className="text-sm">Nothing saved yet</p></div>
              )}
              {filteredLibraryItems.map((item) => {
                const Icon = { prompt: MessageSquare, context: FileText, snippet: Code2, rule: ShieldCheck }[item.category];
                const iconColor = { prompt: '#a78bfa', context: '#38bdf8', snippet: '#fb923c', rule: '#34d399' }[item.category];
                const logo = item.logo === 'tauri' ? siTauri : item.logo === 'tailwind' ? siTailwindcss : null;
                return (
                  <button key={item.id} onClick={() => setQuickLook({ source: 'saved', id: item.id })} onKeyDown={event => { if (event.key === ' ') { event.preventDefault(); setQuickLook({ source: 'saved', id: item.id }); } }} className="w-full text-left flex items-start gap-3 px-3 py-3.5 rounded-md border-b border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] focus-visible:outline focus-visible:outline-[var(--accent)]">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center" style={{ color: iconColor }}>
                      {logo ? <svg width="24" height="24" viewBox="0 0 24 24" fill={`#${logo.hex}`} role="img" aria-label={logo.title}><path d={logo.path} /></svg>
                        : item.logo === 'integrations' ? <div className="flex items-center -space-x-1"><span className="text-[#8b83ff]"><LinearLogo size={20} /></span><span className="text-[var(--text-main)]"><NotionLogo size={16} /></span></div>
                        : <Icon size={23} strokeWidth={1.8} />}
                    </div>
                    <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{item.title}</p><p className="text-[11px] leading-5 mt-0.5 text-[var(--text-muted)]">{item.description}</p><p className="text-[10px] capitalize mt-1 text-[var(--text-muted)]">{item.category}</p></div>
                    <ChevronRight size={14} className="mt-2 shrink-0 text-[var(--text-muted)]" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      {quickLook && <QuickLookPreview selectedId={quickLook.id} onSelect={id => setQuickLook({ ...quickLook, id })} onClose={() => setQuickLook(null)} items={quickLook.source === 'recents'
        ? INITIAL_ARTIFACTS.map(item => ({ id: item.id, name: item.title, detail: `${item.type} · ${item.size}`, text: item.content.replace(/\\n/g, '\n') }))
        : filteredLibraryItems.map(item => ({ id: item.id, name: item.title, detail: `${item.category} · ${item.description}`, text: item.content, language: item.language }))} />}
      </div>
    </div>
  );
};
