import React, { useState, useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { Message, ActiveModelTarget, ClarificationRequest } from './types';
import { ServiceId } from '../../engine/integrations/types';
import {
  getServiceState,
  getDefaultWebSearchProvider,
} from '../../engine/integrations/integrationsManager';
import { IntegrationsModal } from '../integrations/IntegrationsModal';
import { ServiceConnectModal } from '../integrations/ServiceConnectModal';
import { BtopTelemetryPopover } from './BtopTelemetryPopover';

interface ChatPanelProps {
  sessionId?: string;
  activeSessionTitle?: string;
  isLeftSidebarOpen?: boolean;
  isRightRackOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightRack?: () => void;
  loadedRackModels?: ActiveModelTarget[];
}

export const LeftPanelToggleIcon: React.FC<{ isOpen?: boolean; className?: string }> = ({
  isOpen = true,
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <line
      x1="5.5"
      y1="2.5"
      x2="5.5"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    {isOpen && (
      <rect
        x="2.25"
        y="3.25"
        width="2.5"
        height="9.5"
        fill="currentColor"
        opacity="0.3"
        rx="0.75"
      />
    )}
  </svg>
);

export const RightPanelToggleIcon: React.FC<{ isOpen?: boolean; className?: string }> = ({
  isOpen = true,
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <line
      x1="10.5"
      y1="2.5"
      x2="10.5"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    {isOpen && (
      <rect
        x="11.25"
        y="3.25"
        width="2.5"
        height="9.5"
        fill="currentColor"
        opacity="0.3"
        rx="0.75"
      />
    )}
  </svg>
);

const SAMPLE_MODELS: ActiveModelTarget[] = [
  {
    id: 'qwen-32b',
    name: 'qwen2.5-coder:32b',
    displayName: 'Qwen 2.5 Coder 32B',
    provider: 'ollama',
    port: 11434,
    family: 'qwen',
  },
  {
    id: 'deepseek-14b',
    name: 'deepseek-r1:14b',
    displayName: 'DeepSeek R1 14B',
    provider: 'lmstudio',
    port: 1234,
    family: 'deepseek',
  },
  {
    id: 'llama-70b',
    name: 'llama3.3:70b',
    displayName: 'Meta Llama 3.3 70B',
    provider: 'ollama',
    port: 11434,
    family: 'llama',
  },
];

const INITIAL_MESSAGES: Message[] = [
  // ==========================================
  // TURN 1: MODEL 1 - @qwen (QWEN 2.5 CODER 32B)
  // Next.js 15 Product Website Scaffolding & Glassmorphic Design System
  // ==========================================
  {
    id: 'u-turn-1',
    role: 'user',
    content: "@qwen Build a high-converting, modern dark-mode landing page website for our product 'KubePulse' (Local Edge AI & Kubernetes Observability Platform). Scaffold with Next.js 15 App Router, Tailwind CSS, Lucide icons, and glassmorphic hero + pricing matrix. Search web for latest Next.js 15 streaming SSR patterns.",
    timestamp: '17:20',
  },
  {
    id: 'a-turn-1',
    role: 'assistant',
    modelName: 'Qwen 2.5 Coder 32B',
    modelFamily: 'qwen',
    provider: 'ollama',
    port: 11434,
    speedTokPerSec: 58.4,
    timestamp: '17:21',
    toolCalls: [
      {
        id: 't-1a',
        name: 'brave_web_search',
        args: {
          query: 'nextjs 15 app router glassmorphism landing page tailwind',
        },
        result: 'Found 8 search results · Best match: "Next.js 15 App Router Dark Modern Component Architecture"',
        status: 'completed',
        durationMs: 180,
        sources: [
          {
            title: 'Next.js 15 App Router & React 19 Docs',
            url: 'https://nextjs.org/docs/app',
            domain: 'nextjs.org',
            snippet: 'Zero-config streaming SSR with React 19 Server Components and Suspense boundaries.',
          },
          {
            title: 'Tailwind CSS v4 Modern Glassmorphism Guide',
            url: 'https://tailwindcss.com/docs/backdrop-filter',
            domain: 'tailwindcss.com',
            snippet: 'Hardware-accelerated backdrop-blur filters, dynamic gradients, and CSS container queries.',
          },
        ],
      },
      {
        id: 't-1b',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/package.json',
        },
        result: 'Created kubepulse-web/package.json (1.4 KB · Next.js 15, React 19, Lucide, Tailwind)',
        status: 'completed',
        durationMs: 8,
      },
      {
        id: 't-1c',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/app/globals.css',
        },
        result: 'Created kubepulse-web/app/globals.css (2.1 KB · Cyberpunk aurora glow & custom scrollbars)',
        status: 'completed',
        durationMs: 6,
      },
      {
        id: 't-1d',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/components/HeroSection.tsx',
        },
        result: 'Created kubepulse-web/components/HeroSection.tsx (4.2 KB · Live cluster ping, CTA badge, interactive terminal preview)',
        status: 'completed',
        durationMs: 12,
      },
      {
        id: 't-1e',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/components/PricingMatrix.tsx',
        },
        result: 'Created kubepulse-web/components/PricingMatrix.tsx (3.8 KB · Developer, Team, Enterprise tier matrix with monthly/annual toggle)',
        status: 'completed',
        durationMs: 10,
      },
      {
        id: 't-1f',
        name: 'run_command',
        args: {
          command: 'cd kubepulse-web && pnpm install && pnpm build',
        },
        result: '✓ Compiled / (Static 14 pages) in 1.42s · 0 lint errors · 0 TypeScript type errors',
        status: 'completed',
        durationMs: 460,
      },
    ],
    content: `I have scaffolded the complete product website for **KubePulse** using **Next.js 15**, **React 19 Server Components**, and **Tailwind CSS**.

### What Was Built:
1. **Glassmorphic Hero Banner (\`HeroSection.tsx\`)**:
   - Dynamic live telemetry pill showing *'12,400+ Edge Pods Active'*.
   - High-contrast primary CTA *'Start Free Cluster'* with secondary documentation button.
   - Interactive code terminal tab demonstrating zero-cloud eBPF tracing command.

2. **Enterprise Pricing Matrix (\`PricingMatrix.tsx\`)**:
   - **Hacker / Free**: $0/mo for local single-node blades.
   - **Pro Team**: $49/mo with multi-region cluster federation.
   - **Enterprise**: Custom air-gapped deployments & dedicated GPU acceleration.

3. **Core Web Vitals Optimized**: Zero layout shifts (CLS: 0.00), fast sub-second Largest Contentful Paint (LCP: 0.4s).`,
  },

  // ==========================================
  // TURN 2: MODEL 2 - @deepseek (DEEPSEEK R1 14B)
  // Deep Reasoning & Interactive 3D WebGL Cluster Visualizer
  // ==========================================
  {
    id: 'u-turn-2',
    role: 'user',
    content: '@deepseek The hero section needs an interactive 3D cluster node topology visualizer with real-time particle routing and 60fps GPU shaders. How do we build this with zero CPU jank?',
    timestamp: '17:23',
  },
  {
    id: 'a-turn-2',
    role: 'assistant',
    modelName: 'DeepSeek R1 14B',
    modelFamily: 'deepseek',
    provider: 'lmstudio',
    port: 1234,
    speedTokPerSec: 41.2,
    timestamp: '17:23',
    thought: `The user wants an interactive 3D cluster topology visualizer in the product hero section. Rendering thousands of edge nodes with traditional DOM nodes or unbatched Canvas2D draw calls causes heavy CPU main-thread blocking and frame drops during user scrolling.

To achieve continuous 60fps / 120Hz smooth rendering with zero memory leaks:
1. Use WebGL / Three.js with \`InstancedMesh\` to render 2,500 interconnected cluster nodes in a single GPU draw call.
2. Implement custom GLSL vertex and fragment shaders for dynamic pulsating energy pulses along Kubernetes edge links.
3. Use \`requestAnimationFrame\` with delta-time clamping and attach pointer-events raycasting only on mousemove throttling (16ms).
4. Build a progressive fallback detection for lower-end devices (WebGL2 -> WebGL1 -> Canvas2D).

Let's inspect the hero section layout, generate \`ClusterCanvas3D.tsx\`, patch \`app/page.tsx\`, and persist the shader topology into local MCP memory.`,
    thoughtDurationSec: 5.8,
    toolCalls: [
      {
        id: 't-2a',
        name: 'read_file',
        args: {
          path: 'kubepulse-web/components/HeroSection.tsx',
          startLine: 1,
          endLine: 40,
        },
        result: 'Read 40 lines from kubepulse-web/components/HeroSection.tsx (1.6 KB)',
        status: 'completed',
        durationMs: 5,
      },
      {
        id: 't-2b',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/components/ClusterCanvas3D.tsx',
        },
        result: 'Created kubepulse-web/components/ClusterCanvas3D.tsx (5.1 KB · GPU InstancedMesh & custom GLSL vertex shader)',
        status: 'completed',
        durationMs: 14,
      },
      {
        id: 't-2c',
        name: 'patch_file',
        args: {
          path: 'kubepulse-web/app/page.tsx',
          instruction: 'Embed dynamic ClusterCanvas3D with SSR Suspense boundary and ambient glow backdrop',
        },
        result: 'Patched 24 lines in kubepulse-web/app/page.tsx (Myers AST diff applied cleanly)',
        status: 'completed',
        durationMs: 11,
      },
      {
        id: 't-2d',
        name: 'run_command',
        args: {
          command: 'pnpm test -- --run components/ClusterCanvas3D.test.tsx',
        },
        result: '✓ 12 unit tests passed (WebGL context initialization, buffer deallocation, 0 memory leaks)',
        status: 'completed',
        durationMs: 180,
      },
      {
        id: 't-2e',
        name: 'mcp_memory_create_entities',
        args: {
          entities: ['KubePulse_3D_Topology', 'InstancedMesh_Shader', 'Edge_Node_Visualizer'],
        },
        result: 'Stored 3 architecture entities with 4 bidirectional relationships in local MCP memory',
        status: 'completed',
        durationMs: 25,
      },
    ],
    content: `I have implemented the **Interactive 3D Cluster Topology Visualizer** (\`ClusterCanvas3D.tsx\`) with dedicated GPU hardware acceleration:

### Technical Highlights:
* **GPU InstancedMesh Architecture**: Renders 2,500 interconnected Kubernetes pods and gateway nodes in **1 single draw call**, reducing CPU overhead to < 2%.
* **Custom GLSL Pulse Shaders**: Real-time packet routing animations calculated directly inside GPU fragment shaders without garbage collection overhead.
* **Responsive Mouse Parallax & Dynamic LOD**: Smooth inertia damping on pointer hover with automatic Level-of-Detail scaling for mobile viewports.`,
  },

  // ==========================================
  // TURN 3: MODEL 3 - @llama (META LLAMA 3.3 70B)
  // PostgreSQL Waitlist API, Linear Task & GitHub PR Release
  // ==========================================
  {
    id: 'u-turn-3',
    role: 'user',
    content: '@llama Hook up PostgreSQL waitlist signups with rate limiting, verify Sentry exception reporting, create a Linear issue for Stripe checkout integration, and publish the GitHub PR.',
    timestamp: '17:25',
  },
  {
    id: 'a-turn-3',
    role: 'assistant',
    modelName: 'Meta Llama 3.3 70B',
    modelFamily: 'llama',
    provider: 'ollama',
    port: 11434,
    speedTokPerSec: 32.8,
    timestamp: '17:25',
    toolCalls: [
      {
        id: 't-3a',
        name: 'postgres_query',
        args: {
          query: 'CREATE TABLE IF NOT EXISTS waitlist_leads (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(255) UNIQUE NOT NULL, company VARCHAR(100), plan_tier VARCHAR(50) DEFAULT \'pro\', created_at TIMESTAMPTZ DEFAULT NOW());',
        },
        result: 'Table `waitlist_leads` created with unique email index and timestamp partitioning in local PostgreSQL',
        status: 'completed',
        durationMs: 6,
      },
      {
        id: 't-3b',
        name: 'write_file',
        args: {
          path: 'kubepulse-web/app/api/waitlist/route.ts',
        },
        result: 'Created kubepulse-web/app/api/waitlist/route.ts (2.3 KB · Zod validation, token bucket rate limiter, PostgreSQL insert)',
        status: 'completed',
        durationMs: 8,
      },
      {
        id: 't-3c',
        name: 'sentry_fetch_issues',
        args: {
          project: 'kubepulse-landing',
          query: 'is:unresolved level:error',
        },
        result: '0 unresolved exceptions · All API routes and client hydration verified healthy',
        status: 'completed',
        durationMs: 19,
      },
      {
        id: 't-3d',
        name: 'linear_create_issue',
        args: {
          title: 'Implement Stripe Checkout & Customer Portal for Pro Tier Subscriptions',
        },
        result: 'Created Linear Issue KUB-302 in "Website Launch" cycle',
        status: 'completed',
        durationMs: 88,
      },
      {
        id: 't-3e',
        name: 'run_command',
        args: {
          command: 'git add . && git commit -m "feat: complete kubepulse product website with 3d cluster hero and postgres waitlist api"',
        },
        result: '[main c8e41a9] feat: complete kubepulse product website with 3d cluster hero and postgres waitlist api · 7 files changed, 482 insertions(+)',
        status: 'completed',
        durationMs: 28,
      },
      {
        id: 't-3f',
        name: 'run_command',
        args: {
          command: 'gh pr create --title "feat: launch kubepulse product website" --body "Closes KUB-302 with Next.js 15, 3D WebGL hero, and Postgres waitlist API."',
        },
        result: 'Created Pull Request #12: https://github.com/unfuse/kubepulse-web/pull/12',
        status: 'pending',
      },
    ],
    content: `All production systems, database migrations, backlog tickets, and version control checkpoints are configured:

* **PostgreSQL Waitlist Engine**: Provisioned \`waitlist_leads\` table with strict Zod schema validation and token bucket rate limiting on \`/api/waitlist\`.
* **Telemetry & Crash Free Rate**: Verified 100% crash-free sessions in Sentry monitoring.
* **Linear Issue Tracking**: Created **[KUB-302: Implement Stripe Checkout & Customer Portal](https://linear.app)**.
* **Git Version Control**: Committed changeset \`c8e41a9\` (*feat: complete kubepulse product website with 3d cluster hero and postgres waitlist api*).`,
  },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeSessionTitle,
  isLeftSidebarOpen = true,
  isRightRackOpen = true,
  onToggleLeftSidebar,
  onToggleRightRack,
  loadedRackModels = SAMPLE_MODELS,
}) => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [activeModel, setActiveModel] = useState<ActiveModelTarget>(loadedRackModels[0] || SAMPLE_MODELS[0]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [activeClarification, setActiveClarification] = useState<ClarificationRequest | null>(null);

  const handleClarificationSubmit = (response: { selectedOptions: string[]; customText?: string }) => {
    if (!activeClarification) return;

    let answerText = '';
    if (response.customText) {
      answerText = response.customText;
    } else {
      const selectedLabels = activeClarification.options
        .filter((o) => response.selectedOptions.includes(o.id))
        .map((o) => o.label);
      answerText = selectedLabels.join(', ');
    }

    // Find the exact model that asked the clarification
    const queriedModel =
      loadedRackModels.find((m) => m.family === activeClarification.modelFamily) ||
      SAMPLE_MODELS.find((m) => m.family === activeClarification.modelFamily) ||
      activeModel;

    setActiveClarification(null);
    handleSendMessage(`Clarification: Use ${answerText}`, queriedModel);
  };

  const [integrationsModalTab, setIntegrationsModalTab] = useState<'native' | 'mcp'>('native');
  const [activeServiceConnectId, setActiveServiceConnectId] = useState<ServiceId | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSendMessage = (content: string, targetModel?: ActiveModelTarget) => {
    let chosenModel = targetModel || activeModel;
    const lower = content.toLowerCase().trim();

    // 1. Detect exact model tagged with @
    if (lower.includes('@qwen') || lower.includes('@qwen2.5')) {
      const found = loadedRackModels.find((m) => m.family === 'qwen') || SAMPLE_MODELS[0];
      if (found) chosenModel = found;
    } else if (lower.includes('@deepseek') || lower.includes('@deepseek-r1')) {
      const found = loadedRackModels.find((m) => m.family === 'deepseek') || SAMPLE_MODELS[1];
      if (found) chosenModel = found;
    } else if (lower.includes('@llama') || lower.includes('@llama3')) {
      const found = loadedRackModels.find((m) => m.family === 'llama') || SAMPLE_MODELS[2];
      if (found) chosenModel = found;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const isReasoning = chosenModel.family === 'deepseek';
    const isClarificationResponse = content.startsWith('Clarification:');
    const isCommand = lower.startsWith('#');

    // 2. ONLY Trigger clarification when user asks an architectural or strategy query to that model
    const triggersClarification =
      !isClarificationResponse &&
      !isCommand &&
      (lower.includes('how') ||
        lower.includes('build') ||
        lower.includes('implement') ||
        lower.includes('optimize') ||
        lower.includes('scaffold') ||
        lower.includes('buffer') ||
        lower.includes('stream') ||
        lower.includes('design') ||
        lower.includes('choice') ||
        lower.includes('clarif') ||
        lower.includes('question'));

    if (triggersClarification) {
      setTimeout(() => {
        setIsStreaming(false);

        if (chosenModel.family === 'deepseek') {
          setActiveClarification({
            id: `clarify-deepseek-${Date.now()}`,
            modelName: chosenModel.displayName,
            modelFamily: 'deepseek',
            question: 'How should we handle Tokio Docker event stream backpressure under heavy container log bursts?',
            options: [
              {
                id: 'opt-ring-buffer',
                label: 'Circular Ring Buffer (Bounded mpsc + O(1) Fixed VecDeque)',
                description: 'Zero allocations on 60fps render tick, drops oldest logs on burst',
                recommended: true,
              },
              {
                id: 'opt-rayon-pool',
                label: 'Rayon Background Worker Pool',
                description: 'Offloads JSON log parsing to dedicated worker threads',
              },
              {
                id: 'opt-unbounded-stream',
                label: 'Unbounded tokio::sync::broadcast',
                description: 'Preserves 100% telemetry history with dynamic memory growth',
              },
            ],
            allowCustomInput: true,
            isMultiSelect: false,
          });
        } else if (chosenModel.family === 'qwen') {
          setActiveClarification({
            id: `clarify-qwen-${Date.now()}`,
            modelName: chosenModel.displayName,
            modelFamily: 'qwen',
            question: 'Which terminal backend and event loop model should Qwen 2.5 Coder scaffold for Ratatui?',
            options: [
              {
                id: 'opt-crossterm-async',
                label: 'Crossterm EventStream + Tokio Async',
                description: 'Non-blocking 60fps render tick decoupled from Docker socket IO',
                recommended: true,
              },
              {
                id: 'opt-termion',
                label: 'Termion Raw Mode Synchronous',
                description: 'Minimal zero-dependency Unix terminal driver',
              },
              {
                id: 'opt-pancurses',
                label: 'Pancurses C-FFI Bindings',
                description: 'Legacy curses emulation with wide terminal support',
              },
            ],
            allowCustomInput: true,
            isMultiSelect: false,
          });
        } else {
          setActiveClarification({
            id: `clarify-llama-${Date.now()}`,
            modelName: chosenModel.displayName,
            modelFamily: chosenModel.family,
            question: `How would you like ${chosenModel.displayName} to structure telemetry verification and issue tracking?`,
            options: [
              {
                id: 'opt-linear-postgres',
                label: 'PostgreSQL Telemetry + Linear Sprint Backlog',
                description: 'Verify snapshots in PostgreSQL and open a Linear issue',
                recommended: true,
              },
              {
                id: 'opt-github-sqlite',
                label: 'SQLite Local DB + GitHub PR Creation',
                description: 'Embedded SQLite table introspection and draft PR',
              },
              {
                id: 'opt-raw-git',
                label: 'Local Git Commit Only',
                description: 'Minimal version control commit without cloud tracker hooks',
              },
            ],
            allowCustomInput: true,
            isMultiSelect: false,
          });
        }
      }, 400);
      return;
    }

    // 1. Check for specific integration commands
    if (lower.startsWith('#github')) {
      const ghState = getServiceState('github');
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 56.2,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Invoking GitHub VCS integration adapter
• Authenticating via local Personal Access Token
• Querying active repository: ${ghState.config.defaultRepo || 'lichi/unfuse'}`,
          thoughtDurationSec: 0.9,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'github_api',
              args: {
                action: 'list_pull_requests',
                repo: ghState.config.defaultRepo || 'lichi/unfuse',
                state: 'open',
              },
              result: ghState.isConnected
                ? `Fetched 3 open Pull Requests from ${ghState.config.defaultRepo || 'lichi/unfuse'}`
                : 'GitHub not configured. Using local Git branch context.',
              status: 'completed',
              durationMs: 18,
            },
          ],
          content: ghState.isConnected
            ? `Here are the active pull requests from **${ghState.config.defaultRepo || 'lichi/unfuse'}**:

1. **PR #42**: \`feat: add zero-cloud linear & sentry integrations manager\` (Author: @octocat, Status: In Review)
2. **PR #41**: \`fix: strict clamp on frequency_penalty in provider payload adapter\` (Author: @developer, Status: CI Passed)
3. **PR #39**: \`chore: upgrade tauri v2 core dependencies to latest stable\` (Author: @maintainer, Status: Ready to merge)

Would you like me to inspect the Myers diff for PR #42 or create a review comment?`
            : `GitHub is currently not connected. You can configure your GitHub Personal Access Token in the **Integrations Hub** to inspect PRs, review code, and manage issues.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#linear')) {
      const linState = getServiceState('linear');
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 54.0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Invoking Linear GraphQL engine
• Querying assigned sprint issues for Team: ${linState.config.defaultTeamKey || 'CORE'}`,
          thoughtDurationSec: 0.8,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'linear_graphql',
              args: {
                query: '{ issues(filter: { state: { type: "started" } }) { id title priority } }',
                team: linState.config.defaultTeamKey || 'CORE',
              },
              result: linState.isConnected
                ? 'Retrieved 2 active in-progress issues from Linear workspace'
                : 'Linear token not set. Running in local workspace mode.',
              status: 'completed',
              durationMs: 14,
            },
          ],
          content: linState.isConnected
            ? `Here are your assigned Linear issues for **Sprint 14**:

- **CORE-104** [Urgent]: *Implement Myers AST Diff Visualizer with Prism.js token highlighting*
- **CORE-108** [High]: *Add local PostgreSQL & SQLite reflection schema introspection tool*

I can automatically synthesize code changes and attach the diff to either issue.`
            : `Linear is not connected yet. Click **#integrations** to store your Linear Personal API Key securely on this device.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#sentry')) {
      const sentryState = getServiceState('sentry');
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 51.5,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Querying Sentry issue triage API
• Analyzing unhandled production exceptions`,
          thoughtDurationSec: 1.1,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'sentry_fetch_issues',
              args: {
                project: sentryState.config.projectSlug || 'desktop-app',
                query: 'is:unresolved level:error',
              },
              result: 'Found 1 unresolved high-frequency exception',
              status: 'completed',
              durationMs: 22,
            },
          ],
          content: `**Sentry Exception Triage Summary**:

- **Issue**: \`TypeError: Cannot read properties of undefined (reading 'frequency_penalty')\`
- **Culprit**: \`src/engine/runtimeAdapter.ts:69 in buildProviderPayload\`
- **Events**: 34 occurrences in the last 24h
- **Root Cause**: \`blade.repetitionPenalty\` was undefined during initial blade mounting before default fallbacks were applied.

I've generated the fix with strict clamping and default fallback null-coalescing below:

\`\`\`diff
// src/engine/runtimeAdapter.ts
- const repPenalty = blade.repetitionPenalty;
+ const repPenalty = blade.repetitionPenalty ?? 1.1;
\`\`\`

Click **Accept** to apply this patch directly.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 750);
      return;
    }

    // 1. Generic #search handler (routes dynamically to user's Default Search Provider)
    if (lower.startsWith('#search')) {
      const defaultProvider = getDefaultWebSearchProvider();
      const query = content.replace(/^#search\s*/, '') || 'Rust Tauri v2 window vibrancy and local LLM runtime';

      setTimeout(() => {
        let toolName = 'ddg_instant_search';
        let engineName = 'DuckDuckGo';
        let thoughtDesc = '• Executing DuckDuckGo Instant Privacy search (Default Engine)\n• Zero tracking, direct HTML/API response parsed';
        let citations = `- **Docs Reference**: \`tauri::generate_handler![...]\` IPC command registration.\n- **Zero Tracking**: Query executed via private zero-key proxy.`;

        if (defaultProvider === 'tavily') {
          toolName = 'tavily_search';
          engineName = 'Tavily AI Search (Default)';
          thoughtDesc = `• Invoking Tavily AI search engine (Default Engine)\n• Querying real-time web & documentation index for "${query}"`;
          citations = `- **Citation 1**: Real-time developer documentation fetched directly from authoritative docs.\n- **Citation 2**: Verified GitHub release notes and code snippet benchmarks.`;
        } else if (defaultProvider === 'brave') {
          toolName = 'brave_web_search';
          engineName = 'Brave Search (Default)';
          thoughtDesc = `• Querying Brave Search zero-telemetry web index (Default Engine)\n• Searching: "${query}"`;
          citations = `1. **Window Vibrancy**: Uses \`tauri_plugin_window_vibrancy\` in Rust \`setup()\`.
2. **Transparent Canvas**: Set \`"macOS": { "transparent": true }\` in \`tauri.conf.json\`.`;
        } else if (defaultProvider === 'exa') {
          toolName = 'exa_neural_search';
          engineName = 'Exa Neural Search (Default)';
          thoughtDesc = `• Invoking Exa neural embeddings engine (Default Engine)\n• Running semantic similarity search for: "${query}"`;
          citations = `- **Semantic Match**: \`tree-sitter-highlight\` crate with grammar bindings.\n- **Documentation**: Tree-sitter AST traversal and incremental Myers diff algorithm.`;
        } else if (defaultProvider === 'google') {
          toolName = 'google_custom_search';
          engineName = 'Google Search (Default)';
          thoughtDesc = `• Invoking Google Custom Search Engine (Default Engine)\n• Querying global index for: "${query}"`;
          citations = `- **Citation 1**: \`tauri-plugin-window-vibrancy\` macOS documentation.\n- **Citation 2**: Official Tauri v2 background transparency configuration.`;
        }

        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 57.2,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: thoughtDesc,
          thoughtDurationSec: 0.7,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: toolName,
              args: { query },
              result: `Retrieved results via ${engineName}`,
              status: 'completed',
              durationMs: 20,
            },
          ],
          content: `**${engineName} Results** for *"${query}"*:

${citations}

Let me know if you would like me to synthesize these findings into your codebase.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 650);
      return;
    }

    if (lower.startsWith('#tavily')) {
      const query = content.replace(/^#tavily\s*/, '') || 'Next.js 15 server actions and streaming';
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 57.5,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Invoking Tavily AI search engine
• Querying real-time web & documentation index for "${query}"`,
          thoughtDurationSec: 0.8,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'tavily_search',
              args: { query, search_depth: 'advanced' },
              result: `Retrieved 5 high-relevance technical snippets via Tavily API`,
              status: 'completed',
              durationMs: 24,
            },
          ],
          content: `**Tavily AI Search Results** for *"${query}"*:

- **Citation 1**: Real-time developer documentation fetched directly from authoritative docs.
- **Citation 2**: Verified GitHub release notes and code snippet benchmarks.

Let me know if you would like me to synthesize these findings into your codebase.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#ddg') || lower.startsWith('#duckduckgo')) {
      const query = content.replace(/^#(ddg|duckduckgo)\s*/, '') || 'Rust Tauri v2 plugins and IPC commands';
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 56.8,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Executing DuckDuckGo Instant Privacy search
• Zero tracking, direct HTML/API response parsed for: "${query}"`,
          thoughtDurationSec: 0.6,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'ddg_instant_search',
              args: { query },
              result: `Fetched 4 instant documentation results via DuckDuckGo`,
              status: 'completed',
              durationMs: 16,
            },
          ],
          content: `**DuckDuckGo Search Results** for *"${query}"*:

- **Docs Reference**: \`tauri::generate_handler![...]\` IPC command registration.
- **Zero Tracking**: Query executed via private zero-key proxy.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 650);
      return;
    }

    if (lower.startsWith('#brave')) {
      const query = content.replace(/^#brave\s*/, '') || 'Tauri v2 window vibrancy and local LLM runtime';
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 58.0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Querying Brave Search zero-telemetry web index
• Searching: "${query}"`,
          thoughtDurationSec: 0.7,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'brave_web_search',
              args: { query },
              result: 'Fetched 4 authoritative documentation citations from docs.tauri.app',
              status: 'completed',
              durationMs: 19,
            },
          ],
          content: `**Brave Search Results** for *"${query}"*:

1. **Window Vibrancy**: Uses \`tauri_plugin_window_vibrancy::apply_vibrancy(window, NSVisualEffectMaterial::HudWindow, ...)\` in Rust \`setup()\`.
2. **Transparent Canvas**: Set \`"macOS": { "transparent": true, "titleBarStyle": "Overlay" }\` in \`tauri.conf.json\`.
3. **Hardware Acceleration**: Metal-backed WKWebView guarantees 120Hz smooth scrolling for large code diffs.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#exa')) {
      const query = content.replace(/^#exa\s*/, '') || 'Rust AST parser and tree-sitter bindings';
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 58.2,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Invoking Exa neural embeddings engine
• Running semantic similarity search for: "${query}"`,
          thoughtDurationSec: 0.9,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'exa_neural_search',
              args: { query, use_autoprompt: true },
              result: 'Found 4 semantically aligned code repositories and docs on GitHub & crates.io',
              status: 'completed',
              durationMs: 26,
            },
          ],
          content: `**Exa Neural Search Results** for *"${query}"*:

- **Semantic Match**: \`tree-sitter-highlight\` crate with grammar bindings.
- **Documentation**: Tree-sitter AST traversal and incremental Myers diff algorithm.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#google')) {
      const query = content.replace(/^#google\s*/, '') || 'Tauri v2 NSVisualEffectView macos vibrancy';
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 55.4,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Invoking Google Custom Search Engine
• Querying global index for: "${query}"`,
          thoughtDurationSec: 0.7,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'google_custom_search',
              args: { query },
              result: 'Fetched 5 indexed Google results',
              status: 'completed',
              durationMs: 21,
            },
          ],
          content: `**Google Search Results** for *"${query}"*:

- **Citation 1**: \`tauri-plugin-window-vibrancy\` macOS documentation and examples.
- **Citation 2**: Official Tauri v2 window background transparency configuration guide.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    if (lower.startsWith('#postgres') || lower.startsWith('#sqlite') || lower.startsWith('#db')) {
      setTimeout(() => {
        const assistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          modelName: chosenModel.displayName,
          modelFamily: chosenModel.family,
          provider: chosenModel.provider,
          port: chosenModel.port,
          speedTokPerSec: 53.2,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          thought: `• Introspecting database schema via local driver
• Reading table definitions and foreign key constraints`,
          thoughtDurationSec: 0.9,
          toolCalls: [
            {
              id: `t-${Date.now()}-1`,
              name: 'database_inspect',
              args: {
                schema: 'public',
                includeConstraints: true,
              },
              result: 'Introspected 4 tables: `sessions`, `messages`, `blade_configs`, `audit_logs`',
              status: 'completed',
              durationMs: 16,
            },
          ],
          content: `**Database Schema Reflection**:

- **\`sessions\`**: \`id (UUID PK)\`, \`title (VARCHAR)\`, \`created_at (TIMESTAMPTZ)\`, \`model_target (VARCHAR)\`
- **\`messages\`**: \`id (UUID PK)\`, \`session_id (UUID FK)\`, \`role (VARCHAR)\`, \`content (TEXT)\`, \`thought (TEXT)\`
- **\`blade_configs\`**: \`id (UUID PK)\`, \`provider (VARCHAR)\`, \`port (INT)\`, \`temperature (FLOAT)\`, \`top_p (FLOAT)\`

All foreign keys and indexes are valid.`,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
      }, 700);
      return;
    }

    // Default code modification / assistant flow
    setTimeout(() => {
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        modelName: chosenModel.displayName,
        modelFamily: chosenModel.family,
        provider: chosenModel.provider,
        port: chosenModel.port,
        speedTokPerSec: chosenModel.family === 'deepseek' ? 41.5 : chosenModel.family === 'qwen' ? 58.4 : 32.8,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thought: chosenModel.family === 'deepseek'
          ? `• Target file: src/engine/runtimeAdapter.ts
• Applied bounded mpsc buffer and circular ring buffer pattern
• Verified zero memory allocations during 60fps render tick`
          : chosenModel.family === 'qwen'
          ? `• Target file: lazydock-tui/src/main.rs
• Scaffolding asynchronous Tokio event stream with Ratatui 0.28
• Connected local Docker socket daemon`
          : `• Target file: tests/integration_test.rs
• Running cargo clippy verification with -D warnings
• Linking local PostgreSQL telemetry database`,
        thoughtDurationSec: chosenModel.family === 'deepseek' ? 4.2 : 0.8,
        toolCalls: [
          {
            id: `t-${Date.now()}-1`,
            name: 'read_file',
            args: {
              path: 'src/engine/runtimeAdapter.ts',
              startLine: 1,
              endLine: 35,
            },
            result: 'Read 35 lines from src/engine/runtimeAdapter.ts (1.2 KB)',
            status: 'completed',
            durationMs: 7,
          },
          {
            id: `t-${Date.now()}-2`,
            name: 'patch_file',
            args: {
              path: 'src/engine/runtimeAdapter.ts',
              instruction: 'Clamp frequency_penalty between 0.0 and 2.0',
            },
            result: 'Patched 4 lines in src/engine/runtimeAdapter.ts (0 errors)',
            status: 'completed',
            durationMs: 9,
          },
        ],
        content: `I have prepared the code modification for **${chosenModel.displayName}**. You can inspect the red removals and green additions in the visual diff below:

\`\`\`diff
// src/engine/runtimeAdapter.ts
   // LM Studio / vLLM / Jan (OpenAI-compatible)
   return {
     model: blade.name,
     messages,
     temperature: blade.temperature ?? 0.2,
     top_p: blade.topP ?? 0.9,
     max_tokens: blade.maxTokens ?? 4096,
-    frequency_penalty: Math.max(0, ((blade.repetitionPenalty ?? 1.1) - 1.0) * 2.0),
+    // Strict clamp between 0.0 and 2.0 (maximum penalty)
+    frequency_penalty: Math.min(2.0, Math.max(0.0, ((blade.repetitionPenalty ?? 1.1) - 1.0) * 2.0)),
   };
\`\`\`

Click **Accept** to apply or **Reject** to revert.`,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(false);
    }, 800);
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden font-sans">
      {/* 1. TOP WINDOW DRAG REGION & TOP PANEL CONTROLS (WITH ACTIVE CHAT TITLE & SYSTEM STATS) */}
      <div
        className="h-9 w-full flex-shrink-0 select-none cursor-default grid grid-cols-[1fr_auto_1fr] items-center px-3 border-b border-white/[0.04]"
        data-tauri-drag-region
      >
        {/* LEFT COLUMN: CLEAN DRAG REGION */}
        <div className="flex items-center min-w-0 h-full" data-tauri-drag-region />

        {/* MIDDLE COLUMN: ACTIVE CHAT NAME IN TRUE CENTER */}
        <div className="flex items-center justify-center px-3 max-w-[420px] h-full -translate-y-0.5">
          <span className="font-bold text-xs text-white tracking-tight truncate text-center leading-none">
            {activeSessionTitle || 'KubePulse — Edge AI Cluster Platform'}
          </span>
        </div>

        {/* RIGHT COLUMN: BOTH COLLAPSIBLE PANEL TOGGLES */}
        <div className="flex items-center justify-end gap-1.5 min-w-0 h-full">
          {/* LEFT SIDEBAR TOGGLE */}
          {onToggleLeftSidebar && (
            <button
              type="button"
              onClick={onToggleLeftSidebar}
              title={isLeftSidebarOpen ? 'Collapse Left Sidebar (⌘B)' : 'Expand Left Sidebar (⌘B)'}
              className={`w-6 h-6 rounded-md transition-all cursor-pointer flex items-center justify-center active:scale-95 -translate-y-0.5 ${
                isLeftSidebarOpen
                  ? 'text-white/80 hover:text-white hover:bg-white/[0.08]'
                  : 'text-white/30 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <LeftPanelToggleIcon isOpen={isLeftSidebarOpen} />
            </button>
          )}

          {/* RIGHT MODEL RACK TOGGLE */}
          {onToggleRightRack && (
            <button
              type="button"
              onClick={onToggleRightRack}
              title={isRightRackOpen ? 'Collapse Model Rack' : 'Expand Model Rack'}
              className={`w-6 h-6 rounded-md transition-all cursor-pointer flex items-center justify-center active:scale-95 -translate-y-0.5 ${
                isRightRackOpen
                  ? 'text-white/80 hover:text-white hover:bg-white/[0.08]'
                  : 'text-white/30 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <RightPanelToggleIcon isOpen={isRightRackOpen} />
            </button>
          )}
        </div>
      </div>

      {/* 2. CHAT CANVAS STREAM (Pure messages directly on canvas) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-4 scroll-smooth min-w-0"
      >
        <div className="max-w-3xl mx-auto w-full min-w-0 overflow-hidden">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onRetry={() => handleSendMessage(message.content, activeModel)}
            />
          ))}
        </div>
      </div>

      {/* 3. FLOATING BOTTOM COMPOSER */}
      <div className="flex-shrink-0 z-20">
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={() => setIsStreaming(false)}
          availableModels={loadedRackModels}
          activeModel={activeModel}
          onSelectActiveModel={(m) => setActiveModel(m)}
          activeClarification={activeClarification}
          onSubmitClarification={handleClarificationSubmit}
          onDismissClarification={() => setActiveClarification(null)}
          onOpenIntegrations={(tabOrService) => {
            if (tabOrService === 'mcp') {
              setIntegrationsModalTab('mcp');
              setIsIntegrationsModalOpen(true);
            } else if (tabOrService) {
              setActiveServiceConnectId(tabOrService);
            } else {
              setIntegrationsModalTab('native');
              setIsIntegrationsModalOpen(true);
            }
          }}
        />
      </div>

      {/* INTEGRATIONS HUB MODAL */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        initialTab={integrationsModalTab}
        onClose={() => setIsIntegrationsModalOpen(false)}
      />

      {/* INDIVIDUAL SERVICE CONNECT MODAL */}
      <ServiceConnectModal
        serviceId={activeServiceConnectId}
        onClose={() => setActiveServiceConnectId(null)}
      />
    </div>
  );
};
