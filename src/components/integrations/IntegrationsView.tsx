import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  Plus,
  Settings,
  X,
  Blocks,
  Sparkles,
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

interface SkillItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

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

interface SkillCategorySection {
  id: string;
  name: string;
  skills: SkillItem[];
}

const SKILL_CATEGORIES: SkillCategorySection[] = [
  {
    id: 'engineering',
    name: 'Engineering & Quality',
    skills: [
      {
        id: 'code-review',
        name: 'Code Review & Quality',
        category: 'Engineering',
        description: 'Multi-axis code review evaluating correctness, readability, architecture, and performance.',
      },
      {
        id: 'api-design',
        name: 'API & Interface Design',
        category: 'Engineering',
        description: 'Stable REST and GraphQL endpoint design, type contracts, and module boundaries.',
      },
      {
        id: 'code-simplification',
        name: 'Code Simplification',
        category: 'Engineering',
        description: 'Refactoring code for clarity and maintainability without changing behavior.',
      },
    ],
  },
  {
    id: 'testing',
    name: 'Testing & Reliability',
    skills: [
      {
        id: 'test-driven-development',
        name: 'Test-Driven Development',
        category: 'Testing',
        description: 'Red-green-refactor loop enforcement, automated edge-case test generation and assertions.',
      },
      {
        id: 'browser-testing',
        name: 'Browser DevTools Testing',
        category: 'Testing',
        description: 'Live DOM inspection, console error capture, network request tracing, and visual audits.',
      },
    ],
  },
  {
    id: 'security-perf',
    name: 'Security & Performance',
    skills: [
      {
        id: 'security-hardening',
        name: 'Security & Hardening',
        category: 'Security',
        description: 'OWASP Top 10 auditing, credential leak prevention, and untrusted input sanitization.',
      },
      {
        id: 'perf-optimization',
        name: 'Performance Optimization',
        category: 'Performance',
        description: 'Runtime memory leak detection, N+1 query elimination, and web vitals profiling.',
      },
    ],
  },
  {
    id: 'workflows',
    name: 'Workflows & Git',
    skills: [
      {
        id: 'git-workflow',
        name: 'Git Workflow & Versioning',
        category: 'Workflows',
        description: 'Atomic git commit splitting, semantic version bumping, and PR branch rebasing.',
      },
    ],
  },
];

export const IntegrationsView: React.FC = () => {
  const [states, setStates] = useState(getAllServiceStates());
  const [activeTab, setActiveTab] = useState<'plugins' | 'skills'>('plugins');
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [creationModalType, setCreationModalType] = useState<'plugin' | 'mcpm' | null>(null);
  const [installedSkillIds, setInstalledSkillIds] = useState<string[]>([
    'code-review',
    'git-workflow',
  ]);

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

  const handleToggleSkill = (skillId: string) => {
    setInstalledSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
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
      className="flex flex-row h-full w-full overflow-hidden font-sans select-none"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* 1. LEFT CANVAS: OFFERINGS (REMAINING CANVAS) OR FULL INFO CANVAS */}
      <div className="flex-1 h-full overflow-y-auto px-8 py-7 flex flex-col gap-6 min-w-0">
        {selectedServiceId ? (
          <PluginDetailCanvas
            serviceId={selectedServiceId}
            onBack={() => setSelectedServiceId(null)}
          />
        ) : (
          <>
            {/* CANVAS HEADER: TITLE + SETTINGS & ADD MENU ON THE RIGHT */}
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <h1 className="text-xl font-bold tracking-tight capitalize" style={{ color: 'var(--text-main)' }}>
                {activeTab}
              </h1>

          {/* RIGHT ACTIONS: SETTINGS + ADD MENU */}
          <div className="flex items-center gap-2 relative" ref={addMenuRef}>
            {/* SETTINGS MENU BUTTON */}
            <button
              onClick={() => {
                if (installedPlugins.length > 0) {
                  setSelectedServiceId(installedPlugins[0].id);
                }
              }}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* ADD MENU BUTTON */}
            <button
              onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            {/* ADD MENU DROPDOWN */}
            {isAddMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[#141518] border border-white/[0.1] shadow-2xl p-1 z-30 flex flex-col gap-0.5">
                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setCreationModalType('plugin');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-2.5"
                >
                  <Blocks className="w-3.5 h-3.5 text-white/70" />
                  <span>Create Plugin</span>
                </button>

                <button
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setCreationModalType('mcpm');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-2.5"
                >
                  <McpLogo size={14} className="text-white/70" />
                  <span>Create MCP</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* OFFERINGS CATALOG: DIVIDED INTO CATEGORIES, BIGGER OFFICIAL LOGOS, FILLING THE CANVAS */}
        {activeTab === 'plugins' ? (
          <div className="flex flex-col gap-8 pb-10">
            {PLUGIN_CATEGORIES.map((category) => {
              const services = category.serviceIds
                .map((id) => SERVICE_METADATA[id])
                .filter(Boolean);

              if (services.length === 0) return null;

              return (
                <div key={category.id} className="flex flex-col gap-3">
                  {/* CATEGORY HEADER */}
                  <div className="flex items-center">
                    <span className="text-sm font-bold text-white tracking-tight">
                      {category.name}
                    </span>
                  </div>

                  {/* GRID OF PLUGINS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {services.map((plugin) => {
                      const isInstalled = states[plugin.id]?.isConnected || false;

                      return (
                        <div
                          key={plugin.id}
                          className="py-3 px-3.5 rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3.5 group"
                        >
                          {/* LEFT: BIGGER OFFICIAL LOGO + NAME & FULL INFORMATION */}
                          <div
                            className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => setSelectedServiceId(plugin.id)}
                          >
                            <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                              {renderIntegrationLogo(plugin.id, 30)}
                            </div>
                            <div className="flex flex-col min-w-0 pr-1">
                              <span className="text-sm font-semibold text-white tracking-tight">
                                {plugin.name}
                              </span>
                              <span className="text-xs text-white/50 mt-0.5 leading-snug break-words">
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
                                <span>Added</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddPlugin(plugin)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
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
          <div className="flex flex-col gap-8 pb-10">
            {SKILL_CATEGORIES.map((category) => (
              <div key={category.id} className="flex flex-col gap-3">
                {/* CATEGORY HEADER */}
                <div className="flex items-center">
                  <span className="text-sm font-bold text-white tracking-tight">
                    {category.name}
                  </span>
                </div>

                {/* GRID OF SKILLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {category.skills.map((skill) => {
                    const isInstalled = installedSkillIds.includes(skill.id);

                    return (
                      <div
                        key={skill.id}
                        className="py-3 px-3.5 rounded-xl hover:bg-white/[0.04] transition-all flex items-center justify-between gap-3.5 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 text-white/70">
                            <Sparkles className="w-6 h-6 text-amber-300/80" />
                          </div>
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-sm font-semibold text-white tracking-tight">
                              {skill.name}
                            </span>
                            <span className="text-xs text-white/50 mt-0.5 leading-snug break-words">
                              {skill.description}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 pl-1">
                          {isInstalled ? (
                            <button
                              onClick={() => handleToggleSkill(skill.id)}
                              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400/90 px-2.5 py-1 hover:text-rose-400 transition-colors"
                              title="Click to remove"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Added</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleSkill(skill.id)}
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 active:scale-95"
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
            ))}
          </div>
        )}
          </>
        )}
      </div>

      {/* 2. RIGHT SIDE PANEL: INTEGRATIONS, PLUGINS/SKILLS (WITH LOGOS), AND INSTALLED LIST (NO SURROUNDING BOXES, NO DIVIDER LINE) */}
      <div
        className="w-72 h-full border-l p-6 flex flex-col gap-6 shrink-0 overflow-y-auto"
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
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              setActiveTab('plugins');
              setSelectedServiceId(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              activeTab === 'plugins' && !selectedServiceId
                ? 'bg-white/10 text-white font-semibold'
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Blocks className="w-3.5 h-3.5 text-white/70" />
              <span>Plugins</span>
            </div>
            {activeTab === 'plugins' && !selectedServiceId && <ChevronRight className="w-3 h-3 text-white/40" />}
          </button>

          <button
            onClick={() => {
              setActiveTab('skills');
              setSelectedServiceId(null);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
              activeTab === 'skills'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-3.5 h-3.5 text-white/70" />
              <span>Skills</span>
            </div>
            {activeTab === 'skills' && <ChevronRight className="w-3 h-3 text-white/40" />}
          </button>
        </div>

        {/* INSTALLED SECTION (NO LINE ABOVE IT) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90 tracking-tight">Installed</span>
            <span className="text-[10px] font-mono text-white/30">
              {activeTab === 'plugins' ? installedPlugins.length : installedSkillIds.length}
            </span>
          </div>

          {/* INSTALLED LIST: NO BOXES, JUST LOGO AND NAME */}
          <div className="flex flex-col gap-1">
            {activeTab === 'plugins' ? (
              installedPlugins.length === 0 ? (
                <span className="text-xs text-white/30 py-1 px-1">No plugins installed yet</span>
              ) : (
                installedPlugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    onClick={() => setSelectedServiceId(plugin.id)}
                    className={`py-1.5 px-2 rounded-lg flex items-center justify-between gap-2 transition-colors group cursor-pointer ${
                      selectedServiceId === plugin.id
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/80 hover:text-white hover:bg-white/[0.06]'
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
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-white/30 hover:text-rose-400 p-0.5 transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )
            ) : installedSkillIds.length === 0 ? (
              <span className="text-xs text-white/30 py-1 px-1">No skills enabled yet</span>
            ) : (
              installedSkillIds.map((skillId) => {
                const skill = SKILL_CATEGORIES.flatMap((c) => c.skills).find(
                  (s) => s.id === skillId
                );
                if (!skill) return null;
                return (
                  <div
                    key={skill.id}
                    className="py-1.5 px-1 flex items-center justify-between gap-2 text-white/80 hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0 text-white/70">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300/80" />
                      </div>
                      <span className="text-xs font-medium truncate">
                        {skill.name}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleSkill(skill.id)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-white/30 hover:text-rose-400 p-0.5 transition-all"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>



      {/* CREATE PLUGIN / CREATE MCP MODAL */}
      {creationModalType && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-[#121316] border border-white/[0.1] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 font-sans select-none">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {creationModalType === 'plugin' ? (
                  <Blocks className="w-4 h-4 text-white/70" />
                ) : (
                  <McpLogo size={16} className="text-white/70" />
                )}
                <h3 className="text-sm font-semibold text-white">
                  {creationModalType === 'plugin' ? 'Create Custom Plugin' : 'Create MCP Server'}
                </h3>
              </div>
              <button
                onClick={() => setCreationModalType(null)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={creationModalType === 'plugin' ? 'my-custom-plugin' : 'my-mcp-server'}
                  className="w-full h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] focus:border-white/25 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Short description of capabilities"
                  className="w-full h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] focus:border-white/25 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/60 mb-1">
                  Command or Entrypoint
                </label>
                <input
                  type="text"
                  value={customCommand}
                  onChange={(e) => setCustomCommand(e.target.value)}
                  placeholder="npx -y @my-org/mcp-server"
                  className="w-full h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] focus:border-white/25 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => setCreationModalType(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-white/50 hover:text-white"
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
