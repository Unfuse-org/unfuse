/**
 * @file agent/loop.ts
 * @description Core single-threaded Plan -> Act -> Observe execution loop.
 * 
 * CORE EXECUTION LIFECYCLE:
 * 1. Initializes/loads session state and constructs the 6-layer system prompt.
 * 2. Appends the user's prompt to session history.
 * 3. Streams completion from LLM client -> streams tokens to UI.
 * 4. Parses tool calls:
 *    - If plain text: finishes turn and creates an atomic Git turn commit.
 *    - If tool call: checks auto-allow set, else pauses at `permissions/gate.ts` for user approval.
 *    - If allowed/modified: executes tool, captures output, appends result to session, and loops.
 * 5. Supports instant cancellation via AbortController on user Stop.
 */

import { AgentConfig, BackendEvent, ToolCallRequest } from '../types';
import { LLMMessage } from '../llm/types';
import { streamChatCompletion } from '../llm/client';
import { executeTool } from '../tools/registry';
import { buildSystemPrompt } from './prompt';
import { requestPermission, cancelSessionPermissions } from '../permissions/gate';
import { getOrCreateSession, addSessionMessage } from '../session/store';
import { commitTurnSnapshot } from '../git/snapshot';

export type EventEmitterCallback = (event: BackendEvent) => void;

interface ActiveLoop {
  abortController: AbortController;
  sessionId: string;
}

const runningLoops = new Map<string, ActiveLoop>();

/**
 * Runs the agent loop for a user message within an active session.
 * 
 * @param config Agent configuration containing sessionId, workspaceRoot, and llmConfig.
 * @param userPrompt The text prompt sent by the user.
 * @param emit Callback function to dispatch IPC events to the UI.
 */
export async function runAgentLoop(
  config: AgentConfig,
  userPrompt: string,
  emit: EventEmitterCallback
): Promise<void> {
  const { sessionId, workspaceRoot, llmConfig } = config;

  // 1. Setup AbortController for loop cancellation
  const abortController = new AbortController();
  runningLoops.set(sessionId, { abortController, sessionId });

  const session = getOrCreateSession(sessionId, workspaceRoot, llmConfig);

  try {
    // 2. Initialize system prompt if session is fresh
    if (session.messages.length === 0) {
      const systemPrompt = await buildSystemPrompt({ workspaceRoot });
      await addSessionMessage(sessionId, {
        role: 'system',
        content: systemPrompt,
      });
    }

    // 3. Append user message to history
    await addSessionMessage(sessionId, {
      role: 'user',
      content: userPrompt,
    });

    let keepLooping = true;
    let turnCount = 0;
    const MAX_LOOP_TURNS = 25; // Safety circuit breaker

    while (keepLooping && turnCount < MAX_LOOP_TURNS) {
      turnCount++;

      if (abortController.signal.aborted) {
        break;
      }

      // 4. Format messages for OpenAI /v1/chat/completions
      const llmMessages: LLMMessage[] = session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        tool_calls: m.toolCalls?.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
        })),
        tool_call_id: m.toolCallId,
      }));

      // 5. Stream completion from LLM client
      const response = await streamChatCompletion(
        session.llmConfig,
        llmMessages,
        (token) => {
          emit({ type: 'token_chunk', sessionId, chunk: token });
        },
        abortController.signal
      );

      // 6. Append assistant message to session history
      await addSessionMessage(sessionId, {
        role: 'assistant',
        content: response.text,
        toolCalls: response.toolCalls.length > 0 ? response.toolCalls : undefined,
      });

      // 7. Check if model emitted tool calls
      if (response.toolCalls.length === 0) {
        // No tool calls -> Model finished its thought, exit loop
        keepLooping = false;
        break;
      }

      // 8. Execute each requested tool call through the permission gate
      for (const tool of response.toolCalls) {
        if (abortController.signal.aborted) {
          keepLooping = false;
          break;
        }

        let argsToExecute = tool.args;

        // Check if tool type is already auto-allowed for this session
        const isAutoAllowed = session.autoAllowedTools.has(tool.name);

        if (!isAutoAllowed) {
          // Pause and request permission via UI gate
          const resolution = await requestPermission(sessionId, tool, (pendingTool) => {
            emit({ type: 'tool_pending', sessionId, tool: pendingTool });
          });

          if (resolution.decision === 'reject') {
            const rejectedResult = {
              toolCallId: tool.id,
              toolName: tool.name,
              success: false,
              output: '',
              error: `User rejected execution of tool '${tool.name}'.`,
              durationMs: 0,
            };

            await addSessionMessage(sessionId, {
              role: 'tool',
              content: rejectedResult.error,
              toolCallId: tool.id,
            });

            emit({ type: 'tool_result', sessionId, result: rejectedResult });
            continue;
          }

          if (resolution.decision === 'auto_allow') {
            session.autoAllowedTools.add(tool.name);
          }

          if (resolution.decision === 'modify' && resolution.modifiedArgs) {
            argsToExecute = resolution.modifiedArgs;
          }
        }

        // Execute tool
        const toolResult = await executeTool(tool.name, tool.id, argsToExecute, {
          workspaceRoot: session.workspaceRoot,
          sessionId,
        });

        // Append tool result to session history
        await addSessionMessage(sessionId, {
          role: 'tool',
          content: toolResult.success ? toolResult.output : `Error: ${toolResult.error || toolResult.output}`,
          toolCallId: tool.id,
        });

        // Emit result to UI
        emit({ type: 'tool_result', sessionId, result: toolResult });
      }
    }

    // 9. Turn completed: create single atomic Git commit for the entire prompt
    await commitTurnSnapshot(workspaceRoot, userPrompt);

    emit({ type: 'agent_done', sessionId });
  } catch (err: unknown) {
    if (abortController.signal.aborted) {
      emit({ type: 'agent_done', sessionId, finalMessage: 'Agent stopped by user.' });
    } else {
      const message = err instanceof Error ? err.message : String(err);
      emit({ type: 'agent_error', sessionId, error: message });
    }
  } finally {
    runningLoops.delete(sessionId);
    cancelSessionPermissions(sessionId);
  }
}

/**
 * Stops an active running agent loop immediately.
 */
export function stopAgentLoop(sessionId: string): void {
  const active = runningLoops.get(sessionId);
  if (active) {
    active.abortController.abort();
    runningLoops.delete(sessionId);
    cancelSessionPermissions(sessionId);
  }
}
