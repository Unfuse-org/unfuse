import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, PanelsTopLeft, Layers3, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, Grid2X2, Plug, Folder, Logs, NotebookPen, Settings } from 'lucide-react';
import homeMascot from './assets/home-mascot.png';
import { SidebarPanel } from './components/sidebar/SidebarPanel';
import { ChatSession } from './components/sidebar/types';
import { DashboardView } from './components/dashboard/DashboardView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { McpView } from './components/integrations/McpView';
import { McpLogo } from './components/integrations/IntegrationLogos';
import { LibraryView } from './components/library/LibraryView';
import { SettingsView } from './components/settings/SettingsView';
import { ModelLogsView } from './components/settings/ModelLogsView';
import { MemoryView } from './components/settings/MemoryView';
import { RackPanel } from './components/rack/RackPanel';
import { AddPanel } from './components/workspace/AddPanel';
import { LocalModelBlade } from './components/rack/types';
import { MainChatPanel } from './components/chat/MainChatPanel';
import { OnboardingView, readSetup } from './components/onboarding/OnboardingView';
import { WindowControls } from './components/WindowControls';
import { invoke } from '@tauri-apps/api/core';
import { platformHint, useDesktopMenuBar } from './components/DesktopMenus';
import type { DesktopPlatform } from './components/DesktopMenus';


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
  return <Icon size={20} strokeWidth={1.65} aria-hidden="true" />;
}

type AppView = 'home' | 'dashboard' | 'integrations' | 'mcp' | 'library' | 'settings' | 'logs' | 'memory';

export default function App() {
  const [platform, setPlatform] = useState<DesktopPlatform>(platformHint);
  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return;
    let disposed = false;
    void invoke<{ os: string }>('get_system_info').then(info => {
      if (!disposed && ['windows', 'macos', 'linux'].includes(info.os)) setPlatform(info.os as DesktopPlatform);
    }).catch(console.error);
    return () => { disposed = true; };
  }, []);
  const [setup, setSetup] = useState(readSetup);
  const [setupStep, setSetupStep] = useState(0);
  // Temporary: show onboarding on every launch while testing the setup flow.
  const [showSetup, setShowSetup] = useState(true);
  const [logModel, setLogModel] = useState<string | null>(null);
  const [navigation, setNavigation] = useState<{ entries: AppView[]; index: number }>({ entries: ['dashboard'], index: 0 });
  const activeNav = navigation.entries[navigation.index];
  const setActiveNav = (view: AppView) => setNavigation(current => current.entries[current.index] === view ? current : {
    entries: [...current.entries.slice(0, current.index + 1), view], index: current.index + 1,
  });
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

  const [focusLayout, setFocusLayout] = useState<{ sidebar: boolean; panel: 'none' | 'rack' | 'add' } | null>(null);
  const toggleFocus = () => {
    if (focusLayout) {
      setIsChatSidebarOpen(focusLayout.sidebar);
      setActiveRightPanel(focusLayout.panel);
      setFocusLayout(null);
    } else {
      setFocusLayout({ sidebar: isChatSidebarOpen, panel: activeRightPanel });
      setIsChatSidebarOpen(false);
      setActiveRightPanel('none');
    }
  };
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState('');
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);
  const [rackModels, setRackModels] = useState<LocalModelBlade[]>(() => setup.model ? [setup.model] : []);
  const sidebarVisible = activeNav === 'home' && isChatSidebarOpen && !focusLayout;

  const toggleSidebar = () => {
    if (focusLayout) { toggleFocus(); return; }
    if (activeNav !== 'home') { setActiveNav('home'); setIsChatSidebarOpen(true); }
    else setIsChatSidebarOpen(open => !open);
  };
  const menuBar = useDesktopMenuBar(platform, !showSetup, action => {
    if (action === 'new-chat') {
      const session: ChatSession = { id: crypto.randomUUID(), title: 'New Conversation', updatedAt: new Date(), messageCount: 0 };
      setChatSessions(current => [session, ...current]); setActiveChatId(session.id); setActiveNav('home');
    } else if (action === 'settings') setActiveNav('settings');
    else if (action === 'sidebar') toggleSidebar();
    else if (action === 'rack') setActiveRightPanel(current => current === 'rack' ? 'none' : 'rack');
    else if (action === 'focus') toggleFocus();
    else if (action === 'setup') { setSetupStep(0); setShowSetup(true); }
  });

  if (showSetup) return <OnboardingView platform={platform} initial={setup} initialStep={setupStep} onComplete={preferences => {
    setSetup(preferences);
    if (preferences.model) setRackModels(current => [preferences.model!, ...current.filter(model => model.id !== preferences.model!.id)]);
    setShowSetup(false);
    setNavigation({ entries: ['home'], index: 0 });
  }} />;


  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden select-none font-sans"
      style={{
        backgroundColor: 'var(--bg-header)',
        color: 'var(--text-main)',
      }}
    >
      {/* 1. TOP BAR: INDEPENDENT, PROPER EDGED, SAME SIZE (40px) */}
      <header
        className={`h-[40px] w-full flex items-center justify-between shrink-0 ${platform === 'macos' ? 'pl-[88px]' : 'pl-1'}`}
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-subtle)',
        }}
        data-tauri-drag-region
      >
        <div className="flex h-full shrink-0 items-center gap-0.5">
          <button aria-label="Go back" title="Go back" disabled={navigation.index === 0}
            onClick={() => setNavigation(current => ({ ...current, index: Math.max(0, current.index - 1) }))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent">
            <ArrowLeft size={16} strokeWidth={1.65} />
          </button>
          <button aria-label="Go forward" title="Go forward" disabled={navigation.index === navigation.entries.length - 1}
            onClick={() => setNavigation(current => ({ ...current, index: Math.min(current.entries.length - 1, current.index + 1) }))}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:hover:bg-transparent">
            <ArrowRight size={16} strokeWidth={1.65} />
          </button>
          <button
            onClick={toggleSidebar}
            aria-label={sidebarVisible ? 'Collapse chat sidebar' : 'Expand chat sidebar'}
            title={sidebarVisible ? 'Collapse chat sidebar' : 'Expand chat sidebar'}
            aria-expanded={sidebarVisible}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)]"
          >
            {sidebarVisible ? <PanelLeftClose size={18} strokeWidth={1.65} /> : <PanelLeftOpen size={18} strokeWidth={1.65} />}
          </button>
          {menuBar}
        </div>
        <div data-tauri-drag-region className="flex-1 h-full" />
        <div className="flex items-center gap-1.5 relative">
          {/* 1) ADD SYMBOL */}
          <button
            onClick={() => {
              setActiveRightPanel((curr) => {
                return curr === 'add' ? 'none' : 'add';
              });
            }}
            className="-translate-y-[2px] w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeRightPanel === 'add' ? 'var(--bg-active)' : 'transparent',
              color: 'var(--text-main)',
            }}
            title="Workspace Tools (Terminal, Files, Changes, Library)"
          >
            <PanelsTopLeft size={18} strokeWidth={1.65} />
          </button>

          {/* 2) RACK SYMBOL */}
          <button
            onClick={() => setActiveRightPanel((curr) => (curr === 'rack' ? 'none' : 'rack'))}
            className="-translate-y-[2px] w-8 h-8 flex items-center justify-center rounded-md transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeRightPanel === 'rack' ? 'var(--bg-active)' : 'transparent',
              color: 'var(--text-main)',
            }}
            title="Model Rack"
          >
            <Layers3 size={18} strokeWidth={1.65} />
          </button>

          <button
            onClick={toggleFocus}
            aria-label={focusLayout ? 'Exit focus mode' : 'Enter focus mode'}
            aria-pressed={!!focusLayout}
            title={focusLayout ? 'Exit focus mode' : 'Focus mode'}
            className="-translate-y-[2px] w-8 h-8 flex items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-surface-hover)]"
            style={{ backgroundColor: focusLayout ? 'var(--bg-active)' : 'transparent', color: 'var(--text-main)' }}
          >
            {focusLayout ? <Minimize2 size={18} strokeWidth={1.65} /> : <Maximize2 size={18} strokeWidth={1.65} />}
          </button>
        </div>
        {platform === 'windows' && <div className="ml-3 border-l border-[var(--border-subtle)]"><WindowControls platform={platform} /></div>}
      </header>

      {/* 2. LOWER SECTION: INDEPENDENT SIDE BAR + PROPER EDGED WORKSPACE */}
      <div className="flex-1 flex flex-row min-h-0">
        {/* LEFT SIDE RAIL: INDEPENDENT, PROPER EDGED, 48px rail */}
        <aside
          className={`${focusLayout ? 'hidden' : 'flex'} w-[48px] flex-col items-center gap-2 shrink-0 pt-4 pb-3`}
          style={{
            backgroundColor: 'var(--bg-rail)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* 1) HOME BUTTON */}
          <button
            onClick={() => setActiveNav('home')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'home' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'home' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Home"
          >
            <span
              aria-hidden="true"
              className="w-5 h-5 shrink-0 bg-[var(--text-main)]"
              style={{
                maskImage: `url(${homeMascot})`,
                maskMode: 'luminance',
                maskSize: '145%',
                maskPosition: 'center',
                maskRepeat: 'no-repeat',
              }}
            />
          </button>

          {/* 2) DASHBOARD BUTTON */}
          <button
            onClick={() => setActiveNav('dashboard')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: activeNav === 'dashboard' ? 'var(--bg-active)' : 'transparent',
              color: activeNav === 'dashboard' ? 'var(--text-main)' : 'var(--text-muted)',
            }}
            title="Dashboard"
          >
            <NavigationIcon name="dashboard" />
          </button>

          {([{ id: 'library', label: 'Library' }, { id: 'memory', label: 'Memory' }, { id: 'integrations', label: 'Integrations' }, { id: 'logs', label: 'Logs' }] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setActiveNav(id)} title={label} aria-label={label} aria-current={activeNav === id ? 'page' : undefined}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
              style={{ backgroundColor: activeNav === id ? 'var(--bg-active)' : 'transparent', color: activeNav === id ? 'var(--text-main)' : 'var(--text-muted)' }}>
              <NavigationIcon name={id} />
            </button>
          ))}

          <button onClick={() => setActiveNav('mcp')} title="MCP servers" aria-label="MCP servers" aria-current={activeNav === 'mcp' ? 'page' : undefined}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
            style={{ backgroundColor: activeNav === 'mcp' ? 'var(--bg-active)' : 'transparent', color: activeNav === 'mcp' ? 'var(--text-main)' : 'var(--text-muted)' }}>
            <McpLogo size={20} />
          </button>

          {/* 5) SETTINGS BUTTON */}
          <button
            onClick={() => setActiveNav('settings')}
            className="mt-auto w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)]"
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
        <div className="workspace-frames flex-1 h-full flex flex-row min-w-0" style={{ backgroundColor: 'var(--bg-header)' }}>
          {/* MAIN CANVAS CONTENT */}
          <div className="workspace-canvas flex-1 h-full overflow-hidden flex flex-col min-w-0 rounded-tl-[14px]">
            {activeNav === 'home' && (
              <div className="workspace-home flex-1 h-full flex flex-row min-w-0" style={{ backgroundColor: 'var(--bg-header)' }}>
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
                  <div className="w-72 h-full"><SidebarPanel sessions={chatSessions} activeSessionId={activeChatId}
                    onSelectSession={setActiveChatId} onUpdateSessions={setChatSessions} /></div>
                </aside>

                {/* MAIN PANEL */}
                <div className="flex min-w-0 flex-1 flex-col">
                <MainChatPanel
                  sessionId={activeChatId}
                  models={rackModels}
                  onOpenRack={() => setActiveRightPanel('rack')}
                />
                </div>
              </div>
            )}
            {activeNav === 'dashboard' && <DashboardView models={rackModels} onOpenRack={() => setActiveRightPanel('rack')} onOpenLogs={(model) => { setLogModel(model); setActiveNav('logs'); }} />}
            {activeNav === 'integrations' && <IntegrationsView />}
            {activeNav === 'mcp' && <McpView />}
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
              className="h-full flex flex-col shrink-0"
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


