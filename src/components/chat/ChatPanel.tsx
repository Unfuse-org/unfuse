import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { Message, ActiveModelTarget, ClarificationRequest, ToolCall } from './types';
import { LocalModelBlade, ModelFamily } from '../rack/types';
import { ServiceId } from '../integrations/types';
import {
  getServiceState,
  getDefaultWebSearchProvider,
} from '../integrations/integrationStore';
import { IntegrationsModal } from '../integrations/IntegrationsModal';
import { ServiceConnectModal } from '../integrations/ServiceConnectModal';
import { BtopTelemetryPopover } from './BtopTelemetryPopover';
import { backendClient, AgentConfig, BackendEvent } from '../../services/backendClient';
import { PipelinePlanner } from '../../services/pipelinePlanner';
import { ContextBuilder } from '../../services/contextBuilder';
import { ExecutionState } from '../../types/pipeline';

interface ChatPanelProps {
  sessionId?: string;
  activeSessionTitle?: string;
  isLeftSidebarOpen?: boolean;
  isRightRackOpen?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightRack?: () => void;
  activeModel?: LocalModelBlade | null;
  rackModels?: LocalModelBlade[];
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
      const family = m.details?.family || name || 'unknown';

      return {
        id: `ollama-${name}`,
        name,
        displayName: name,
        provider: 'ollama' as const,
        port: 11434,
        family,
      };
    });
  } catch {
    return [];
  }
}

const FALLBACK_OFFLINE_MODEL: ActiveModelTarget = {
  id: 'offline',
  name: 'Local Model',
  displayName: 'Local Model',
  provider: 'ollama',
  port: 11434,
  family: 'custom',
};

const INITIAL_MESSAGES: Message[] = [];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  sessionId = 's-main',
  activeSessionTitle,
  isLeftSidebarOpen = true,
  isRightRackOpen = true,
  onToggleLeftSidebar,
  onToggleRightRack,
  activeModel: activeModelProp = null,
  rackModels = [],
}) => {
  const mappedRackModels: ActiveModelTarget[] = rackModels.map(m => ({
    id: m.id,
    name: m.name,
    displayName: m.displayName,
    provider: m.provider,
    port: m.port,
    family: m.family
  }));
  const mappedActiveModel: ActiveModelTarget | null = activeModelProp ? {
    id: activeModelProp.id,
    name: activeModelProp.name,
    displayName: activeModelProp.displayName,
    provider: activeModelProp.provider,
    port: activeModelProp.port,
    family: activeModelProp.family
  } : null;

  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [discoveredModels, setDiscoveredModels] = useState<ActiveModelTarget[]>([]);
  const effectiveModels = mappedRackModels.length > 0
    ? mappedRackModels
    : discoveredModels.length > 0
    ? discoveredModels
    : [FALLBACK_OFFLINE_MODEL];
  const [internalActiveModel, setInternalActiveModel] = useState<ActiveModelTarget>(effectiveModels[0]);
  const activeModel = mappedActiveModel || internalActiveModel;
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState(false);
  const [activeClarification, setActiveClarification] = useState<ClarificationRequest | null>(null);

  const handleCopyFullConversation = () => {
    if (messages.length === 0) return;
    const conversationText = messages
      .map((m) => {
        const sender = m.role === 'user' ? '### User' : `### Assistant (${m.modelName || 'Local Blade'})`;
        let text = `${sender}\n\n${m.content || ''}`;
        if (m.thought) {
          text += `\n\n> **Reasoning Process:**\n> ${m.thought.replace(/\n/g, '\n> ')}`;
        }
        if (m.toolCalls && m.toolCalls.length > 0) {
          text +=
            `\n\n**Tool Executions:**\n` +
            m.toolCalls.map((tc) => `- \`${tc.name}\`: ${tc.result || 'Executed'}`).join('\n');
        }
        return text;
      })
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(conversationText);
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2000);
  };

  useEffect(() => {
    // Session switched
  }, [sessionId]);

  // Auto-discover local models running in Ollama
  useEffect(() => {
    if (activeModelProp) return;
    
    fetchLocalOllamaModels().then((models) => {
      if (models.length > 0) {
        setDiscoveredModels(models);
        setInternalActiveModel((curr) => {
          const exists = models.some((m) => m.name === curr.name);
          if (exists) return curr;
          const preferred = models[0];
          return preferred;
        });
      }
    });
  }, [activeModelProp !== null]);

  const abortControllerRef = useRef<AbortController | null>(null);
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

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    backendClient.stopSession(sessionId);
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
      effectiveModels[0] ||
      activeModel;

    setActiveClarification(null);
    handleSendMessage(`Clarification: Use ${answerText}`, queriedModel);
  };

  const handleSendMessage = async (content: string, targetModel?: ActiveModelTarget) => {
    if (isStreaming) return;

    const lower = content.toLowerCase().trim();
    const workspaceRoot = localStorage.getItem('unfuse_workspace_root') || '.';

    // 1. Create a deterministic execution plan
    const plan = PipelinePlanner.createPlan(content, effectiveModels, targetModel || activeModel, workspaceRoot);

    const fallbackDisplayName =
      plan.steps[0].model.displayName && !plan.steps[0].model.displayName.includes('Connecting')
        ? plan.steps[0].model.displayName
        : plan.steps[0].model.name || 'Local Model';

    // 2. Handle Git turn rollback (/undo)
    if (lower === '/undo' || lower === 'undo') {
      const workspaceRoot = localStorage.getItem('unfuse_workspace_root') || '.';
      const success = await backendClient.undoTurn(workspaceRoot);
      const undoMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        modelName: fallbackDisplayName,
        modelFamily: plan.steps[0].model.family,
        provider: plan.steps[0].model.provider,
        port: plan.steps[0].model.port,
        content: success
          ? '↩️ Successfully rolled back workspace to the previous turn snapshot.'
          : '⚠️ No previous turn snapshot found to undo.',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, undoMsg]);
      return;
    }

    // 3. Handle Autopilot Autonomous Mode
    if (lower.startsWith('/autopilot') || lower.startsWith('@autopilot')) {
      const parts = content.replace(/^(\/|@)autopilot\s*/i, '').trim();
      const verifyCmd = parts || 'npm test';
      const userMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        modelName: fallbackDisplayName,
        modelFamily: plan.steps[0].model.family,
        provider: plan.steps[0].model.provider,
        content: `Target Verification: \`${verifyCmd}\`\n\nAutopilot pipeline initialized with real backend harness.`,
        thought: 'Analyzing repository structure and preparing verification runner...',
        status: 'idle',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      return;
    }

    // 4. Construct user message and sequentially execute across targeted models
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const executionState: ExecutionState = {
      planId: plan.id,
      currentStepIndex: 0,
      status: 'running',
      artifacts: {},
    };

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      executionState.currentStepIndex = i;

      const chosenModel = step.model;
      const modelDisplayName =
        chosenModel.displayName && !chosenModel.displayName.includes('Connecting')
          ? chosenModel.displayName
          : chosenModel.name || 'Local Model';

      const assistantMsgId = `msg-${Date.now() + i + 1}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: 'assistant',
        modelName: modelDisplayName,
        modelFamily: chosenModel.family,
        provider: chosenModel.provider,
        port: chosenModel.port,
        content: '',
        thought: '',
        toolCalls: [],
        status: 'streaming',
        agentStatus: 'Ingesting prompt & generating...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      const baseUrl = chosenModel.port ? `http://127.0.0.1:${chosenModel.port}` : 'http://127.0.0.1:11434';

      const agentConfig: AgentConfig = {
        sessionId,
        workspaceRoot,
        allowedTools: step.allowedTools,
        llmConfig: {
          baseUrl,
          model: chosenModel.name || 'default',
          temperature: (activeModelProp as any)?.temperature,
          topP: (activeModelProp as any)?.topP,
          maxTokens: (activeModelProp as any)?.maxTokens,
          repetitionPenalty: (activeModelProp as any)?.repetitionPenalty,
        },
      };

      const stepMessages = ContextBuilder.buildMessages(step, plan, executionState);
      const promptForStep = stepMessages[stepMessages.length - 1].content;

      const startTime = Date.now();
      let accumulatedTokens = 0;
      let accumulatedStepText = '';

      const handleBackendEvent = (event: BackendEvent) => {
        if (event.sessionId && event.sessionId !== sessionId) return;

        if (event.type === 'token_chunk') {
          accumulatedTokens++;
          accumulatedStepText += event.chunk;
          const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
          const speedTokPerSec = Math.round((accumulatedTokens / elapsedSec) * 10) / 10;

          // Animate Rack context bar with live tokens
          window.dispatchEvent(
            new CustomEvent('unfuse-tokens-update', {
              detail: {
                modelName: modelDisplayName,
                tokensUsed: accumulatedTokens,
                speedTokPerSec,
              },
            })
          );

          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMsgId) {
                const raw = (m.content || '') + event.chunk;

                // Parse <think>...</think> reasoning tags
                const thinkMatch = raw.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
                const thought = thinkMatch ? thinkMatch[1].trim() : m.thought;
                const clean = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trimStart();

                return {
                  ...m,
                  content: thinkMatch && !raw.includes('</think>') ? '' : (clean || raw),
                  thought: thought || m.thought,
                  speedTokPerSec,
                };
              }
              return m;
            })
          );
        } else if (event.type === 'agent_status') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, agentStatus: event.status } : m
            )
          );
        } else if (event.type === 'tokens_update') {
          window.dispatchEvent(
            new CustomEvent('unfuse-tokens-update', {
              detail: {
                modelName: event.model || modelDisplayName,
                tokensUsed: event.totalTokens,
              },
            })
          );
        } else if (event.type === 'tool_pending') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMsgId) {
                const existing = m.toolCalls || [];
                const exists = existing.find((t) => t.id === event.tool.id);
                if (exists) return m;

                return {
                  ...m,
                  toolCalls: [
                    ...existing,
                    {
                      id: event.tool.id,
                      name: event.tool.name,
                      args: event.tool.args,
                      status: 'pending',
                    },
                  ],
                };
              }
              return m;
            })
          );
        } else if (event.type === 'tool_result') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === assistantMsgId) {
                const existing = m.toolCalls || [];
                const exists = existing.find((t) => t.id === event.result.toolCallId);
                const status: ToolCall['status'] = event.result.success ? 'completed' : 'failed';
                const updated: ToolCall[] = exists
                  ? existing.map((t) => {
                      if (t.id === event.result.toolCallId) {
                        return {
                          ...t,
                          status,
                          result: event.result.output || event.result.error || '',
                          durationMs: event.result.durationMs,
                        };
                      }
                      return t;
                    })
                  : [
                      ...existing,
                      {
                        id: event.result.toolCallId,
                        name: event.result.toolName,
                        args: {},
                        status,
                        result: event.result.output || event.result.error || '',
                        durationMs: event.result.durationMs,
                      },
                    ];
                return { ...m, toolCalls: updated };
              }
              return m;
            })
          );
        } else if (event.type === 'agent_done') {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, status: 'idle', agentStatus: undefined } : m))
          );
        } else if (event.type === 'agent_error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    status: 'error',
                    agentStatus: undefined,
                    content: (m.content ? m.content + '\n\n' : '') + `⚠️ Error: ${event.error}`,
                  }
                : m
            )
          );
        }
      };

      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        await backendClient.sendChatMessage(agentConfig, promptForStep, handleBackendEvent, abortController.signal);

        // Record verified output for downstream steps
        executionState.artifacts[step.id] = {
          stepId: step.id,
          modelName: modelDisplayName,
          content: accumulatedStepText,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
          tokensUsed: accumulatedTokens,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  status: 'error',
                  agentStatus: undefined,
                  content: (m.content ? m.content + '\n\n' : '') + `⚠️ Error: ${msg}`,
                }
              : m
          )
        );
      }
    }

    setIsStreaming(false);
    abortControllerRef.current = null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent relative overflow-hidden font-sans">
      {/* 1. TOP WINDOW DRAG REGION & TOP PANEL CONTROLS (WITH ACTIVE CHAT TITLE & SYSTEM STATS) */}
      <div
        className="h-9 w-full flex-shrink-0 select-none cursor-default grid grid-cols-[1fr_auto_1fr] items-center px-3 border-b border-[#1e1e24]"
        data-tauri-drag-region
      >
        {/* LEFT COLUMN: CLEAN DRAG REGION */}
        <div className="flex items-center min-w-0 h-full" data-tauri-drag-region />

        {/* MIDDLE COLUMN: ACTIVE CHAT NAME IN TRUE CENTER */}
        <div className="flex items-center justify-center px-3 max-w-[420px] h-full -translate-y-0.5">
          <span className="font-bold text-xs text-white tracking-tight truncate text-center leading-none">
            {activeSessionTitle || 'General Workspace Chat'}
          </span>
        </div>

        {/* RIGHT COLUMN: COPY CHAT & BOTH COLLAPSIBLE PANEL TOGGLES */}
        <div className="flex items-center justify-end gap-1.5 min-w-0 h-full">
          {/* COPY FULL CONVERSATION BUTTON */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleCopyFullConversation}
              title="Copy entire conversation to clipboard (Markdown)"
              className="h-6 px-2 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-mono -translate-y-0.5 active:scale-95 border border-transparent hover:border-white/10"
            >
              {isCopiedAll ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[10.5px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="text-[10.5px] hidden sm:inline">Copy Chat</span>
                </>
              )}
            </button>
          )}

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

      {/* 2. CHAT CANVAS STREAM (Pure messages directly on canvas with full drag text selection) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-4 scroll-smooth min-w-0 select-text selection:bg-sky-500/30 selection:text-white"
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
          onSelectActiveModel={(m) => setInternalActiveModel(m)}
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
