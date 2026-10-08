import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  Plus,
  Search,
  X,
  Blocks,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Presentation,
  Files,
  FolderOpen,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  ServiceId,
  ServiceMetadata,
  SERVICE_METADATA,
} from './types';
import {
  getAllServiceStates,
  saveServiceConfig,
  disconnectService,
  subscribeIntegrations,
} from './integrationStore';
import { renderIntegrationLogo, McpLogo } from './IntegrationLogos';
import { PluginDetailCanvas } from './PluginDetailCanvas';

interface CategorySection {
  id: string;
  name: string;
  serviceIds: ServiceId[];
}

const PLUGIN_CATEGORIES: CategorySection[] = [
  {
    id: 'workspace',
    name: 'Workspace & Knowledge',
    serviceIds: ['gmail', 'notion', 'googledrive'],
  },
  {
    id: 'observability',
    name: 'Observability & Telemetry',
    serviceIds: ['datadog', 'sentry', 'posthog'],
  },
  {
    id: 'engineering',
    name: 'Engineering & Issues',
    serviceIds: ['github', 'linear', 'jira'],
  },
  {
    id: 'databases',
    name: 'Databases & Infrastructure',
    serviceIds: ['postgresql', 'supabase', 'redis', 'docker'],
  },
  {
    id: 'search',
    name: 'Web Search & Intelligence',
    serviceIds: ['duckduckgo', 'brave', 'tavily', 'exa', 'google'],
  },
  {
    id: 'communication',
    name: 'Communication & Design',
    serviceIds: ['slack', 'discord', 'figma'],
  },
];

export const IntegrationsView: React.FC = () => {
  const [states, setStates] = useState(getAllServiceStates());
  const [activeTab, setActiveTab] = useState<'plugins' | 'skills'>('plugins');
  const [query, setQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'browse' | 'saved'>('browse');
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [creationModalType, setCreationModalType] = useState<'plugin' | 'mcpm' | null>(null);


  // Custom creation form state
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCommand, setCustomCommand] = useState('');

  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStates(getAllServiceStates());
    const unsub = subscribeIntegrations((newStates) => {
      setStates(newStates);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedServiceId(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedServiceId]);

  // Close add menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allPlugins = useMemo(() => {
    return Object.values(SERVICE_METADATA).filter((svc) => svc.id !== 'mcp');
  }, []);

  // Installed plugins list
  const installedPlugins = useMemo(() => {
    return allPlugins.filter((p) => states[p.id]?.isConnected);
  }, [allPlugins, states]);

  const handleAddPlugin = (service: ServiceMetadata) => {
    if (service.requiresKey === false) {
      // Zero-config: 1-click install
      saveServiceConfig(service.id, { isConnected: true });
      return;
    }
    // Requires credentials: open modal
    setSelectedServiceId(service.id);
  };

  const handleCreateCustom = () => {
    if (!customName.trim()) return;
    setCreationModalType(null);
    setCustomName('');
    setCustomDesc('');
    setCustomCommand('');
  };

  return (
    <div
      className="integrations-view relative flex h-full w-full min-w-0 overflow-hidden font-sans select-none"
      style={{
        containerType: 'inline-size',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      <div className="integrations-layout flex flex-1 min-w-0 min-h-0">
      {/* 1. LEFT CANVAS: OFFERINGS (REMAINING CANVAS) OR FULL INFO CANVAS */}
      <div className="integrations-content flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5 min-w-0">
        <>
            {/* CANVAS HEADER: TITLE + SETTINGS & ADD MENU ON THE RIGHT */}
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h1 className="text-xl font-bold tracking-tight capitalize" style={{ color: 'var(--text-main)' }}>
                {activeTab === 'plugins' ? 'Integrations' : 'Skills'}
              </h1>

          {/* RIGHT ACTIONS: SETTINGS + ADD MENU */}
          {activeTab === 'skills' ? (
            <button disabled title="Skill import requires the skill-loading backend" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-active)] text-xs font-medium opacity-40 cursor-not-allowed"><Plus size={14} /> Import skill</button>
          ) : <div className="flex items-center gap-2 relative" ref={addMenuRef}>
            {/* ADD MENU BUTTON */}
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-active)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] text-xs font-semibold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            {/* ADD MENU DROPDOWN */}
            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[var(--bg-panel)] border border-white/[0.1] shadow-2xl p-1 z-30 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setCreationModalType('plugin');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-main)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-2.5"
                >
                  <Blocks className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Create Plugin</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setCreationModalType('mcpm');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[var(--text-main)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-2.5"
                >
                  <McpLogo size={14} className="text-[var(--text-muted)]" />
                  <span>Create MCP</span>
                </button>
              </div>
            )}
          </div>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-[var(--bg-surface)] p-1 text-xs">
            {(['browse', 'saved'] as const).map(filter => <button key={filter} onClick={() => setCatalogFilter(filter)} className={`px-3 py-1.5 rounded-md transition-colors ${catalogFilter === filter ? 'bg-[var(--bg-active)] text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{filter === 'browse' ? 'Browse' : activeTab === 'plugins' ? 'Configured' : 'Installed'}</button>)}
          </div>
          <label className="flex items-center gap-2 border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[var(--text-muted)] flex-1 max-w-xs min-w-0"><Search size={14} /><input aria-label={`Search ${activeTab === 'plugins' ? 'integrations' : 'skills'}`} value={query} onChange={e => setQuery(e.target.value)} placeholder={`Search ${activeTab === 'plugins' ? 'integrations' : 'skills'}…`} className="bg-transparent outline-none w-full min-w-0 text-xs text-[var(--text-main)]" /></label>
        </div>
        {activeTab === 'plugins' ? (
          <div className="flex flex-col gap-5 pb-5">
            {PLUGIN_CATEGORIES.map((category) => {
              const services = category.serviceIds
                .map((id) => SERVICE_METADATA[id])
                .filter(service => service && (catalogFilter === 'browse' || states[service.id]?.isConnected) && `${service.name} ${service.tagline} ${service.description}`.toLowerCase().includes(query.toLowerCase()));

              if (services.length === 0) return null;

              return (
                <div key={category.id} className="flex flex-col gap-3">
                  {/* CATEGORY HEADER */}
                  <div className="flex items-center">
                    <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
                      {category.name}
                    </span>
                  </div>

                  {/* GRID OF PLUGINS */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
                    {services.map((plugin) => {
                      const isInstalled = states[plugin.id]?.isConnected || false;

                      return (
                        <div
                          key={plugin.id}
                          className="p-4 hover:bg-[var(--bg-surface)] transition-all flex items-center justify-between gap-2 group min-w-0"
                        >
                          {/* LEFT: BIGGER OFFICIAL LOGO + NAME & FULL INFORMATION */}
                          <div
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => setSelectedServiceId(plugin.id)}
                          >
                            <div className="w-11 h-11 flex items-center justify-center shrink-0">
                              {renderIntegrationLogo(plugin.id, 26)}
                            </div>
                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight truncate">
                                {plugin.name}
                              </span>
                              <span title={plugin.tagline || plugin.description} className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug truncate">
                                {plugin.tagline || plugin.description}
                              </span>
                            </div>
                          </div>

                          {/* RIGHT: SIMPLE ADD BUTTON OR CLICKABLE ADDED STATUS */}
                          <div className="shrink-0 pl-1">
                            {isInstalled ? (
                              <button
                                type="button"
                                onClick={() => setSelectedServiceId(plugin.id)}
                                className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/90 hover:text-emerald-300 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="View plugin tools & configuration"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Saved</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddPlugin(plugin)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-active)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-main)] transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="pb-6">
            {catalogFilter === 'saved' ? <div className="py-16 text-center"><FolderOpen size={28} strokeWidth={1.3} className="mx-auto mb-4 text-[var(--text-muted)]" /><h2 className="text-sm font-medium">Your installed skills</h2><p className="text-xs text-[var(--text-muted)] mt-2">Local discovery is not connected yet.</p></div> : <>
              <p className="text-xs text-[var(--text-muted)] mb-5">Source references from Anthropic · Import is not connected yet.</p>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                {[
                  {icon: FileText, id: 'docx', name: 'Word documents', description: 'Create and edit Word documents.'},
                  {icon: Files, id: 'pdf', name: 'PDF', description: 'Work with PDF documents and forms.'},
                  {icon: Presentation, id: 'pptx', name: 'Presentations', description: 'Create and edit slide decks.'},
                  {icon: FileSpreadsheet, id: 'xlsx', name: 'Spreadsheets', description: 'Work with spreadsheets, formulas, and data.'},
                ].filter(skill => `${skill.name} ${skill.description}`.toLowerCase().includes(query.toLowerCase())).map(skill => <div key={skill.id} className="rounded-2xl border border-[var(--border-subtle)] p-4 hover:bg-[var(--bg-surface)] transition-colors">
                  <div className="flex items-center justify-between mb-4"><skill.icon size={22} strokeWidth={1.5} /><button disabled title="Requires the skill-loading backend" className="text-xs text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1 opacity-40 cursor-not-allowed">Import</button></div>
                  <h2 className="text-sm font-medium">{skill.name}</h2><p className="text-xs text-[var(--text-muted)] leading-5 mt-1 mb-4">{skill.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]"><span>Anthropic</span><a className="inline-flex items-center gap-1 hover:text-[var(--text-main)]" href={`https://github.com/anthropics/skills/blob/main/skills/${skill.id}/SKILL.md`} target="_blank" rel="noreferrer">View instructions<ExternalLink size={12} /></a></div>
                </div>)}
              </div>
            </>}
          </div>
        )}
        {activeTab === 'plugins' && catalogFilter === 'saved' && installedPlugins.length === 0 && <p className="text-center text-xs text-[var(--text-muted)] py-12">No integrations configured yet.</p>}
        </>
      </div>

      {/* 2. RIGHT SIDE PANEL: INTEGRATIONS, PLUGINS/SKILLS (WITH LOGOS), AND INSTALLED LIST (NO SURROUNDING BOXES, NO DIVIDER LINE) */}
      <div
        className="integrations-navigation w-52 border-l p-4 flex flex-col gap-4 shrink-0 overflow-y-auto min-h-0"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-main)',
        }}
      >
        {/* PANEL TITLE */}
        <div>
          <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--text-main)' }}>Integrations</h2>
        </div>

        {/* TWO TITLES WITH LOGOS: PLUGINS AND SKILLS */}
        <div className="integrations-tabs flex flex-col gap-1">
          <button
            onClick={() => {
              setActiveTab('plugins');
              setSelectedServiceId(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              activeTab === 'plugins' && !selectedServiceId
                ? 'bg-[var(--bg-active)] text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Blocks className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Plugins</span>
            </div>
            {activeTab === 'plugins' && !selectedServiceId && <ChevronRight className="w-3 h-3 text-[var(--text-faint)]" />}
          </button>

          <button
            onClick={() => {
              setActiveTab('skills');
              setSelectedServiceId(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              activeTab === 'skills'
                ? 'bg-[var(--bg-active)] text-[var(--text-main)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Skills</span>
            </div>
            {activeTab === 'skills' && <ChevronRight className="w-3 h-3 text-[var(--text-faint)]" />}
          </button>
        </div>

        {/* INSTALLED SECTION (NO LINE ABOVE IT) */}
        <details className="integrations-installed min-w-0">
          <summary className="flex items-center justify-between cursor-pointer gap-3 py-1">
            <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">{activeTab === 'plugins' ? 'Installed' : 'Local skills'}</span>
            <span className="text-[10px] font-mono text-[var(--text-faint)]">
              {activeTab === 'plugins' ? installedPlugins.length : '—'}
            </span>
          </summary>

          {/* INSTALLED LIST: NO BOXES, JUST LOGO AND NAME */}
          <div className="flex flex-col gap-1">
            {activeTab === 'plugins' ? (
              installedPlugins.length === 0 ? (
                <span className="text-xs text-[var(--text-faint)] py-1 px-1">No plugins installed yet</span>
              ) : (
                installedPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    onClick={() => setSelectedServiceId(plugin.id)}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-between gap-2 transition-colors group cursor-pointer ${
                      selectedServiceId === plugin.id
                        ? 'bg-[var(--bg-active)] text-[var(--text-main)] font-medium'
                        : 'text-[var(--text-main)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {renderIntegrationLogo(plugin.id, 16)}
                      </div>
                      <span className="text-xs font-medium truncate">
                        {plugin.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        disconnectService(plugin.id);
                        if (selectedServiceId === plugin.id) {
                          setSelectedServiceId(null);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--text-faint)] hover:text-rose-400 p-0.5 transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )
            ) : (
              <span className="text-xs text-[var(--text-faint)] py-2 px-1 leading-5">Discovery unavailable</span>
            )}
          </div>
        </details>
      </div>



      </div>

      {selectedServiceId && <div className="absolute inset-0 z-40 bg-black/30 flex justify-end" onClick={() => setSelectedServiceId(null)}><div role="dialog" aria-modal="true" aria-label="Integration details" className="w-full max-w-lg h-full overflow-y-auto bg-[var(--bg-panel)] border-l border-[var(--border-subtle)] p-6 shadow-2xl" onClick={event => event.stopPropagation()}><PluginDetailCanvas key={selectedServiceId} serviceId={selectedServiceId} onBack={() => setSelectedServiceId(null)} /></div></div>}

      {/* CREATE PLUGIN / CREATE MCP MODAL */}
      {creationModalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#121316] border border-white/[0.1] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 font-sans select-none">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {creationModalType === 'plugin' ? (
                  <Blocks className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <McpLogo size={16} className="text-[var(--text-muted)]" />
                )}
                <h3 className="text-sm font-semibold text-[var(--text-main)]">
                  {creationModalType === 'plugin' ? 'Create Custom Plugin' : 'Create MCP Server'}
                </h3>
              </div>
              <button
                onClick={() => setCreationModalType(null)}
                className="text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={creationModalType === 'plugin' ? 'my-custom-plugin' : 'my-mcp-server'}
                  className="w-full h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-white/[0.08] focus:border-white/25 text-xs text-[var(--text-main)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Short description of capabilities"
                  className="w-full h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-white/[0.08] focus:border-white/25 text-xs text-[var(--text-main)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  Command or Entrypoint
                </label>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="npx -y @my-org/mcp-server"
                  className="w-full h-8 px-3 rounded-lg bg-[var(--bg-surface)] border border-white/[0.08] focus:border-white/25 text-xs text-[var(--text-main)] font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setCreationModalType(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustom}
                disabled={!customName.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-all"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
