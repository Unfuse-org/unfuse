import { QuickLookPreview, type PreviewItem } from '../workspace/QuickLookPreview';
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

const STORAGE_KEY = 'unfuse_user_attachments_library_v2';

export const LibraryView: React.FC = () => {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(item => !/^att-[1-9]$/.test(item.id));
      }
    } catch {
      // fallback
    }
    return [];
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

      const isText = file.type.startsWith('text/') || ['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'rs', 'go', 'sh', 'yaml', 'yml', 'md', 'txt', 'csv', 'tsv', 'html', 'css', 'toml', 'xml', 'diff', 'mmd'].includes(ext);
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
            isText && file.size < 200_000 && typeof resultUrl === 'string'
              ? resultUrl
              : undefined,
          fileUrl: URL.createObjectURL(file),
        };

        setAttachments((prev) => [newAttachment, ...prev]);
      };

      if (category === 'image') {
        reader.readAsDataURL(file);
      } else if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
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
                onClick={() => setPreviewItem(item)} tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setPreviewItem(item); } }}
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
                      onClick={() => setPreviewItem(item)} tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); setPreviewItem(item); } }}
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

      {previewItem && <QuickLookPreview selectedId={previewItem.id} onSelect={id => setPreviewItem(filteredAttachments.find(item => item.id === id) || null)} onClose={() => setPreviewItem(null)} items={filteredAttachments.map(item => ({
        id: item.id, name: item.name, detail: `${item.sizeFormatted} · ${item.mimeType} · ${item.sessionTitle}${item.category === 'document' && item.previewText && !item.fileUrl ? ' · Text excerpt' : ''}`,
        imageUrl: item.category === 'image' ? item.thumbnailUrl : undefined,
        pdfUrl: item.mimeType === 'application/pdf' ? item.fileUrl : undefined,
        mediaUrl: item.mimeType.startsWith('audio/') || item.mimeType.startsWith('video/') ? item.fileUrl : undefined,
        mediaType: item.mimeType.startsWith('video/') ? 'video' : 'audio',
        text: item.previewText,
      }))} />}
    </div>
  );
};
