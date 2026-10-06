import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Upload,
  Image as ImageIcon,
  FileText,
  FileCode,
  Table as TableIcon,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Download,
  Eye,
  X,
  Calendar,
  Layers,
  HardDrive,
  Copy,
  Check,
  ArrowUpDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export type AttachmentCategory = 'all' | 'image' | 'document' | 'code' | 'data';

export interface AttachmentItem {
  id: string;
  name: string;
  category: 'image' | 'document' | 'code' | 'data';
  mimeType: string;
  sizeBytes: number;
  sizeFormatted: string;
  uploadedAt: string;
  thumbnailUrl?: string;
  dimensions?: string;
  pageCount?: number;
  sessionTitle: string;
  modelName: string;
  previewText?: string;
  fileUrl?: string;
}

// Built-in sample attachments typical of user queries to ChatGPT and Codex
const SAMPLE_LIBRARY_ATTACHMENTS: AttachmentItem[] = [
  {
    id: 'att-1',
    name: 'system-architecture-diagram.png',
    category: 'image',
    mimeType: 'image/png',
    sizeBytes: 2450000,
    sizeFormatted: '2.4 MB',
    uploadedAt: 'Today, 2:40 PM',
    dimensions: '1920 × 1080',
    sessionTitle: 'Local Inference Architecture',
    modelName: 'Claude 3.5 Sonnet',
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%230f141c"/><rect x="40" y="40" width="140" height="80" rx="8" fill="%231e293b" stroke="%2338bdf8" stroke-width="2"/><text x="110" y="85" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Tauri Core (Rust)</text><rect x="40" y="180" width="140" height="80" rx="8" fill="%231e293b" stroke="%23a855f7" stroke-width="2"/><text x="110" y="225" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">React 18 Engine</text><rect x="360" y="110" width="180" height="100" rx="8" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><text x="450" y="155" fill="%23ffffff" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">Local Model Blade</text><text x="450" y="175" fill="%2394a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Ollama / vLLM / MLX</text><line x1="180" y1="80" x2="360" y2="140" stroke="%2338bdf8" stroke-width="2" stroke-dasharray="4"/><line x1="180" y1="220" x2="360" y2="180" stroke="%23a855f7" stroke-width="2"/><text x="300" y="30" fill="%23e2e8f0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">System Architecture Topology</text></svg>',
  },
  {
    id: 'att-2',
    name: 'oauth2-auth-flow.png',
    category: 'image',
    mimeType: 'image/png',
    sizeBytes: 1680000,
    sizeFormatted: '1.6 MB',
    uploadedAt: 'Today, 11:15 AM',
    dimensions: '1440 × 900',
    sessionTitle: 'Linear & Notion MCP Sync',
    modelName: 'Qwen 2.5 Coder',
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%230f141c"/><rect x="50" y="60" width="120" height="60" rx="6" fill="%231e293b" stroke="%23f59e0b" stroke-width="2"/><text x="110" y="95" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Client App</text><rect x="430" y="60" width="120" height="60" rx="6" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><text x="490" y="95" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Auth Provider</text><rect x="240" y="190" width="120" height="60" rx="6" fill="%231e293b" stroke="%23ec4899" stroke-width="2"/><text x="300" y="225" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">MCP Proxy</text><path d="M170 85 H420" stroke="%2394a3b8" stroke-width="1.5"/><path d="M480 120 L360 190" stroke="%2394a3b8" stroke-width="1.5"/><text x="300" y="30" fill="%23e2e8f0" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">OAuth 2.0 PKCE Callback Sequence</text></svg>',
  },
  {
    id: 'att-3',
    name: 'gpu-vram-allocation-chart.png',
    category: 'image',
    mimeType: 'image/png',
    sizeBytes: 1200000,
    sizeFormatted: '1.2 MB',
    uploadedAt: 'Yesterday, 6:20 PM',
    dimensions: '1600 × 900',
    sessionTitle: 'Unified Memory Benchmarks',
    modelName: 'DeepSeek-Coder-V2',
    thumbnailUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%230f141c"/><rect x="80" y="180" width="60" height="100" rx="4" fill="%2338bdf8"/><text x="110" y="170" fill="%2338bdf8" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">14.2 GB</text><rect x="180" y="120" width="60" height="160" rx="4" fill="%2310b981"/><text x="210" y="110" fill="%2310b981" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">24.8 GB</text><rect x="280" y="80" width="60" height="200" rx="4" fill="%23a855f7"/><text x="310" y="70" fill="%23a855f7" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">38.4 GB</text><rect x="380" y="50" width="60" height="230" rx="4" fill="%23f43f5e"/><text x="410" y="40" fill="%23f43f5e" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">48.2 GB</text><line x1="50" y1="280" x2="520" y2="280" stroke="%23334155" stroke-width="2"/><text x="110" y="305" fill="%2394a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Llama-8B</text><text x="210" y="305" fill="%2394a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Qwen-14B</text><text x="310" y="305" fill="%2394a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">DeepSeek-33B</text><text x="410" y="305" fill="%2394a3b8" font-family="sans-serif" font-size="11" text-anchor="middle">Llama-70B</text></svg>',
  },
  {
    id: 'att-4',
    name: 'ADR-004-Local-Inference-Engine.pdf',
    category: 'document',
    mimeType: 'application/pdf',
    sizeBytes: 1850000,
    sizeFormatted: '1.8 MB',
    uploadedAt: 'Yesterday, 3:10 PM',
    pageCount: 14,
    sessionTitle: 'Architecture Decision Records',
    modelName: 'Claude 3.5 Sonnet',
    previewText:
      '# ADR 004: Direct IPC & Wire Protocol Selection for Local Inference Runners\n\nStatus: Accepted\nContext: We evaluated Unix Domain Sockets, Local TCP Loopback (ports 11434, 1234, 8000), and Named Pipes across macOS and Linux.\nDecision: Enforce typed HTTP wire communication for maximum runner compatibility without guessing port loops.\n\n' + 
      '--- MULTI-PAGE SIMULATION BEGINS ---\n\n' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100) + '\n\n' +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(100) + '\n\n' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '.repeat(100) + '\n\n' +
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. '.repeat(100) + '\n\n' +
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. '.repeat(100) + '\n\n' +
      '--- END OF DOCUMENT ---',
  },
  {
    id: 'att-5',
    name: 'MCP-Protocol-Specification-2026.pdf',
    category: 'document',
    mimeType: 'application/pdf',
    sizeBytes: 3400000,
    sizeFormatted: '3.4 MB',
    uploadedAt: 'Oct 3, 2026',
    pageCount: 32,
    sessionTitle: 'MCP Tool Integration',
    modelName: 'Llama 3.3 70B',
    previewText:
      'Model Context Protocol (MCP) Specification v2.0\nAbstract: An open standard for connecting AI models to data sources and tools with structured JSON-RPC 2.0 payloads.',
  },
  {
    id: 'att-6',
    name: 'product-requirements-PRD.docx',
    category: 'document',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 680000,
    sizeFormatted: '680 KB',
    uploadedAt: 'Oct 2, 2026',
    pageCount: 8,
    sessionTitle: 'Desktop Workspace Scope',
    modelName: 'Claude 3.5 Sonnet',
    previewText:
      'Product Requirements Document: Unfuse Desktop Engineering Workspace\nCore Pillars:\n1. Zero-latency local inference\n2. Real file system pairing\n3. High-density telemetry dashboard\n4. Unified attachments library',
  },
  {
    id: 'att-7',
    name: 'token-latency-benchmarks.csv',
    category: 'data',
    mimeType: 'text/csv',
    sizeBytes: 420000,
    sizeFormatted: '420 KB',
    uploadedAt: 'Oct 1, 2026',
    sessionTitle: 'Runner Performance Profiling',
    modelName: 'Qwen 2.5 Coder',
    previewText:
      'model,runner,quantization,context_len,prompt_tok_s,eval_tok_s,vram_gb\nqwen2.5-coder-7b,ollama,q4_k_m,8192,142.4,54.2,5.2\nllama-3.3-70b,mlx,4bit,16384,89.1,28.4,38.1\ndeepseek-coder-v2,vllm,awq,32768,112.0,36.5,24.2\nhermes-3-8b,llamacpp,q8_0,8192,130.5,49.8,8.6',
  },
  {
    id: 'att-8',
    name: 'mcp-tools-schema-export.json',
    category: 'code',
    mimeType: 'application/json',
    sizeBytes: 185000,
    sizeFormatted: '185 KB',
    uploadedAt: 'Sep 29, 2026',
    sessionTitle: 'Tool Call Schema Verification',
    modelName: 'Llama 3.3 70B',
    previewText:
      '{\n  "version": "2.0.0",\n  "tools": [\n    {\n      "name": "read_url_content",\n      "description": "Fetch content from a URL via HTTP request",\n      "parameters": { "type": "object", "required": ["Url"] }\n    },\n    {\n      "name": "run_command",\n      "description": "Execute local commands within workspace",\n      "parameters": { "type": "object", "required": ["CommandLine"] }\n    }\n  ]\n}',
  },
  {
    id: 'att-9',
    name: 'cluster-nodes-manifest.yaml',
    category: 'code',
    mimeType: 'text/yaml',
    sizeBytes: 48000,
    sizeFormatted: '48 KB',
    uploadedAt: 'Sep 28, 2026',
    sessionTitle: 'Distributed vLLM Setup',
    modelName: 'DeepSeek-Coder-V2',
    previewText:
      'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: vllm-cluster-worker\nspec:\n  replicas: 2\n  template:\n    spec:\n      containers:\n        - name: runner\n          image: vllm/vllm-openai:latest\n          resources:\n            limits:\n              nvidia.com/gpu: "2"',
  },
];

const STORAGE_KEY = 'unfuse_user_attachments_library_v2';

export const LibraryView: React.FC = () => {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return SAMPLE_LIBRARY_ATTACHMENTS;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [previewItem, setPreviewItem] = useState<AttachmentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attachments));
    } catch {
      // ignore
    }
  }, [attachments]);

  // Category counts
  const counts = useMemo(() => {
    return {
      all: attachments.length,
      image: attachments.filter((a) => a.category === 'image').length,
      document: attachments.filter((a) => a.category === 'document').length,
      code: attachments.filter((a) => a.category === 'code').length,
      data: attachments.filter((a) => a.category === 'data').length,
    };
  }, [attachments]);

  // Total storage calculated dynamically
  const totalSizeBytes = useMemo(() => {
    return attachments.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  }, [attachments]);

  const totalSizeFormatted = useMemo(() => {
    if (totalSizeBytes > 1_000_000) {
      return `${(totalSizeBytes / 1_000_000).toFixed(1)} MB`;
    }
    return `${(totalSizeBytes / 1_000).toFixed(0)} KB`;
  }, [totalSizeBytes]);

  // Filtering and sorting
  const filteredAttachments = useMemo(() => {
    let result = attachments;

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((a) => a.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.sessionTitle.toLowerCase().includes(q) ||
          a.modelName.toLowerCase().includes(q) ||
          a.mimeType.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        comparison = a.sizeBytes - b.sizeBytes;
      } else {
        // By date (sample list order acts as chronologically descending)
        comparison = attachments.indexOf(a) - attachments.indexOf(b);
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [attachments, selectedCategory, searchQuery, sortBy, sortAsc]);

  // Handle file uploads
  const handleUploadFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let category: AttachmentItem['category'] = 'document';

      if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
        category = 'image';
      } else if (['csv', 'tsv', 'parquet', 'arrow', 'xlsx', 'xls'].includes(ext)) {
        category = 'data';
      } else if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'go', 'sh', 'yaml', 'yml'].includes(ext)) {
        category = 'code';
      }

      const sizeFormatted =
        file.size > 1_000_000
          ? `${(file.size / 1_000_000).toFixed(1)} MB`
          : `${Math.round(file.size / 1000)} KB`;

      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;

        const newAttachment: AttachmentItem = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          category,
          mimeType: file.type || `application/${ext}`,
          sizeBytes: file.size,
          sizeFormatted,
          uploadedAt: 'Just now',
          sessionTitle: 'Current Workspace Session',
          modelName: 'Active Model',
          thumbnailUrl: category === 'image' ? resultUrl : undefined,
          previewText:
            category !== 'image' && file.size < 200_000 && typeof resultUrl === 'string'
              ? resultUrl.slice(0, 500)
              : undefined,
          fileUrl: URL.createObjectURL(file),
        };

        setAttachments((prev) => [newAttachment, ...prev]);
      };

      if (category === 'image') {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    if (previewItem?.id === id) setPreviewItem(null);
  };

  const handleCopyLink = (name: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const renderCategoryIcon = (category: AttachmentItem['category'], size = 16) => {
    switch (category) {
      case 'image':
        return <ImageIcon size={size} className="text-sky-400 shrink-0" fill="white" />;
      case 'document':
        return <FileText size={size} className="text-amber-400 shrink-0" fill="white" />;
      case 'code':
        return <FileCode size={size} className="text-purple-400 shrink-0" fill="white" />;
      case 'data':
        return <TableIcon size={size} className="text-emerald-400 shrink-0" fill="white" />;
    }
  };

  return (
    <div
      className="h-full w-full overflow-y-auto flex flex-col font-sans select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: '#ffffff',
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        handleUploadFiles(e.dataTransfer.files);
      }}
    >
      {/* 1. HEADER SECTION (CODEX / CHATGPT STYLE) */}
      <div className="p-6 flex flex-col gap-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight text-white">Library</h1>

          {/* RIGHT ACTION: SEARCH BAR & UPLOAD BUTTON */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* SEARCH BAR */}
            <div
              className="flex-1 md:w-64 flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs"
              style={{
                backgroundColor: 'var(--bg-app)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Search size={14} className="text-white/40 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attachments..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder:text-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-white/40 hover:text-white cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 shrink-0"
            >
              <Upload size={14} />
              <span>Upload Attachments</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleUploadFiles(e.target.files)}
            />
          </div>
        </div>
      </div>

      {/* DRAG AND DROP TARGET OVERLAY */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-sky-500/10 border-2 border-dashed border-sky-400 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-none">
          <div
            className="p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3"
            style={{ backgroundColor: 'var(--bg-panel)' }}
          >
            <Upload size={32} className="text-sky-400 animate-bounce" />
            <span className="text-sm font-bold text-white">Drop files to add to Library</span>
          </div>
        </div>
      )}

      {/* 3. ATTACHMENTS CANVAS CONTENT */}
      <div className="flex-1 p-6">
        {filteredAttachments.length === 0 ? (
          /* EMPTY STATE */
          <div className="h-96 flex flex-col items-center justify-center gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white/30"
              style={{ backgroundColor: 'var(--bg-panel)' }}
            >
              <Upload size={24} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <span className="text-sm font-bold text-white">No attachments found</span>
              <p className="text-xs text-white/50">
                {searchQuery
                  ? `No attachments matching "${searchQuery}". Clear your search to see all items.`
                  : 'Upload images, documents, or data files, or attach them in chat to see them here.'}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-white/90 transition-all cursor-pointer"
            >
              Browse Files
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* MASONRY VIEW (PINTEREST STYLE FOR IMAGES) */
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-[2px]">
            {filteredAttachments.map((item) => (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className={`group relative overflow-hidden cursor-pointer break-inside-avoid mb-[2px] ${item.category !== 'image' ? 'aspect-square' : ''}`}
                style={{ backgroundColor: item.category === 'image' ? 'transparent' : 'var(--bg-panel)' }}
              >
                {/* PREVIEW CONTAINER */}
                <div className="w-full h-full relative flex items-center justify-center">
                  {item.category === 'image' && item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : item.category === 'document' ? (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                        <FileText size={16} />
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-white/50 uppercase">
                        {item.name.split('.').pop() || 'PDF'}
                      </span>
                    </div>
                  ) : item.category === 'data' ? (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <TableIcon size={16} />
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-white/50 uppercase">
                        DATA
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 p-2 text-center">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <FileCode size={16} />
                      </div>
                      <span className="text-[9px] font-mono font-semibold text-white/50 uppercase">
                        CODE
                      </span>
                    </div>
                  )}

                  {/* HOVER QUICK ACTION OVERLAY */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewItem(item);
                        }}
                        className="p-1.5 rounded bg-black/60 hover:bg-black text-white transition-colors backdrop-blur-md"
                        title="Inspect preview"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={(e) => handleCopyLink(item.name, item.id, e)}
                        className="p-1.5 rounded bg-black/60 hover:bg-black text-white transition-colors backdrop-blur-md"
                        title="Copy filename"
                      >
                        {copiedId === item.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 rounded bg-black/60 hover:bg-rose-500 text-white transition-colors backdrop-blur-md"
                        title="Remove attachment"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {/* Show filename on hover since there is no footer anymore */}
                    <div className="text-[9px] text-white font-medium truncate drop-shadow-md">
                      {item.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW (TABLE ROWS) */
          <div
            className="rounded-2xl overflow-hidden shadow-sm"
            style={{ backgroundColor: 'var(--bg-panel)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr
                    className="border-b text-[11px] font-mono text-white/50"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <th className="py-3 px-4 font-medium">Attachment</th>
                    <th className="py-3 px-4 font-medium">Category</th>
                    <th className="py-3 px-4 font-medium">Size</th>
                    <th className="py-3 px-4 font-medium">Session Source</th>
                    <th className="py-3 px-4 font-medium">Target Model</th>
                    <th className="py-3 px-4 font-medium">Date</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredAttachments.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setPreviewItem(item)}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {renderCategoryIcon(item.category, 16)}
                          <span className="font-semibold text-white truncate max-w-xs" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-mono text-[11px] text-white/70">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-white/70">{item.sizeFormatted}</td>
                      <td className="py-3 px-4 text-white/60 truncate max-w-[200px]">{item.sessionTitle}</td>
                      <td className="py-3 px-4 font-mono text-sky-400">{item.modelName}</td>
                      <td className="py-3 px-4 font-mono text-white/50 text-[11px]">{item.uploadedAt}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewItem(item);
                            }}
                            className="p-1 rounded text-white/50 hover:text-white cursor-pointer"
                            title="Preview"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={(e) => handleCopyLink(item.name, item.id, e)}
                            className="p-1 rounded text-white/50 hover:text-white cursor-pointer"
                            title="Copy Name"
                          >
                            {copiedId === item.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(item.id, e)}
                            className="p-1 rounded text-white/50 hover:text-rose-400 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. ATTACHMENT PREVIEW / INSPECTION LIGHTBOX MODAL */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setPreviewItem(null)}
        >
          {previewItem.category === 'image' && previewItem.thumbnailUrl ? (
            /* PURE IMAGE VIEWER (NO UI) */
            <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
              <img
                src={previewItem.thumbnailUrl}
                alt={previewItem.name}
                className="max-w-full max-h-full object-contain drop-shadow-2xl"
                onClick={(e) => e.stopPropagation()} /* prevent closing when clicking the image itself */
              />
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Close (ESC)"
              >
                <X size={24} />
              </button>
            </div>
          ) : previewItem.mimeType === 'application/pdf' && previewItem.fileUrl ? (
            /* NATIVE PDF VIEWER */
            <div className="relative w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 p-4 sm:p-12">
              <div 
                className="h-[90vh] max-w-full aspect-[1/1.414] overflow-hidden shadow-2xl bg-white rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe src={previewItem.fileUrl} className="w-full h-full border-none rounded-2xl" title={previewItem.name} />
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white transition-colors cursor-pointer z-10"
                title="Close (ESC)"
              >
                <X size={24} />
              </button>
            </div>
          ) : previewItem.previewText ? (
            /* BORDERLESS DOCUMENT / CODE VIEWER (NO UI) */
            <div className="relative w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-200 p-4 sm:p-12">
              <div 
                className={`h-[90vh] max-w-full aspect-[1/1.414] overflow-y-auto shadow-2xl ${
                  previewItem.category === 'document' 
                    ? 'bg-white text-black p-8 sm:p-12 rounded-2xl' 
                    : 'bg-[#16161a] text-[#d946ef] font-mono p-6 sm:p-8 rounded-2xl border border-white/10'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <pre className={`text-sm whitespace-pre-wrap ${previewItem.category === 'document' ? 'font-sans leading-relaxed text-black/90' : 'font-mono leading-snug'}`}>
                  {previewItem.previewText}
                </pre>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white transition-colors cursor-pointer z-10"
                title="Close (ESC)"
              >
                <X size={24} />
              </button>
            </div>
          ) : (
            /* FALLBACK NO-PREVIEW */
            <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center justify-center gap-4 text-center p-12 bg-black/40 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {renderCategoryIcon(previewItem.category, 64)}
                <span className="text-lg font-semibold text-white/80">Preview unavailable</span>
                <span className="text-sm text-white/40">This file type cannot be previewed natively.</span>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-0 right-0 p-3 text-white/50 hover:text-white transition-colors cursor-pointer"
                title="Close (ESC)"
              >
                <X size={24} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
