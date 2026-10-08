import React, { useState, useEffect } from 'react';
import { Plus, Server, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Grid2X2, Plug, Folder, Logs, NotebookPen, Settings } from 'lucide-react';
import unfuseLogo from './assets/logo.png';
import { SidebarPanel } from './components/sidebar/SidebarPanel';
import { ChatSession } from './components/sidebar/types';
import { DashboardView } from './components/dashboard/DashboardView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { LibraryView } from './components/library/LibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { ModelLogsView } from './components/settings/ModelLogsView';
import { MemoryView } from './components/settings/MemoryView';
import { RackPanel } from './components/rack/RackPanel';
import { AddPanel } from './components/workspace/AddPanel';
import { LocalModelBlade } from './components/rack/types';
import { MainChatPanel } from './components/chat/MainChatPanel';


function NavigationIcon({ name }: { name: 'dashboard' | 'integrations' | 'library' | 'logs' | 'memory' | 'settings' }) {
  const icons = {
    dashboard: Grid2X2,
    integrations: Plug,
    library: Folder,
    logs: Logs,
    memory: NotebookPen,
    settings: Settings,
  };
  const Icon = icons[name];
  return <Icon size={19} strokeWidth={1.65} aria-hidden="true" />;
}

export default function App() {
  const [logModel, setLogModel] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<'home' | 'dashboard' | 'integrations' | 'library' | 'settings' | 'logs' | 'memory'>('dashboard');
  const [activeRightPanel, setActiveRightPanel] = useState<'none' | 'rack' | 'add'>('none');
  const [isAddPanelExpanded, setIsAddPanelExpanded] = useState(false);
  const [renderedRightPanel, setRenderedRightPanel] = useState<'none' | 'rack' | 'add'>('none');

  useEffect(() => {
    if (activeRightPanel !== 'none') {
      setRenderedRightPanel(activeRightPanel);
      return;
    }
    const timeout = window.setTimeout(() => {
      setRenderedRightPanel('none');
      setIsAddPanelExpanded(false);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [activeRightPanel]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: 'preview-login', title: 'Fix the login failure', updatedAt: new Date(), messageCount: 12, modelUsed: 'Qwen · DeepSeek', pinned: true },
    { id: 'preview-storage', title: 'Review the storage design', updatedAt: new Date(Date.now() - 3600000), messageCount: 8, modelUsed: 'Qwen' },
    { id: 'preview-dashboard', title: 'Simplify the dashboard', updatedAt: new Date(Date.now() - 86400000), messageCount: 6, modelUsed: 'Llama' },
    { id: 'preview-pipeline', title: 'Plan model handoffs', updatedAt: new Date(Date.now() - 172800000), messageCount: 18, modelUsed: 'Qwen · DeepSeek' },
  ]);
  const [activeChatId, setActiveChatId] = useState('preview-login');
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);
  const [rackModels, setRackModels] = useState<LocalModelBlade[]>([]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClose = () => setIsMenuOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [isMenuOpen]);

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden select-none font-sans"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* 1. TOP BAR: INDEPENDENT, PROPER EDGED, SAME SIZE (40px) */}
      <header
        className="h-[40px] w-full border-b flex items-center justify-between px-3 shrink-0"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)',
        }}
        data-tauri-drag-region
      >
        {activeNav === 'home' && (
          <button
            onClick={() => setIsChatSidebarOpen((open) => !open)}
            aria-label={isChatSidebarOpen ? 'Collapse chat sidebar' : 'Expand chat sidebar'}
            title={isChatSidebarOpen ? 'Collapse chat sidebar' : 'Expand chat sidebar'}
            aria-expanded={isChatSidebarOpen}
            className="ml-[72px] -translate-y-[2px] w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-white hover:bg-white/10"
          >
            {isChatSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        <div data-tauri-drag-region className="flex-1 h-full" />
        <div className="flex items-center gap-1.5 relative">
          {/* 1) ADD SYMBOL */}
          <button
            onClick={() => {
              setActiveRightPanel((curr) => {
                return curr === 'add' ? 'none' : 'add';
              });
            }}
            className="-translate-y-[2px] w-[28px] h-[28px] flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-white/10"
            style={{
              backgroundColor: activeRightPanel === 'add' ? 'var(--bg-active)' : 'transparent',
              color: '#ffffff',
            }}
            title="Workspace Tools (Terminal, Files, Changes, Library)"
          >
            <Plus size={18} />
          </button>

          {/* 2) RACK SYMBOL */}
          <button
            onClick={() => setActiveRightPanel((curr) => (curr === 'rack' ? 'none' : 'rack'))}
            className="-translate-y-[2px] w-[28px] h-[28px] flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-white/10"
            style={{
              backgroundColor: activeRightPanel === 'rack' ? 'var(--bg-active)' : 'transparent',
              color: '#ffffff',
            }}
            title="Model Rack"
          >
            <Server size={18} />
          </button>

          {/* 3) 3 DOTS SYMBOL */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="-translate-y-[2px] w-[28px] h-[28px] flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-white/10"
            style={{
              backgroundColor: isMenuOpen ? 'var(--bg-active)' : 'transparent',
              color: '#ffffff',
            }}
            title="More Options"
          >
            <MoreHorizontal size={18} />
          </button>

          {/* 3 DOTS DROPDOWN MENU */}
          {isMenuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 z-50 min-w-[160px] py-1 border rounded-lg shadow-lg flex flex-col"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <button
                onClick={() => {
                  setActiveNav('settings');
                  setIsMenuOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              >
                Settings & Themes
              </button>
              <button
                onClick={() => {
                  setActiveRightPanel((curr) => (curr === 'rack' ? 'none' : 'rack'));
                  setIsMenuOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              >
                {activeRightPanel === 'rack' ? 'Hide Model Rack' : 'Show Model Rack'}
              </button>
              <button
                onClick={() => {
                  setActiveRightPanel((curr) => (curr === 'add' ? 'none' : 'add'));
                  setIsMenuOpen(false);
                }}
                className="px-3 py-1.5 text-xs text-left transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              >
                {activeRightPanel === 'add' ? 'Hide Tools Panel' : 'Show Tools Panel'}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. LOWER SECTION: INDEPENDENT SIDE BAR + PROPER EDGED WORKSPACE */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* LEFT SIDE RAIL: INDEPENDENT, PROPER EDGED, 48px rail */}
        <aside
          className="w-[48px] border-r flex flex-col items-center gap-2 shrink-0 pt-4 pb-3"
          style={{
            backgroundColor: 'var(--bg-rail)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* 1) HOME BUTTON */}
          <button
            onClick={() => setActiveNav('home')}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'home' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'home' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Home"
          >
            <img src={unfuseLogo} alt="" className="w-8 h-8 max-w-none shrink-0 mix-blend-screen" />
          </button>

          {/* 2) DASHBOARD BUTTON */}
          <button
            onClick={() => setActiveNav('dashboard')}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'dashboard' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'dashboard' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Dashboard"
          >
            <NavigationIcon name="dashboard" />
          </button>

          {/* 3) INTEGRATIONS BUTTON */}
          <button
            onClick={() => setActiveNav('integrations')}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'integrations' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'integrations' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Integrations"
          >
            <NavigationIcon name="integrations" />
          </button>

          {/* 4) LIBRARY BUTTON */}
          <button
            onClick={() => setActiveNav('library')}
            className="w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'library' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'library' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Library"
          >
            <NavigationIcon name="library" />
          </button>

          {([{ id: 'logs', label: 'Logs'}, { id: 'memory', label: 'Memory'}] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveNav(id)} title={label} aria-label={label} aria-current={activeNav === id ? 'page' : undefined}
              className="w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              style={{ backgroundColor: activeNav === id ? 'var(--bg-active)' : 'transparent', color: activeNav === id ? 'var(--text-main)' : 'var(--text-muted)' }}>
              <NavigationIcon name={id} />
            </button>
          ))}

          {/* 5) SETTINGS BUTTON */}
          <button
            onClick={() => setActiveNav('settings')}
            className="mt-auto w-[34px] h-[34px] flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'settings' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'settings' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Settings"
          >
            <NavigationIcon name="settings" />
          </button>
        </aside>

        {/* WORKSPACE AREA: PROPER EDGED (NO CURVES, NO GAPS) */}
        <div className="flex-1 h-full flex flex-row min-w-0">
          {/* MAIN CANVAS CONTENT */}
          <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
            {activeNav === 'home' && (
              <div className="flex-1 h-full flex flex-row min-w-0" style={{ backgroundColor: 'var(--bg-app)' }}>
                {/* CHAT PANEL */}
                <aside
                  aria-hidden={!isChatSidebarOpen}
                  ref={(element) => element?.toggleAttribute('inert', !isChatSidebarOpen)}
                  className={`workspace-panel-motion h-full flex flex-col shrink-0 overflow-hidden ${isChatSidebarOpen ? '' : 'workspace-panel-closed'}`}
                  style={{
                    width: isChatSidebarOpen ? 288 : 0,
                    backgroundColor: 'var(--bg-panel)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="w-72 h-full border-r" style={{ borderColor: 'var(--border-subtle)' }}><SidebarPanel sessions={chatSessions} activeSessionId={activeChatId}
                    onSelectSession={setActiveChatId} onUpdateSessions={setChatSessions} /></div>
                </aside>

                {/* MAIN PANEL */}
                <MainChatPanel
                  sessionId={activeChatId}
                  models={rackModels}
                  onOpenRack={() => setActiveRightPanel('rack')}
                />
              </div>
            )}
            {activeNav === 'dashboard' && <DashboardView onOpenLogs={(model) => { setLogModel(model); setActiveNav('logs'); }} />}
            {activeNav === 'integrations' && <IntegrationsView />}
            {activeNav === 'library' && <LibraryView />}
            {activeNav === 'logs' && <ModelLogsView modelFilter={logModel} onClearModelFilter={() => setLogModel(null)} />}
            {activeNav === 'memory' && <MemoryView />}
            {activeNav === 'settings' && <SettingsView models={rackModels} onOpenRack={() => setActiveRightPanel('rack')} />}
          </div>

          {/* COLLAPSIBLE RIGHT PANEL: DIRECTLY BELOW THE 3 TOP BAR BUTTONS */}
          <aside
            aria-hidden={activeRightPanel === 'none'}
            ref={(element) => element?.toggleAttribute('inert', activeRightPanel === 'none')}
            className={`workspace-panel-motion h-full flex flex-col shrink-0 overflow-hidden ${activeRightPanel === 'none' ? 'workspace-panel-closed' : ''}`}
            style={{
              width: activeRightPanel === 'none' ? 0 : activeRightPanel === 'rack' ? 360 : isAddPanelExpanded ? 880 : 500,
              maxWidth: '60%',
              backgroundColor: 'var(--bg-panel)',
            }}
          >
            {renderedRightPanel !== 'none' && <div
              className="h-full border-l flex flex-col shrink-0"
              style={{ width: renderedRightPanel === 'rack' ? 360 : isAddPanelExpanded ? 880 : 500, maxWidth: '100%', borderColor: 'var(--border-subtle)' }}
            >
              {renderedRightPanel === 'rack' ? <RackPanel models={rackModels} onModelsChange={setRackModels} /> : <AddPanel
                onClose={() => {
                  setActiveRightPanel('none');
                }}
                onExpandedChange={setIsAddPanelExpanded}
              />}
            </div>}
          </aside>
        </div>
      </div>
    </div>
  );
}


