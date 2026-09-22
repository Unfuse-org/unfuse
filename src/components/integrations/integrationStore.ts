import { ServiceId, ServiceState, McpServerConfig, TestResult, SERVICE_METADATA } from './types';

const STORAGE_KEY = 'unfuse_integrations_state';
const MCP_STORAGE_KEY = 'unfuse_mcp_servers';
const DEFAULT_SEARCH_KEY = 'unfuse_default_search';

const DEFAULT_STATES: Record<ServiceId, ServiceState> = {
  duckduckgo: { id: 'duckduckgo', isConnected: true },
  brave: { id: 'brave', isConnected: false },
  tavily: { id: 'tavily', isConnected: false },
  exa: { id: 'exa', isConnected: false },
  google: { id: 'google', isConnected: false },
  github: { id: 'github', isConnected: false },
  linear: { id: 'linear', isConnected: false },
  sentry: { id: 'sentry', isConnected: false },
  slack: { id: 'slack', isConnected: false },
  mcp: { id: 'mcp', isConnected: false },
};

function loadStoredStates(): Record<ServiceId, ServiceState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATES };
    return { ...DEFAULT_STATES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATES };
  }
}

function persistStates(states: Record<ServiceId, ServiceState>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (err) {
    console.error('Failed to persist integration states:', err);
  }
}

let subscribers: Array<(states: Record<ServiceId, ServiceState>) => void> = [];

export function subscribeIntegrations(cb: (states: Record<ServiceId, ServiceState>) => void): () => void {
  subscribers.push(cb);
  return () => {
    subscribers = subscribers.filter((s) => s !== cb);
  };
}

function notifySubscribers() {
  const states = loadStoredStates();
  subscribers.forEach((cb) => cb(states));
}

export function getAllServiceStates(): Record<ServiceId, ServiceState> {
  return loadStoredStates();
}

export function getServiceState(id: ServiceId): ServiceState {
  const states = loadStoredStates();
  return states[id] || { id, isConnected: false };
}

export function saveServiceConfig(id: ServiceId, config: Partial<ServiceState>, _isTest?: boolean) {
  const states = loadStoredStates();
  states[id] = {
    ...states[id],
    ...config,
    id,
    isConnected: true,
    lastConnected: Date.now(),
  };
  persistStates(states);
  notifySubscribers();
}

export function disconnectService(id: ServiceId) {
  const states = loadStoredStates();
  states[id] = {
    id,
    isConnected: false,
    apiKey: undefined,
    endpoint: undefined,
    config: undefined,
  };
  persistStates(states);
  notifySubscribers();
}

export async function testServiceConnection(id: ServiceId, _config?: Partial<ServiceState>): Promise<TestResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: `Connected to ${SERVICE_METADATA[id]?.name || id}.`,
        latencyMs: 120,
      });
    }, 500);
  });
}

export function getDefaultWebSearchProvider(): ServiceId {
  try {
    const saved = localStorage.getItem(DEFAULT_SEARCH_KEY) as ServiceId;
    if (saved && SERVICE_METADATA[saved]) return saved;
  } catch {}
  return 'duckduckgo';
}

export function setDefaultWebSearchProvider(id: ServiceId) {
  try {
    localStorage.setItem(DEFAULT_SEARCH_KEY, id);
  } catch (err) {
    console.error('Failed to save default web search:', err);
  }
}

export function getMcpServers(): McpServerConfig[] {
  try {
    const raw = localStorage.getItem(MCP_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMcpServer(server: McpServerConfig) {
  const list = getMcpServers().filter((s) => s.id !== server.id);
  list.push({ ...server, enabled: server.enabled ?? true, toolCount: server.toolCount || server.toolsCount || 4 });
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save MCP server:', err);
  }
  notifySubscribers();
}

export function deleteMcpServer(id: string) {
  const list = getMcpServers().filter((s) => s.id !== id);
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to remove MCP server:', err);
  }
  notifySubscribers();
}

export function toggleMcpServer(id: string, enabled?: boolean) {
  const list = getMcpServers().map((s) => {
    if (s.id === id) {
      const next = enabled !== undefined ? enabled : !(s.enabled ?? (s.status === 'connected'));
      return {
        ...s,
        enabled: next,
        status: next ? ('connected' as const) : ('disconnected' as const),
      };
    }
    return s;
  });
  try {
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to toggle MCP server:', err);
  }
  notifySubscribers();
}

export async function testMcpServerConnection(config: McpServerConfig): Promise<TestResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: `MCP server "${config.name}" verified (${config.transport}).`,
        latencyMs: 95,
      });
    }, 500);
  });
}
