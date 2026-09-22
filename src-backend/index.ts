/**
 * @file index.ts
 * @description Root entry point for the Unfuse backend harness.
 * 
 * CORE ARCHITECTURE:
 * - Exports the unified IPC Bridge and foundational backend modules.
 * - Exports domain types, default constants, tool registry, session management, and LLM utilities.
 * - ZERO network ports required.
 */

export * from './types';
export * from './config/defaults';
export * from './ipc/bridge';
export * from './agent/loop';
export * from './agent/prompt';
export * from './agent/context';
export * from './llm/client';
export * from './llm/parser';
export * from './llm/types';
export * from './tools/registry';
export * from './tools/read';
export * from './tools/write';
export * from './tools/edit';
export * from './tools/bash';
export * from './security/path-guard';
export * from './security/sensitive-patterns';
export * from './permissions/gate';
export * from './git/snapshot';
export * from './session/store';
export * from './repomap/scanner';
