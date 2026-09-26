import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SidebarPanel, INITIAL_SESSIONS } from './components/sidebar/SidebarPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { RackPanel } from './components/rack/RackPanel';
import { ChatSession } from './components/sidebar/types';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { WorkspaceLauncher, RecentProject } from './components/workspace/WorkspaceLauncher';
import { LocalModelBlade } from './components/rack/types';

export default function App() {
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightRackOpen, setIsRightRackOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>('s-main');
  const [rackModels, setRackModels] = useState<LocalModelBlade[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(true);
  const [isLauncherOpen, setIsLauncherOpen] = useState<boolean>(false);

  // DRAGGABLE PANEL WIDTHS (WITH PERSISTENCE & BOUNDARIES)
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    const saved = localStorage.getItem('unfuse_left_sidebar_width');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 256, 170), 450) : 256;
  });
  const [rightWidth, setRightWidth] = useState<number>(() => {
    const saved = localStorage.getItem('unfuse_right_rack_width');
    return saved ? Math.min(Math.max(parseInt(saved, 10) || 320, 240), 560) : 320;
  });

  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const isDraggingLeftRef = useRef(false);
  const isDraggingRightRef = useRef(false);

  useEffect(() => {
    isDraggingLeftRef.current = isDraggingLeft;
  }, [isDraggingLeft]);

  useEffect(() => {
    isDraggingRightRef.current = isDraggingRight;
  }, [isDraggingRight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeftRef.current) {
        const clampedWidth = Math.min(Math.max(e.clientX, 170), 450);
        setLeftWidth(clampedWidth);
      } else if (isDraggingRightRef.current) {
        const clampedWidth = Math.min(Math.max(window.innerWidth - e.clientX, 240), 560);
        setRightWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeftRef.current) {
        setIsDraggingLeft(false);
        setLeftWidth((w) => {
          localStorage.setItem('unfuse_left_sidebar_width', w.toString());
          return w;
        });
      }
      if (isDraggingRightRef.current) {
        setIsDraggingRight(false);
        setRightWidth((w) => {
          localStorage.setItem('unfuse_right_rack_width', w.toString());
          return w;
        });
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleStartDragLeft = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleStartDragRight = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleOpenOnboarding = () => setIsOnboardingOpen(true);
    const handleOpenLauncher = () => setIsLauncherOpen(true);
    window.addEventListener('open-onboarding', handleOpenOnboarding);
    window.addEventListener('open-launcher', handleOpenLauncher);
    return () => {
      window.removeEventListener('open-onboarding', handleOpenOnboarding);
      window.removeEventListener('open-launcher', handleOpenLauncher);
    };
  }, []);

  const handleOpenWorkspace = (project: RecentProject) => {
    setIsLauncherOpen(false);
  };

  const handleNewScratchpad = () => {
    setIsLauncherOpen(false);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const activeRackModel = rackModels.find(m => m.status === 'active') || rackModels[0] || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-transparent select-none relative font-sans">
      {/* 1. LEFT PANEL: DEEP ZINC-950 BASE LAYER (#09090b) */}
      <aside
        style={{ width: isLeftSidebarOpen ? `${leftWidth}px` : 0 }}
        className={`flex-shrink-0 bg-[#09090b] border-r border-[#1e1e24] overflow-hidden flex flex-col ${
          isDraggingLeft ? 'transition-none' : 'transition-[width,opacity] duration-200 ease-in-out'
        } ${isLeftSidebarOpen ? 'opacity-100' : 'opacity-0 -translate-x-full pointer-events-none'}`}
      >
        <SidebarPanel
          activeSessionId={activeSessionId}
          sessions={sessions}
          onSelectSession={(id) => setActiveSessionId(id)}
          onUpdateSessions={(newSessions) => {
            setSessions(newSessions);
          }}
          onNewChat={() => {}}
        />
      </aside>

      {/* LEFT DRAG RESIZER */}
      {isLeftSidebarOpen && (
        <div
          onMouseDown={handleStartDragLeft}
          className={`relative w-1 -mx-0.5 cursor-col-resize z-30 shrink-0 group flex items-center justify-center transition-colors ${
            isDraggingLeft ? 'bg-white/40' : 'bg-transparent hover:bg-white/20'
          }`}
          title="Drag to resize sidebar"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* 2. MIDDLE PANEL: CLEAN OBSIDIAN WORKSPACE CANVAS (#0d0d10) */}
      <main className="flex-1 bg-[#0d0d10] flex flex-col min-w-0 overflow-hidden border-r border-[#1e1e24]">
        <ChatPanel
          sessionId={activeSessionId}
          activeSessionTitle={activeSession?.title}
          isLeftSidebarOpen={isLeftSidebarOpen}
          isRightRackOpen={isRightRackOpen}
          onToggleLeftSidebar={() => setIsLeftSidebarOpen((prev) => !prev)}
          onToggleRightRack={() => setIsRightRackOpen((prev) => !prev)}
          activeModel={activeRackModel}
          rackModels={rackModels}
        />
      </main>

      {/* RIGHT DRAG RESIZER */}
      {isRightRackOpen && (
        <div
          onMouseDown={handleStartDragRight}
          className={`relative w-1 -mx-0.5 cursor-col-resize z-30 shrink-0 group flex items-center justify-center transition-colors ${
            isDraggingRight ? 'bg-white/40' : 'bg-transparent hover:bg-white/20'
          }`}
          title="Drag to resize rack"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* 3. RIGHT PANEL: ELEVATED TOOL SURFACE (#121215) */}
      <aside
        style={{ width: isRightRackOpen ? `${rightWidth}px` : 0 }}
        className={`flex-shrink-0 bg-[#121215] flex flex-col min-w-0 overflow-hidden ${
          isDraggingRight ? 'transition-none' : 'transition-[width,opacity] duration-200 ease-in-out'
        } ${isRightRackOpen ? 'opacity-100' : 'opacity-0 translate-x-full pointer-events-none'}`}
      >
        <RackPanel models={rackModels} onModelsChange={setRackModels} />
      </aside>

      {/* 4. WORKSPACE LAUNCHER SCREEN */}
      <WorkspaceLauncher
        isOpen={isLauncherOpen && !isOnboardingOpen}
        onClose={() => setIsLauncherOpen(false)}
        onOpenWorkspace={handleOpenWorkspace}
        onNewScratchpad={handleNewScratchpad}
      />

      {/* 5. FIRST-RUN ONBOARDING & WELCOME MODAL */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          setIsLauncherOpen(true);
        }}
      />
    </div>
  );
}
