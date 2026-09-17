import React, { useState, useRef, useEffect } from 'react';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { Message, ActiveModelTarget, ClarificationRequest, ToolCall } from './types';
import { ModelFamily } from '../rack/types';
import { ServiceId } from '../../engine/integrations/types';
import {
  LLMClient,
  PromptBuilder,
  executeToolCall,
  type ChatMessage,
  type LLMConfig,
  type InferenceProvider,
} from '../../engine/llm';
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

async function fetchLocalOllamaModels(): Promise<ActiveModelTarget[]> {
  try {
    const res = await fetch('http://127.0.0.1:11434/api/tags');
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.models)) return [];

    return data.models.map((m: any) => {
      const name = m.name || m.model || '';
      const lower = name.toLowerCase();
      let family: ModelFamily = 'custom';
      if (lower.includes('qwen')) family = 'qwen';
      else if (lower.includes('deepseek')) family = 'deepseek';
      else if (lower.includes('llama')) family = 'llama';
      else if (lower.includes('mistral')) family = 'mistral';
      else if (lower.includes('phi')) family = 'phi';
      else if (lower.includes('gemma')) family = 'gemma';

      let displayName = name;
      if (lower.startsWith('qwen2.5-coder:7b')) displayName = 'Qwen 2.5 Coder 7B';
      else if (lower.startsWith('qwen2.5-coder:32b')) displayName = 'Qwen 2.5 Coder 32B';
      else if (lower.startsWith('llama3.2:3b')) displayName = 'Llama 3.2 3B';
      else if (lower.startsWith('deepseek-r1:14b')) displayName = 'DeepSeek R1 14B';

      return {
        id: `ollama-${name}`,
        name,
        displayName,
        provider: 'ollama' as const,
        port: 11434,
        family,
      };
    });
  } catch {
    return [];
  }
}

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
  const [discoveredModels, setDiscoveredModels] = useState<ActiveModelTarget[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const effectiveModels = discoveredModels.length > 0 ? discoveredModels : loadedRackModels;

  // Auto-discover local models running in Ollama
  useEffect(() => {
    fetchLocalOllamaModels().then((models) => {
      if (models.length > 0) {
        setDiscoveredModels(models);
        setActiveModel((curr) => {
          const exists = models.some((m) => m.name === curr.name);
          if (exists) return curr;
          const preferred = models.find((m) => m.name.includes('coder') || m.family === 'qwen') || models[0];
          return preferred;
        });
      }
    });
  }, []);

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

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
      effectiveModels.find((m) => m.family === activeClarification.modelFamily) ||
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

  const handleSendMessage = async (content: string, targetModel?: ActiveModelTarget) => {
    if (isStreaming) return;

    let chosenModel = targetModel || activeModel;
    const lower = content.toLowerCase().trim();

    // 1. Detect exact model tagged with @
    if (lower.includes('@qwen') || lower.includes('@qwen2.5')) {
      const found = effectiveModels.find((m) => m.family === 'qwen') || SAMPLE_MODELS[0];
      if (found) chosenModel = found;
    } else if (lower.includes('@deepseek') || lower.includes('@deepseek-r1')) {
      const found = effectiveModels.find((m) => m.family === 'deepseek') || SAMPLE_MODELS[1];
      if (found) chosenModel = found;
    } else if (lower.includes('@llama') || lower.includes('@llama3')) {
      const found = effectiveModels.find((m) => m.family === 'llama') || SAMPLE_MODELS[2];
      if (found) chosenModel = found;
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMsgId = `msg-${Date.now() + 1}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      modelName: chosenModel.displayName,
      modelFamily: chosenModel.family,
      provider: chosenModel.provider,
      port: chosenModel.port,
      content: '',
      thought: '',
      speedTokPerSec: 0,
      status: 'streaming',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // Build chat history for PromptBuilder
    const historyMessages: ChatMessage[] = [
      ...messages
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content },
    ];

    const provider: InferenceProvider =
      chosenModel.provider === 'ollama' ? 'ollama' : 'openai-compatible';
    const baseUrl = `http://127.0.0.1:${chosenModel.port || (chosenModel.provider === 'ollama' ? 11434 : 1234)}`;

    const config: LLMConfig = {
      provider,
      baseUrl,
      model: chosenModel.name,
      temperature: 0.2,
      topP: 0.9,
      maxTokens: 4096,
      contextWindow: 32768,
    };

    const promptBuilder = new PromptBuilder();
    const fullPromptMessages = promptBuilder.buildPrompt(historyMessages, '', config);

    const client = new LLMClient();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedContent = '';
    let accumulatedThought = '';

    try {
      await client.streamChat(
        fullPromptMessages,
        config,
        {
          onToken: (token) => {
            accumulatedContent += token;

            let displayContent = accumulatedContent;
            let displayThought = accumulatedThought;

            // Live parse <think> tags if model emits them directly in content stream
            if (displayContent.includes('<think>')) {
              const thinkStart = displayContent.indexOf('<think>');
              const thinkEnd = displayContent.indexOf('</think>');
              if (thinkEnd !== -1) {
                const thoughtPart = displayContent.slice(thinkStart + 7, thinkEnd).trim();
                displayThought = (displayThought ? displayThought + '\n' : '') + thoughtPart;
                displayContent = (displayContent.slice(0, thinkStart) + displayContent.slice(thinkEnd + 8)).trimStart();
              } else {
                const thoughtPart = displayContent.slice(thinkStart + 7).trim();
                displayThought = (displayThought ? displayThought + '\n' : '') + thoughtPart;
                displayContent = displayContent.slice(0, thinkStart);
              }
            }

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: displayContent,
                      thought: displayThought || m.thought,
                    }
                  : m
              )
            );
          },
          onReasoning: (thinking) => {
            accumulatedThought += thinking;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, thought: accumulatedThought }
                  : m
              )
            );
          },
          onMetrics: (metrics) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      speedTokPerSec: metrics.tokensPerSecond,
                      thoughtDurationSec: metrics.timeToFirstTokenMs
                        ? Number((metrics.timeToFirstTokenMs / 1000).toFixed(1))
                        : undefined,
                    }
                  : m
              )
            );
          },
          onDone: async (cleanText, toolCalls) => {
            const uiToolCalls: ToolCall[] = toolCalls.map((tc) => ({
              id: tc.id,
              name: tc.name,
              args: tc.args,
              status: 'running',
              result: 'Executing tool via local OS bridge...',
            }));

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: cleanText,
                      toolCalls: uiToolCalls,
                      status: 'idle',
                    }
                  : m
              )
            );

            // Execute detected tools through Tauri IPC
            if (toolCalls.length > 0) {
              for (const tc of toolCalls) {
                // Interactive clarification tool
                if (tc.name === 'ask_question' || tc.name === 'ask_clarification') {
                  const q = tc.args.question || tc.args.query || 'Clarification required:';
                  const opts = Array.isArray(tc.args.options)
                    ? tc.args.options.map((opt: any, idx: number) => ({
                        id: `opt-${idx}`,
                        label: typeof opt === 'string' ? opt : opt.label || JSON.stringify(opt),
                        description: opt.description,
                        recommended: idx === 0,
                      }))
                    : [
                        { id: 'opt-1', label: 'Proceed with default', recommended: true },
                        { id: 'opt-2', label: 'Provide custom input' },
                      ];

                  setActiveClarification({
                    id: `clarify-${Date.now()}`,
                    toolCallId: tc.id,
                    modelName: chosenModel.displayName,
                    modelFamily: chosenModel.family,
                    question: q,
                    options: opts,
                    allowCustomInput: true,
                  });

                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            toolCalls: (m.toolCalls || []).map((t) =>
                              t.id === tc.id
                                ? {
                                    ...t,
                                    status: 'pending',
                                    result: 'Awaiting user choice...',
                                  }
                                : t
                            ),
                          }
                        : m
                    )
                  );
                  continue;
                }

                const res = await executeToolCall(tc);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls || []).map((t) =>
                            t.id === tc.id
                              ? {
                                  ...t,
                                  status: res.success ? 'completed' : 'failed',
                                  result: res.output,
                                  durationMs: res.durationMs,
                                }
                              : t
                          ),
                        }
                      : m
                  )
                );
              }
            }
          },
        },
        abortController
      );
    } catch (err: any) {
      if (abortController.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, status: 'idle' }
              : m
          )
        );
      } else {
        const errorMsg = `⚠️ **Connection Error**: Unable to reach **${chosenModel.displayName}** at \`${baseUrl}\`.\n\n${err?.message || String(err)}\n\n**Resolution Steps**:\n1. Check that ${chosenModel.provider === 'ollama' ? 'Ollama is running (`ollama serve`)' : 'your local LLM server is running on port ' + chosenModel.port}.\n2. Ensure model \`${chosenModel.name}\` is pulled (${chosenModel.provider === 'ollama' ? `\`ollama run ${chosenModel.name}\`` : 'loaded in LM Studio'}).\n3. Click the retry button to try again.`;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: errorMsg,
                  status: 'error',
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
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
              onRetry={() => {
                const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                if (lastUser) {
                  handleSendMessage(lastUser.content, activeModel);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* 3. FLOATING BOTTOM COMPOSER */}
      <div className="flex-shrink-0 z-20">
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          availableModels={effectiveModels}
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
