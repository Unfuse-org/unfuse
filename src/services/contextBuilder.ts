/**
 * Context synthesis and upstream artifact formatting for pipeline steps.
 */

import { PipelineStep, PipelinePlan, ExecutionState } from '../types/pipeline';

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ContextBuilder {
  /**
   * Constructs the message array for an active step in the pipeline.
   */
  static buildMessages(
    step: PipelineStep,
    plan: PipelinePlan,
    state: ExecutionState
  ): ChatMessagePayload[] {
    const messages: ChatMessagePayload[] = [];

    // 1. Single turn without prior dependencies.
    if (step.dependsOnStepIds.length === 0) {
      messages.push({
        role: 'user',
        content: step.assignedDirective || plan.originalPrompt,
      });
      return messages;
    }

    // 3. Multi-step relay: Attributed upstream handoff.
    let payload = `### Original Task\n${plan.originalPrompt}\n\n`;

    payload += `### Upstream Handoff Context\n`;
    for (const depId of step.dependsOnStepIds) {
      const artifact = state.artifacts[depId];
      if (artifact && artifact.content) {
        payload += `[@${artifact.modelName} Output]:\n${artifact.content.trim()}\n\n`;
      }
    }

    const targetName = step.model.displayName || step.model.name;
    const directive = step.assignedDirective || 'Review the upstream output above and provide your response.';
    payload += `### Directive for @${targetName}\n${directive}\n\nNote: Do not summarize or repeat the upstream output above. Directly execute your assigned directive.`;

    messages.push({
      role: 'user',
      content: payload,
    });

    return messages;
  }
}
