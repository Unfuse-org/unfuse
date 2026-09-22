/**
 * @file config/defaults.ts
 * @description Single source of truth for all system configuration constants, timeouts,
 * buffer thresholds, and token budgeting limits across the Unfuse backend.
 * 
 * CORE RULES:
 * 1. NO hardcoded model names, brand strings, or provider preferences belong in this file.
 * 2. Model selection, endpoints, and ports are injected dynamically at runtime by the UI.
 * 3. All values here represent safe, production-grade defaults.
 */

/**
 * Default timeout for standard interactive shell/bash executions (120 seconds).
 * Allows long compilation and package installation commands to finish without premature termination.
 */
export const BASH_DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Hard ceiling timeout for long-running batch commands (10 minutes).
 * Models and tool requests cannot override the timeout beyond this safety cap.
 */
export const BASH_MAX_TIMEOUT_MS = 600_000;

/**
 * Maximum character limit for tool stdout/stderr string truncation (32,000 characters).
 * Prevents massive compiler log dumps or binary outputs from exhausting context windows.
 */
export const MAX_OUTPUT_CHARS = 32_000;

/**
 * Soft context window budget in tokens (100,000 tokens).
 * When conversation history approaches this threshold, context compaction is triggered.
 */
export const CONTEXT_TOKEN_BUDGET = 100_000;

/**
 * Maximum time to wait for a user's Allow / Reject decision in the permission gate (5 minutes).
 * If no decision is received within this window, the pending tool call is automatically rejected
 * to prevent zombie processes and hanging agent loops.
 */
export const PERMISSION_GATE_TIMEOUT_MS = 300_000;

/**
 * Default local inference provider ports.
 * These are fallback connection discovery ports used when scanning local runners.
 */
export const DEFAULT_PROVIDER_PORTS = {
  ollama: 11434,
  lmstudio: 1234,
  jan: 1337,
  unsloth: 8888,
  vllm: 8000,
  llamacpp: 8080,
} as const;
