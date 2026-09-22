/**
 * @file services/backendClient.ts
 * @description Zero-Port In-Memory Client Bridge.
 * 
 * CORE RULES:
 * 1. ZERO OPEN PORTS — Completely replaces localhost HTTP servers with Tauri Native In-Memory IPC.
 * 2. Re-exports the in-memory `agentEngine` for seamless UI consumption.
 */

export * from './agentEngine';
export { agentEngine as backendClient } from './agentEngine';
