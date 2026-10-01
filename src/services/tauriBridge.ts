import { invoke } from '@tauri-apps/api/core';
import { HardwareTelemetry } from '../components/chat/types';

/**
 * Fetches real hardware telemetry from the host operating system via Tauri.
 */
export async function nativeGetTelemetry(): Promise<HardwareTelemetry | null> {
  try {
    return await invoke<HardwareTelemetry>('get_system_telemetry');
  } catch (e) {
    // Return null in web development mode without throwing
    return null;
  }
}

/**
 * Fetches host system profile info via Tauri.
 */
export async function nativeGetSystemInfo(): Promise<Record<string, unknown> | null> {
  try {
    return await invoke<Record<string, unknown>>('get_system_info');
  } catch {
    return null;
  }
}
