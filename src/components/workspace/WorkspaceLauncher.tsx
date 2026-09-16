import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Clock,
  ArrowRight,
  Trash2,
  ChevronRight,
} from 'lucide-react';

import butterflyMascot from '../../assets/mascots/butterfly.png';
import crashoutMascot from '../../assets/mascots/crashout.png';
import dripMascot from '../../assets/mascots/drip.png';
import footballMascot from '../../assets/mascots/football.png';
import freeMascot from '../../assets/mascots/free.png';
import meditatingMascot from '../../assets/mascots/meditating.png';
import pcMascot from '../../assets/mascots/pc.png';
import tonyMascot from '../../assets/mascots/tony.png';
import underwaterMascot from '../../assets/mascots/underwater.png';
import zolaMascot from '../../assets/mascots/zola.png';

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}

interface MascotItem {
  id: string;
  name: string;
  image: string;
}

const MASCOTS: MascotItem[] = [
  { id: 'pc', name: 'Workstation', image: pcMascot },
  { id: 'meditating', name: 'Zen', image: meditatingMascot },
  { id: 'drip', name: 'Drip', image: dripMascot },
  { id: 'tony', name: 'Iron Mind', image: tonyMascot },
  { id: 'crashout', name: 'Overclock', image: crashoutMascot },
  { id: 'football', name: 'Striker', image: footballMascot },
  { id: 'underwater', name: 'Deep Dive', image: underwaterMascot },
  { id: 'butterfly', name: 'Evolution', image: butterflyMascot },
  { id: 'free', name: 'Freedom', image: freeMascot },
  { id: 'zola', name: 'Neural King', image: zolaMascot },
];

export const WORKSPACE_QUOTES: string[] = [
  'Code in silence. Let your local models speak.',
  'Zero cloud. Zero telemetry. Infinite peace of mind.',
  '100% local weights. Maximum swagger on your silicon.',
  'Genius, billionaire, local workstation engineer.',
  'When you push 128k context and the VRAM catches fire.',
  'Every token scored directly on your bare metal.',
  'Submerged deep in the high-dimensional latent space.',
  'Transforming raw GPU watts into pure intelligence.',
  'Air-gapped, uncensored, and truly in your command.',
  'Your private neural engine. Your absolute workstation.',
  'No API keys. No rate limits. Just raw compute.',
  'Sovereign intelligence starts at localhost.',
  'Why rent intelligence by the token when you can own the weights?',
  "The cloud is just someone else's computer. This one is yours.",
  'Tokens per second: Maximum. Telemetry: None.',
  'Thinking in Chain-of-Thought, coding in flow state.',
  'Build what you want, when you want, without permission.',
  'Your code never leaves your room.',
  'Running 70B parameters on pure coffee and silicon.',
  'Quantized for speed, tuned for supremacy.',
  'Where true hackers host their own neural nets.',
  'Offline is the ultimate luxury in modern computing.',
  'Cold boots, hot GPUs, zero latency.',
  'Compile. Infer. Iterate. Conquer.',
  'Your thoughts are your own. Keep your models local.',
  'The weights belong to the people.',
  'Turning electricity into reasoning.',
  'No middleman between your prompt and your GPU.',
  'In an age of surveillance, localhost is sanctuary.',
  'Keep calm and overclock the unified memory.',
  'Local RAG: The secret weapon of autonomous coders.',
  'Debugging at 3 AM with an air-gapped reasoning model.',
  'Float16 precision, diamond-grade focus.',
  'Own your silicon, own your future.',
  'Speed of light latency right through PCIe.',
  'Every parameter resident in your own RAM.',
  'Zero rate limits. Unlimited curiosity.',
  'A workstation built for builders, not subscribers.',
  'Open weights, closed doors to big tech.',
  'The best firewall is an unplugged ethernet cable.',
  'When VRAM hits 99%, the real coding begins.',
  'Prompt without boundaries. Build without constraints.',
  'Pure local inference. No third-party eyes.',
  'The quieter you become, the more your GPU hums.',
  'Master the model, master the machine.',
  'Decentralized mind, centralized power.',
  'High throughput, zero audit logs.',
  'Your personal supercomputer on your desk.',
  'From prompt to execution in single-digit milliseconds.',
  'Who needs cloud credits when you have Apple Silicon and RTX?',
  'No credit card required to run your own mind.',
  'The frontier of AI is running on local bare metal.',
  'Ship features while the rest are stuck on rate limit errors.',
  'Autonomous agents unleashed on local ASTs.',
  'Clean code, cold hardware, sharp logic.',
  'Knowledge distilled down to single-digit gigabytes.',
  'Offline workstations build indestructible systems.',
  'Direct memory access to artificial intelligence.',
  'One machine. All models. Absolute control.',
  'Privacy is not a setting. It is an architecture.',
  'Run the heaviest reasoning models right off SSD.',
  'Refactoring a 50,000-line repo with local context.',
  'Uncensored logic for unrestricted creation.',
  'Silicon never lies.',
  'Latency so low it feels like telepathy.',
  'No downtime, no server maintenance, no excuses.',
  'Every matrix multiplication stays in your perimeter.',
  'Local LLMs are the new superpower of indie hackers.',
  'Born to hack. Forced to wait for compilation.',
  'Zero data shared. Zero training on your prompts.',
  'Command line supremacy in the era of intelligence.',
  'The prompt engineering stops when the weights are local.',
  'Unshackle your reasoning from cloud monopolies.',
  'Bypass the cloud queue. Execute instantly.',
  'A coder without local models is like a painter without canvas.',
  'DeepSeek reasoning tokens running at full blast.',
  'The future of software is written in private.',
  'Your local model does not care about network status.',
  'Hardware acceleration tuned for raw developer velocity.',
  'Air-gapped intelligence: The fortress of confidential code.',
  'Memory bandwidth is the currency of the AI era.',
  'Local first. Fast always. Sovereign forever.',
  'Build local, scale global, trust nothing in between.',
  'Feed the context window, harvest the architecture.',
  'The machine spirit obeys only local commands.',
  'Prompt. Diff. Apply. Push.',
  'Turn your terminal into an oracle.',
  'No billing alarms. No surprise invoices.',
  'Own the stack from silicon to UI.',
  'High-entropy prompts, crystal-clear code.',
  'The ultimate developer setup is zero-cloud.',
  'Neural networks humming under your fingertips.',
  'Keep your intellectual property on your own disk.',
  'Code at the speed of thought, infer at the speed of GPU.',
  'Zero telemetry: Because your ideas belong to you.',
  'Transforming coffee into tokens, tokens into software.',
  'Precision engineered for local supremacy.',
  'Run, tinker, break, rebuild—without rate limits.',
  'The most powerful dev environment is fully offline.',
  'Sovereign coders do not ask for API keys.',
  'True speed is PCIe bandwidth, not fiber ping.',
  'Your workstation, your rules, your neural empire.',
  'Code crafted locally, deployed everywhere.',
  'The weights are loaded. The rack is primed. Let us build.',
  'Unit 01: 100% Local. Zero Cloud. Infinite Power.',
  'Never let a server outage halt your momentum.',
  'True privacy is having zero socket connections.',
  'All tokens are computed under your roof.',
  'Architect of your own intelligence.',
  'The local model is the ultimate force multiplier.'
];

function createShuffledDeck(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

const DEFAULT_RECENTS: RecentProject[] = [
  {
    id: 'p-1',
    name: 'unfuse',
    path: '/Users/lichi/unfuse',
    lastOpened: 'Just now',
  },
  {
    id: 'p-2',
    name: 'deepseek-local-rag',
    path: '/Users/lichi/Projects/deepseek-local-rag',
    lastOpened: '2 hours ago',
  },
  {
    id: 'p-3',
    name: 'autonomous-mcp-server',
    path: '/Users/lichi/work/autonomous-mcp-server',
    lastOpened: 'Yesterday',
  },
];

interface WorkspaceLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWorkspace: (project: RecentProject) => void;
  onNewScratchpad: () => void;
}

export const WorkspaceLauncher: React.FC<WorkspaceLauncherProps> = ({
  isOpen,
  onClose,
  onOpenWorkspace,
  onNewScratchpad,
}) => {
  const [currentMascotIndex, setCurrentMascotIndex] = useState(0);
  const [quoteDeck, setQuoteDeck] = useState<number[]>(() => createShuffledDeck(WORKSPACE_QUOTES.length));
  const [currentQuote, setCurrentQuote] = useState<string>(() => WORKSPACE_QUOTES[0]);
  const [fadeAnim, setFadeAnim] = useState(true);

  const [recents, setRecents] = useState<RecentProject[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('unfuse_recent_projects') || localStorage.getItem('unit01_recent_projects');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // fallback
        }
      }
    }
    return DEFAULT_RECENTS;
  });

  const advanceQuoteAndMascot = () => {
    setFadeAnim(false);
    setTimeout(() => {
      // Pick next unique quote from shuffled deck
      setQuoteDeck((prevDeck) => {
        let deck = prevDeck;
        if (deck.length === 0) {
          deck = createShuffledDeck(WORKSPACE_QUOTES.length);
        }
        const nextIdx = deck[0];
        setCurrentQuote(WORKSPACE_QUOTES[nextIdx]);
        return deck.slice(1);
      });

      setCurrentMascotIndex((prev) => (prev + 1) % MASCOTS.length);
      setFadeAnim(true);
    }, 180);
  };

  // Cycle mascots and non-repeating quotes every 5.5s
  useEffect(() => {
    const timer = setInterval(() => {
      advanceQuoteAndMascot();
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('unfuse_recent_projects', JSON.stringify(recents));
    }
  }, [recents]);

  const handleNextMascot = () => {
    advanceQuoteAndMascot();
  };

  const handleOpenFolder = async () => {
    const folderName = 'workspace-core';
    const newProject: RecentProject = {
      id: `p-${Date.now()}`,
      name: folderName,
      path: `/Users/lichi/Projects/${folderName}`,
      lastOpened: 'Just now',
    };
    setRecents((prev) => [newProject, ...prev.filter((p) => p.path !== newProject.path)]);
    onOpenWorkspace(newProject);
  };

  const handleDeleteRecent = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setRecents((prev) => prev.filter((p) => p.id !== id));
  };

  const currentMascot = MASCOTS[currentMascotIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center select-none p-6 sm:p-8 animate-in fade-in duration-200 overflow-y-auto">
      {/* MAIN CONTAINER */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-8 sm:gap-10 my-auto">
        
        {/* CLEAN PIXEL UNFUSE TITLE */}
        <div>
          <h1 className="font-pixel text-4xl sm:text-6xl md:text-7xl font-bold tracking-wider text-white select-none leading-none text-center">
            Unfuse
          </h1>
        </div>

        {/* 2-COLUMN SECTION: LEFT = MASCOT SHOWCASE, RIGHT = ACTIONS & RECENTS */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-1">
          
          {/* ──────────────── LEFT: 10 MASCOTS & QUOTES SHOWCASE (PULLED UP) ──────────────── */}
          <div className="lg:col-span-6 flex flex-col items-center justify-start gap-4 -mt-6 sm:-mt-10 select-none">
            
            {/* MASCOT IMAGE WITH SMOOTH FADE & CLICK TO SKIP (PULLED UP) */}
            <div
              onClick={handleNextMascot}
              className={`flex items-center justify-center cursor-pointer transition-all duration-300 transform ${
                fadeAnim ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              title="Click for next pose"
            >
              <img
                src={currentMascot.image}
                alt={currentMascot.name}
                className="max-h-[360px] w-auto object-contain pointer-events-none"
              />
            </div>

            {/* QUOTE SECTION (PULLED UP UNDER MASCOT) */}
            <div
              className={`w-full text-center px-4 pt-1 transition-all duration-300 ${
                fadeAnim ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <p className="text-sm sm:text-[15px] font-mono text-white/90 leading-relaxed italic">
                "{currentQuote}"
              </p>
            </div>

          </div>

          {/* ──────────────── RIGHT: OPEN / START & RECENT WORKSPACES ──────────────── */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-5 h-full min-h-[500px] pt-10 sm:pt-16">
            
            {/* PRIMARY ACTION BUTTONS (OPEN FOLDER & NEW CHAT) */}
            <div className="grid grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={handleOpenFolder}
                className="p-4 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.98] transition-all flex items-center justify-between font-semibold text-xs cursor-pointer shadow-sm group"
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4 text-black" />
                  <span>Open Folder</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={onNewScratchpad}
                className="p-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white active:scale-[0.98] transition-all flex items-center justify-between text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-white/80" />
                  <span>New Chat</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* RECENT WORKSPACES CONTAINER */}
            <div className="p-6 rounded-2xl bg-black flex flex-col justify-between flex-1 min-h-[380px]">
              <div>
                <div className="relative flex items-center justify-center mb-5">
                  <span className="text-xs font-mono font-semibold text-white/70 uppercase tracking-wider text-center">
                    Recent Workspaces
                  </span>
                  {recents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecents([])}
                      className="absolute right-0 top-0.5 text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {recents.length > 0 ? (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto popup-scroll pr-1">
                    {recents.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => onOpenWorkspace(project)}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FolderOpen className="w-4 h-4 text-white/40 group-hover:text-white transition-colors shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-white truncate">
                              {project.name}
                            </div>
                            <div className="text-[10px] font-mono text-white/40 truncate">
                              {project.path}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[9.5px] font-mono text-white/30">
                            {project.lastOpened}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRecent(e, project.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 transition-all cursor-pointer rounded"
                            title="Remove from recents"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-24 flex flex-col items-center justify-center text-center gap-2 text-white/30">
                    <Clock className="w-5 h-5 opacity-40" />
                    <span className="text-xs font-mono">No recent folders</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
