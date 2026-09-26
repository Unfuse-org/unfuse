/**
 * Deterministic pipeline planner for multi-model turn coordination.
 */

import { ActiveModelTarget } from '../components/chat/types';
import { PipelinePlan, PipelineStep, PipelineMode, ToolName } from '../types/pipeline';

interface MentionMatch {
  model: ActiveModelTarget;
  tag: string;
  directive: string;
  startIndex: number;
  endIndex: number;
}

export class PipelinePlanner {
  /**
   * Creates an execution plan from the prompt and available models.
   */
  static createPlan(
    content: string,
    effectiveModels: ActiveModelTarget[],
    fallbackModel: ActiveModelTarget,
    workspaceRoot: string
  ): PipelinePlan {
    const mentions = this.extractMentions(content, effectiveModels);

    // Single model turn
    if (mentions.length <= 1) {
      const targetModel = mentions[0]?.model || fallbackModel;
      const cleanPrompt = mentions[0]
        ? content.replace(mentions[0].tag, '').trim() || content
        : content;

      return {
        id: `plan_${Date.now()}`,
        sessionId: `sess_${Date.now()}`,
        originalPrompt: cleanPrompt,
        mode: 'single_turn',
        workspaceRoot,
        steps: [
          {
            id: 'step_0',
            order: 0,
            model: targetModel,
            assignedDirective: cleanPrompt,
            allowedTools: ['read', 'write', 'edit', 'bash'],
            dependsOnStepIds: [],
          },
        ],
      };
    }

    // Multi-model coordination
    const mode = this.detectMode(mentions);
    const steps: PipelineStep[] = [];

    for (let i = 0; i < mentions.length; i++) {
      const current = mentions[i];
      const prev = mentions[i - 1];

      let allowedTools: ToolName[] = ['read', 'write', 'edit', 'bash'];
      let directive = current.directive || content;

      if (mode === 'sequential_relay') {
        if (i === 0) {
          allowedTools = ['read', 'write', 'edit', 'bash'];
          directive = current.directive || content;
        } else {
          // Review / audit step: read-only access to prevent inadvertent file overwrites
          allowedTools = ['read', 'bash'];
          const prevName = prev.model.displayName || prev.model.name;
          directive = current.directive || `Review @${prevName}'s implementation above. Verify correctness and suggest any optimizations.`;
        }
      }

      steps.push({
        id: `step_${i}`,
        order: i,
        model: current.model,
        assignedDirective: directive,
        allowedTools,
        dependsOnStepIds: prev ? [`step_${i - 1}`] : [],
      });
    }

    return {
      id: `plan_${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
      originalPrompt: content,
      mode,
      workspaceRoot,
      steps,
    };
  }

  /**
   * Extracts model mentions in left-to-right prompt order.
   */
  private static extractMentions(
    content: string,
    effectiveModels: ActiveModelTarget[]
  ): MentionMatch[] {
    const matches: MentionMatch[] = [];

    for (const model of effectiveModels) {
      const patterns = [
        `@${model.name}`,
        model.displayName ? `@${model.displayName}` : null,
      ].filter(Boolean) as string[];

      for (const pattern of patterns) {
        const regex = new RegExp(`(^|\\s)${escapeRegex(pattern)}(\\b|$)`, 'gi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          const startIndex = match.index + (match[1] ? match[1].length : 0);
          const endIndex = startIndex + pattern.length;
          matches.push({
            model,
            tag: pattern,
            directive: '',
            startIndex,
            endIndex,
          });
        }
      }
    }

    // Sort by left-to-right appearance in the prompt
    matches.sort((a, b) => a.startIndex - b.startIndex);

    // Deduplicate consecutive mentions of the same model
    const deduplicated: MentionMatch[] = [];
    const seenIndices = new Set<number>();

    for (const m of matches) {
      if (!seenIndices.has(m.startIndex)) {
        deduplicated.push(m);
        seenIndices.add(m.startIndex);
      }
    }

    // Extract segment text between mentions
    for (let i = 0; i < deduplicated.length; i++) {
      const current = deduplicated[i];
      const nextStart = deduplicated[i + 1] ? deduplicated[i + 1].startIndex : content.length;
      const text = content.slice(current.endIndex, nextStart).trim();
      current.directive = text.replace(/^[,;:\s-]+|[,;:\s-]+$/g, '').trim();
    }

    return deduplicated;
  }

  /**
   * Determines the multi-model execution mode.
   */
  private static detectMode(mentions: MentionMatch[]): PipelineMode {
    const segmentsWithText = mentions.filter((m) => m.directive.length > 0);
    if (segmentsWithText.length > 1) {
      return 'segmented_tasks';
    }

    return 'sequential_relay';
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
