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
import { ChangesPanel } from './ChangesPanel';
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

const INITIAL_WORKSPACE_FILES: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'components',
        type: 'folder',
        children: [
          { name: 'chat', type: 'folder', children: [{ name: 'ChatPanel.tsx', type: 'file', size: '24 KB' }, { name: 'DiffViewer.tsx', type: 'file', size: '13 KB' }] },
          { name: 'dashboard', type: 'folder', children: [{ name: 'DashboardView.tsx', type: 'file', size: '39 KB' }] },
          { name: 'rack', type: 'folder', children: [{ name: 'RackPanel.tsx', type: 'file', size: '6.5 KB' }, { name: 'types.ts', type: 'file', size: '1.3 KB' }] },
          { name: 'workspace', type: 'folder', children: [{ name: 'AddPanel.tsx', type: 'file', size: '18 KB' }] },
          { name: 'theme', type: 'folder', children: [{ name: 'ThemeSelector.tsx', type: 'file', size: '4.2 KB' }] },
          { name: 'settings', type: 'folder', children: [{ name: 'SettingsView.tsx', type: 'file', size: '8.1 KB' }] },
        ],
      },
      { name: 'App.tsx', type: 'file', size: '9.2 KB' },
      { name: 'index.css', type: 'file', size: '3.4 KB' },
      { name: 'main.tsx', type: 'file', size: '1.1 KB' },
    ],
  },
  {
    name: 'src-tauri',
    type: 'folder',
    children: [
      { name: 'src', type: 'folder', children: [{ name: 'main.rs', type: 'file', size: '18 KB' }, { name: 'agent.rs', type: 'file', size: '32 KB' }] },
      { name: 'Cargo.toml', type: 'file', size: '2.4 KB' },
      { name: 'tauri.conf.json', type: 'file', size: '3.1 KB' },
    ],
  },
  {
    name: 'scripts',
    type: 'folder',
    children: [
      { name: 'benchmarks.py', type: 'file', size: '4.5 KB' },
      { name: 'deploy.sh', type: 'file', size: '1.2 KB' },
    ],
  },
  { name: 'index.html', type: 'file', size: '0.8 KB' },
  { name: 'package.json', type: 'file', size: '1.8 KB' },
  { name: 'tsconfig.json', type: 'file', size: '0.9 KB' },
  { name: 'vite.config.ts', type: 'file', size: '1.2 KB' },
  { name: 'tailwind.config.js', type: 'file', size: '1.4 KB' },
  { name: 'README.md', type: 'file', size: '5.6 KB' },
  { name: '.gitignore', type: 'file', size: '0.4 KB' },
  { name: 'Dockerfile', type: 'file', size: '1.1 KB' },
];

const SAMPLE_FILES_CODE: Record<string, string> = {
  'App.tsx': `import React, { useState } from 'react';
import { Plus, Server, MoreHorizontal } from 'lucide-react';
import { DashboardView } from './components/dashboard/DashboardView';
import { AddPanel } from './components/workspace/AddPanel';
import { RackPanel } from './components/rack/RackPanel';

export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeRightPanel, setActiveRightPanel] = useState<'none' | 'rack' | 'add'>('none');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden font-sans bg-[#09090b] text-white">
      <header className="h-[40px] border-b border-zinc-800 flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setActiveRightPanel(p => p === 'add' ? 'none' : 'add')}>
            <Plus size={16} />
          </button>
          <button onClick={() => setActiveRightPanel(p => p === 'rack' ? 'none' : 'rack')}>
            <Server size={16} />
          </button>
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <DashboardView />
        {activeRightPanel === 'add' && <AddPanel onClose={() => setActiveRightPanel('none')} />}
        {activeRightPanel === 'rack' && <RackPanel />}
      </main>
    </div>
  );
}`,
  'ChatPanel.tsx': `import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Hello! I am Unfuse agent. How can I assist with your workspace?' }
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: input.trim() }]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, idx) => (
          <div key={idx} className={\`p-3 rounded-xl \${m.role === 'user' ? 'bg-indigo-600/20 ml-auto' : 'bg-zinc-900 mr-auto'}\`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-zinc-900 px-3 py-2 rounded-lg text-sm outline-none" />
        <button onClick={handleSend} className="px-3 py-2 bg-indigo-600 rounded-lg text-sm font-semibold">Send</button>
      </div>
    </div>
  );
};`,
  'DiffViewer.tsx': `import React from 'react';
import Prism from 'prismjs';
import { diffLines } from 'diff';

interface DiffViewerProps {
  filename: string;
  originalCode: string;
  modifiedCode: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ filename, originalCode, modifiedCode }) => {
  const changes = diffLines(originalCode, modifiedCode);
  return (
    <div className="font-mono text-xs select-text overflow-x-auto bg-[#1e1e1e] p-3 rounded-lg">
      <div className="text-zinc-400 pb-2 border-b border-zinc-800 font-semibold">{filename}</div>
      {changes.map((part, i) => (
        <div key={i} className={\`\${part.added ? 'bg-emerald-500/20 text-emerald-300' : part.removed ? 'bg-rose-500/20 text-rose-300' : 'text-zinc-300'}\`}>
          {part.value}
        </div>
      ))}
    </div>
  );
};`,
  'DashboardView.tsx': `import React, { useState } from 'react';
import { Activity, CheckCircle2, XCircle } from 'lucide-react';

export const DashboardView: React.FC = () => {
  const stats = { passed: 42, failed: 2, stopped: 1 };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto bg-[#09090b]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Live Monitor</h1>
        <div className="flex gap-1.5">
          <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md">Passed: {stats.passed}</span>
          <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400 rounded-md">Failed: {stats.failed}</span>
        </div>
      </div>
    </div>
  );
};`,
  'RackPanel.tsx': `import React from 'react';
import { Server } from 'lucide-react';

export const RackPanel: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#111113] p-4 text-white">
      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider pb-3 border-b border-zinc-800">
        <Server size={16} />
        <span>Model Rack (Blades)</span>
      </div>
    </div>
  );
};`,
  'AddPanel.tsx': `// AddPanel: Workspace Tools and Navigation Panel
export const AddPanel: React.FC = () => {
  return <div className="h-full w-full select-none" />;
};`,
  'ThemeSelector.tsx': `import React from 'react';

export const ThemeSelector: React.FC = () => {
  return <div className="text-xs text-zinc-400 font-medium">Dark Minimal</div>;
};`,
  'SettingsView.tsx': `import React from 'react';

export const SettingsView: React.FC = () => {
  return <div className="p-6 text-white font-bold">Workspace Settings</div>;
};`,
  'types.ts': `export type ServiceId = 'notion' | 'linear' | 'github' | 'slack';

export interface LocalModelBlade {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'stopped';
  vramUsageBytes: number;
}`,
  'index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-app: #09090b;
  --bg-panel: #111113;
  --bg-surface: #18181b;
  --bg-surface-hover: #222226;
  --border-subtle: #27272a;
  --accent: #6366f1;
}`,
  'main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  'main.rs': `use tauri::Manager;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}`,
  'agent.rs': `use std::sync::Arc;
use tokio::sync::Mutex;

pub struct AgentSession {
    pub is_running: bool,
    pub step_count: u64,
}

impl AgentSession {
    pub async fn run_step(&mut self) -> Result<(), String> {
        self.step_count += 1;
        Ok(())
    }
}`,
  'Cargo.toml': `[package]
name = "unfuse-desktop"
version = "1.0.0"
edition = "2021"

[dependencies]
tauri = { version = "2.0.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }`,
  'tauri.conf.json': `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Unfuse",
  "version": "1.0.0",
  "identifier": "com.unfuse.desktop",
  "build": {
    "frontendDist": "../dist"
  }
}`,
  'package.json': `{
  "name": "@unfuse/desktop",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  }
}`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  }
}`,
  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  }
});`,
  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        panel: 'var(--bg-panel)',
      }
    },
  },
  plugins: [],
};`,
  'README.md': `# Unfuse Desktop
Agentic AI Desktop Environment for Software Engineering.

## Architecture
- **Frontend**: React 18, Vite, Tailwind CSS, PrismJS syntax engine
- **Backend**: Rust Tauri v2 Core, Local Blade Process Management
- **Integrations**: Linear & Notion sync with MCP protocols`,
  '.gitignore': `target/
node_modules/
dist/
.DS_Store
*.env*
Cargo.lock`,
  'Dockerfile': `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`,
  'benchmarks.py': `import time
import requests

def benchmark_latency(url: str, iterations: int = 50):
    latencies = []
    for _ in range(iterations):
        start = time.perf_counter()
        resp = requests.get(url)
        latencies.append((time.perf_counter() - start) * 1000)
    print(f"Avg latency: {sum(latencies)/len(latencies):.2f}ms")

if __name__ == "__main__":
    benchmark_latency("http://localhost:1420")`,
  'deploy.sh': `#!/usr/bin/env bash
set -euo pipefail

echo "==> Building Unfuse Desktop for production..."
npm run build
cargo build --manifest-path src-tauri/Cargo.toml --release
echo "==> Build complete!"`,
};

const getFileCode = (filename: string): string => {
  if (SAMPLE_FILES_CODE[filename]) return SAMPLE_FILES_CODE[filename];
  return `// ${filename}\n// File loaded in Unfuse Workspace\nexport default function () {\n  return null;\n}`;
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

const SAMPLE_DIFF_ORIGINAL = `export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen">
      <header className="h-[40px] border-b">
        <ThemeSelector />
      </header>
      <aside className="w-72 h-full border-l" />
    </div>
  );
}`;

const SAMPLE_DIFF_MODIFIED = `export default function App() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [activeRightPanel, setActiveRightPanel] = useState<'none' | 'rack' | 'add'>('none');

  return (
    <div className="flex flex-col h-screen">
      <header className="h-[40px] border-b">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setActiveRightPanel(p => p === 'add' ? 'none' : 'add')}>
            <Plus size={16} />
          </button>
          <button onClick={() => setActiveRightPanel(p => p === 'rack' ? 'none' : 'rack')}>
            <Server size={16} />
          </button>
        </div>
      </header>
      {activeRightPanel === 'add' && <AddPanel />}
      {activeRightPanel === 'rack' && <RackPanel />}
    </div>
  );
}`;

// RECENTS (RECENTLY MADE ARTIFACTS CREATED BY AGENT/WORKSPACE)
const INITIAL_ARTIFACTS: ArtifactItem[] = [
  {
    id: 'art-1',
    title: 'architecture-spec.md',
    type: 'markdown',
    size: '14.2 KB',
    timestamp: '12m ago',
    description: 'Workspace layout, 4-button canvas tool architecture, and Tauri v2 event streaming specification',
    content: `# Workspace Architecture Spec\n- 4 buttons in canvas: Terminal, Files, Changes, Library\n- Downside: Recents & Notion/Linear sync\n- Real-time event monitor via Tauri v2 channels`,
  },
  {
    id: 'art-2',
    title: 'live-monitor-schema.json',
    type: 'json',
    size: '3.4 KB',
    timestamp: '38m ago',
    description: 'Live monitor event schema with passed, failed, and stopped state payloads',
    content: `{\n  "$schema": "https://json-schema.org/draft/2020-12/schema",\n  "title": "LiveMonitorEvent",\n  "type": "object",\n  "properties": {\n    "id": { "type": "string" },\n    "status": { "enum": ["passed", "failed", "stopped"] }\n  }\n}`,
  },
  {
    id: 'art-3',
    title: 'tauri-ipc-patch.diff',
    type: 'diff',
    size: '8.1 KB',
    timestamp: '1h ago',
    description: 'Unified diff patch for backend agent streaming and command execution',
    content: `diff --git a/src-tauri/src/agent.rs b/src-tauri/src/agent.rs\n--- a/src-tauri/src/agent.rs\n+++ b/src-tauri/src/agent.rs\n@@ -112,6 +112,12 @@ pub async fn stream_execution() {\n+    emit_ipc_event("agent_progress", &status).await;\n }`,
  },
  {
    id: 'art-4',
    title: 'system-topology.mermaid',
    type: 'diagram',
    size: '2.6 KB',
    timestamp: '3h ago',
    description: 'Mermaid flowchart of Tauri IPC, React frontend, and local LLM blade runners',
    content: `flowchart TD\n  UI[React Frontend] --> IPC[Tauri v2 IPC]\n  IPC --> Engine[Rust Core Engine]\n  Engine --> Blade[Local Model Blades]`,
  },
];

// PUSHED TO INTEGRATIONS (NOTION, LINEAR - KEEP ORIGINAL LOGOS)
const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'int-1',
    service: 'linear',
    title: 'UNF-104: Fix live message monitor scrollbar & layout stability',
    subtitle: 'Assigned to @lichi • Linear Issues',
    timestamp: '18m ago',
    url: 'https://linear.app/unfuse/issue/UNF-104',
  },
  {
    id: 'int-2',
    service: 'notion',
    title: 'Unfuse Architecture Spec & UI System v2',
    subtitle: 'Synced to Engineering Wiki • Workspace Docs',
    timestamp: '35m ago',
    url: 'https://notion.so/unfuse/Architecture-Spec-v2',
  },
  {
    id: 'int-3',
    service: 'linear',
    title: 'UNF-98: Wire Tauri v2 streaming IPC events with blade runners',
    subtitle: 'Assigned to @lichi • Linear Issues',
    timestamp: '1h ago',
    url: 'https://linear.app/unfuse/issue/UNF-98',
  },
  {
    id: 'int-4',
    service: 'notion',
    title: 'Sprint 4 Release Notes & Agent Performance Benchmarks',
    subtitle: 'Synced to Changelog & Benchmarks',
    timestamp: '3h ago',
    url: 'https://notion.so/unfuse/Sprint-4-Release-Notes',
  },
];

// LIBRARY ITEMS (THE STUFF PEOPLE SEND TO AI: PROMPTS, CONTEXT, TEMPLATES, REFERENCES)
const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Strict Minimal Diff & Zero Warnings Directive',
    category: 'rule',
    description: 'System instructions enforcing zero warnings on Rust/TypeScript and surgical diffs without cosmetic noise.',
    content: `You are an expert AI engineer. Follow these rules strictly:
1. Do exactly what the user asks. Do not invent unrequested changes.
2. Maintain zero warnings: cargo clippy -- -D warnings and npm run build must be 100% clean.
3. Make minimal, surgical diffs. Preserve all existing styles and comments.`,
    usageCount: 42,
  },
  {
    id: 'lib-2',
    title: 'Tauri v2 IPC Handler Boilerplate',
    category: 'snippet',
    description: 'Reusable Rust command pattern with State injection, Mutex handling, and typed serializable responses.',
    content: `#[tauri::command]
pub async fn execute_agent_step(
    state: State<'_, AppState>,
    payload: StepPayload,
) -> Result<StepResponse, String> {
    let mut session = state.session.lock().map_err(|e| e.to_string())?;
    session.run_step(payload).await
}`,
    usageCount: 28,
  },
  {
    id: 'lib-3',
    title: 'Security & Edge Case Code Review Prompt',
    category: 'prompt',
    description: 'Prompt template for adversarial code audits, race conditions, memory leaks, and input sanitization.',
    content: `Perform an exhaustive adversarial code review of the supplied diff:
1. Check for memory leaks, unclosed listeners, or unbounded state growth.
2. Verify input validation, boundary values, and authentication bypasses.
3. Confirm error handling fails safely without crashing the host process.`,
    usageCount: 19,
  },
  {
    id: 'lib-4',
    title: 'Tailwind Design Tokens & Glassmorphism Theme',
    category: 'context',
    description: 'Reference styles for CSS variables, surface borders, background tints, and active accents.',
    content: `:root {
  --bg-app: #09090b;
  --bg-panel: #111113;
  --bg-surface: #18181b;
  --bg-surface-hover: #222226;
  --border-subtle: #27272a;
  --accent: #6366f1;
}`,
    usageCount: 35,
  },
  {
    id: 'lib-5',
    title: 'Linear & Notion Integration Payload Spec',
    category: 'context',
    description: 'Data models for exporting agent research summaries and creating Linear issues directly from chat.',
    content: `{
  "integration": "linear",
  "action": "create_issue",
  "teamId": "ENG",
  "priority": 1,
  "title": "[Agent] Implement streaming response buffer"
}`,
    usageCount: 12,
  },
];

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
  const [sentNotice, setSentNotice] = useState<string | null>(null);

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
            <div className="grid grid-cols-2 gap-3">
              {/* BUTTON 1: TERMINAL */}
              <button
                onClick={() => handleSelectOption('terminal')}
                className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group text-left shadow-sm hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Terminal size={22} className="text-white shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-tight text-white">
                      Terminal
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Interactive shell
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-white opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 2: FILES */}
              <button
                onClick={() => handleSelectOption('files')}
                className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group text-left shadow-sm hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder size={22} className="text-white fill-white shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-tight text-white">
                      Files
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Project directory tree
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-white opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 3: CHANGES */}
              <button
                onClick={() => handleSelectOption('changes')}
                className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group text-left shadow-sm hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GitCompare size={22} className="text-white shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-tight text-white">
                      Changes
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Git diff & status
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-white opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>

              {/* BUTTON 4: LIBRARY (STUFF PEOPLE SEND TO AI) */}
              <button
                onClick={() => handleSelectOption('library')}
                className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 transition-all cursor-pointer group text-left shadow-sm hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Bookmark size={22} className="shrink-0" style={{ color: 'var(--text-main)' }} />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold tracking-tight text-white">
                      Saved
                    </span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                      Reusable prompts, context & code
                    </span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-white opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>

            {/* DOWNSIDE SECTION 1: RECENTS (BORDERLESS - JUST LOGO AND INFORMATION) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-white tracking-tight">Recents</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {INITIAL_ARTIFACTS.length} files
                </span>
              </div>

              <div className="space-y-0.5">
                {INITIAL_ARTIFACTS.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="py-2 px-1.5 rounded-lg flex items-start justify-between gap-3 group transition-colors hover:bg-[var(--bg-surface-hover)]"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        <FileIcon filename={artifact.title} size={16} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs truncate text-white">
                            {artifact.title}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {artifact.size}
                          </span>
                        </div>
                        <span className="text-[11px] truncate leading-normal" style={{ color: 'var(--text-muted)' }}>
                          {artifact.description}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {artifact.timestamp}
                      </span>
                      <button
                        onClick={() => copyToClipboard(artifact.content, artifact.id)}
                        className="p-1 rounded hover:bg-[var(--bg-active)] cursor-pointer text-zinc-400 hover:text-white transition-colors"
                        title="Copy artifact content"
                      >
                        {copiedId === artifact.id ? <Check size={12} className="text-white" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DOWNSIDE SECTION 2: LATEST (BORDERLESS - JUST LOGO AND INFORMATION) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-white tracking-tight">Latest</span>
              </div>

              <div className="space-y-0.5">
                {INITIAL_INTEGRATIONS.map((item) => (
                  <div
                    key={item.id}
                    className="py-2 px-1.5 rounded-lg flex items-start justify-between gap-3 group transition-colors hover:bg-[var(--bg-surface-hover)]"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {item.service === 'linear' ? (
                          <LinearLogo size={16} />
                        ) : (
                          <NotionLogo size={16} style={{ color: '#ffffff' }} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate text-white">
                          {item.title}
                        </span>
                        <span className="text-[11px] truncate leading-normal" style={{ color: 'var(--text-muted)' }}>
                          {item.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                      <div className="h-10 px-3 border-b flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
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
              className="shrink-0 h-full flex flex-col border-l overflow-hidden"
              style={{
                width: explorerWidth,
                backgroundColor: 'var(--bg-panel)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              {/* SEARCH & NAVIGATION CONTROLS */}
              <div
                className="p-2 border-b shrink-0 flex items-center gap-1.5"
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
            <ChangesPanel filename="src/App.tsx"
              originalCode={SAMPLE_DIFF_ORIGINAL} modifiedCode={SAMPLE_DIFF_MODIFIED} />
          </div>
        )}

        {/* ACTIVE OPTION 4: LIBRARY (STUFF PEOPLE SEND TO AI) */}
        {activeOption === 'library' && (
          <div className="flex-1 flex flex-col min-h-0" style={{ color: 'var(--text-main)' }}>
            <header className="px-4 py-3 flex items-center gap-3 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
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
              {sentNotice && <p role="status" className="text-xs" style={{ color: 'var(--text-muted)' }}>{sentNotice}</p>}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'thin' }}>
              {filteredLibraryItems.length === 0 && (
                <div className="py-12 text-center"><Search size={22} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} /><p className="text-sm">No matching items</p><p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Try another search or category.</p></div>
              )}
              {filteredLibraryItems.map((item) => {
                const Icon = { prompt: MessageSquare, context: FileText, snippet: Code2, rule: ShieldCheck }[item.category];
                return (
                  <details key={item.id} className="group border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <summary className="list-none cursor-pointer flex items-start gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
                      <div className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}><Icon size={16} /></div>
                      <div className="min-w-0 flex-1"><p className="text-xs font-medium truncate">{item.title}</p><p className="text-[11px] leading-5 mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.description}</p></div>
                      <ChevronRight size={14} className="mt-2 shrink-0 group-open:rotate-90 transition-transform" style={{ color: 'var(--text-muted)' }} />
                    </summary>
                    <div className="pb-4 pl-11">
                      <pre className="text-[11px] leading-5 p-3 rounded-lg border whitespace-pre-wrap break-words select-text max-h-64 overflow-auto" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>{item.content}</pre>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{item.category}</span>
                        <button onClick={async () => {
                          try { await navigator.clipboard.writeText(item.content); setCopiedId(item.id); setSentNotice('Copied. Paste into your message to use it.'); }
                          catch { setSentNotice('Could not copy. Select the text above to copy manually.'); }
                        }} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:bg-[var(--bg-surface-hover)]" style={{ color: 'var(--text-main)' }}>
                          {copiedId === item.id ? <Check size={13} /> : <Copy size={13} />} {copiedId === item.id ? 'Copied' : 'Copy content'}
                        </button>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
