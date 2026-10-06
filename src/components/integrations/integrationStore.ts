import { invoke } from '@tauri-apps/api/core';
import { ServiceId, ServiceState, McpServerConfig, TestResult, SERVICE_METADATA } from './types';

const STORAGE_KEY = 'unfuse_integrations_state';
const MCP_STORAGE_KEY = 'unfuse_mcp_servers';
const DEFAULT_SEARCH_KEY = 'unfuse_default_search';

const DEFAULT_STATES: Record<ServiceId, ServiceState> = {
  // WORKSPACE
  gmail: { id: 'gmail', isConnected: false },
  notion: { id: 'notion', isConnected: false },
  googledrive: { id: 'googledrive', isConnected: false },

  // OBSERVABILITY
  datadog: { id: 'datadog', isConnected: false },
  sentry: { id: 'sentry', isConnected: false },
  posthog: { id: 'posthog', isConnected: false },

  // ENGINEERING
  github: { id: 'github', isConnected: false },
  linear: { id: 'linear', isConnected: false },
  jira: { id: 'jira', isConnected: false },

  // DATABASE
  postgresql: { id: 'postgresql', isConnected: false },
  supabase: { id: 'supabase', isConnected: false },
  redis: { id: 'redis', isConnected: false },
  docker: { id: 'docker', isConnected: false },

  // SEARCH
  duckduckgo: { id: 'duckduckgo', isConnected: true },
  brave: { id: 'brave', isConnected: false },
  tavily: { id: 'tavily', isConnected: false },
  exa: { id: 'exa', isConnected: false },
  google: { id: 'google', isConnected: false },

  // COMMUNICATION & DESIGN
  slack: { id: 'slack', isConnected: false },
  discord: { id: 'discord', isConnected: false },
  figma: { id: 'figma', isConnected: false },

  // PROTOCOL
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

export function getManagedMcpConfigForService(
  id: ServiceId,
  config?: Partial<ServiceState> & Record<string, any>
): McpServerConfig | null {
  const token = config?.apiKey || config?.token || config?.authToken || (config as any)?.botToken;

  switch (id) {
    case 'github': {
      return {
        id: 'managed_github',
        name: 'GitHub (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: token ? { GITHUB_PERSONAL_ACCESS_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'linear': {
      return {
        id: 'managed_linear',
        name: 'Linear (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@linear/mcp-server'],
        env: token ? { LINEAR_API_KEY: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'slack': {
      const botToken = token || (config as any)?.webhookUrl;
      const teamId = (config?.options as any)?.teamId || (config as any)?.teamId;
      return {
        id: 'managed_slack',
        name: 'Slack (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-slack'],
        env: {
          ...(botToken ? { SLACK_BOT_TOKEN: botToken } : {}),
          ...(teamId ? { SLACK_TEAM_ID: String(teamId) } : {}),
        },
        status: 'connected',
        enabled: true,
      };
    }
    case 'sentry': {
      return {
        id: 'managed_sentry',
        name: 'Sentry (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sentry'],
        env: token ? { SENTRY_AUTH_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'notion': {
      return {
        id: 'managed_notion',
        name: 'Notion (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-notion'],
        env: token ? { NOTION_API_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'gmail': {
      return {
        id: 'managed_gmail',
        name: 'Gmail / Google Workspace (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-google-workspace'],
        env: token ? { GOOGLE_WORKSPACE_AUTH: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'datadog': {
      return {
        id: 'managed_datadog',
        name: 'Datadog (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@datadog/mcp-server'],
        env: token ? { DATADOG_API_KEY: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'jira': {
      return {
        id: 'managed_jira',
        name: 'Jira (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-jira'],
        env: token ? { JIRA_API_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'postgresql': {
      return {
        id: 'managed_postgresql',
        name: 'PostgreSQL (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres', token || 'postgresql://localhost:5432'],
        status: 'connected',
        enabled: true,
      };
    }
    case 'docker': {
      return {
        id: 'managed_docker',
        name: 'Docker (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-docker'],
        status: 'connected',
        enabled: true,
      };
    }
    case 'figma': {
      return {
        id: 'managed_figma',
        name: 'Figma (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-figma'],
        env: token ? { FIGMA_PERSONAL_ACCESS_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'posthog': {
      return {
        id: 'managed_posthog',
        name: 'PostHog (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@posthog/mcp-server'],
        env: token ? { POSTHOG_API_KEY: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'supabase': {
      return {
        id: 'managed_supabase',
        name: 'Supabase (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@supabase/mcp-server'],
        env: token ? { SUPABASE_SERVICE_KEY: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    case 'redis': {
      return {
        id: 'managed_redis',
        name: 'Redis (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-redis', token || 'redis://localhost:6379'],
        status: 'connected',
        enabled: true,
      };
    }
    case 'discord': {
      return {
        id: 'managed_discord',
        name: 'Discord (Official MCP)',
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-discord'],
        env: token ? { DISCORD_BOT_TOKEN: token } : {},
        status: 'connected',
        enabled: true,
      };
    }
    default:
      return null;
  }
}

export function saveServiceConfig(id: ServiceId, config: Partial<ServiceState> & Record<string, any>, _isTest?: boolean) {
  const states = loadStoredStates();
  const token = config.apiKey || config.token || config.authToken || config.botToken || config.webhookUrl;

  states[id] = {
    ...states[id],
    ...config,
    id,
    apiKey: token || states[id]?.apiKey,
    isConnected: true,
    lastConnected: Date.now(),
  };
  persistStates(states);

  const managedConfig = getManagedMcpConfigForService(id, states[id]);
  if (managedConfig) {
    saveMcpServer(managedConfig);
  }

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

  deleteMcpServer(`managed_${id}`);
  notifySubscribers();
}

export async function testServiceConnection(id: ServiceId, config?: Partial<ServiceState> & Record<string, any>): Promise<TestResult> {
  const isWebSearch = ['duckduckgo', 'brave', 'tavily', 'exa', 'google'].includes(id);
  if (isWebSearch) {
    try {
      const state = getServiceState(id);
      const apiKey = config?.apiKey ?? state.apiKey;
      const endpoint = config?.endpoint ?? state.endpoint;
      const options = (config?.options ?? state.options) as Record<string, unknown> | undefined;
      const searchEngineId = (config as any)?.searchEngineId ?? (state as any)?.searchEngineId;
      const mergedOptions = {
        ...(options || {}),
        ...(searchEngineId ? { cx: searchEngineId, searchEngineId } : {}),
      };

      const res = await invoke<TestResult>('test_web_service', {
        serviceId: id,
        apiKey: apiKey || null,
        endpoint: endpoint || null,
        options: Object.keys(mergedOptions).length > 0 ? mergedOptions : null,
      });
      return res;
    } catch (err: any) {
      return {
        success: false,
        message: err?.toString() || `Failed to connect to ${id}`,
      };
    }
  }

  const isManagedMcp = [
    'github',
    'linear',
    'slack',
    'sentry',
    'notion',
    'gmail',
    'googledrive',
    'datadog',
    'jira',
    'postgresql',
    'supabase',
    'redis',
    'docker',
    'figma',
    'posthog',
    'discord',
  ].includes(id);
  if (isManagedMcp) {
    const state = getServiceState(id);
    const merged = { ...state, ...(config || {}) } as Record<string, any>;
    const token =
      id === 'docker'
        ? 'local_docker_sock'
        : merged.apiKey || merged.token || merged.authToken || merged.botToken || merged.webhookUrl;
    if (!token || !token.trim()) {
      return {
        success: false,
        message: `${SERVICE_METADATA[id]?.name || id} requires an authentication token or key.`,
      };
    }

    const managedConfig = getManagedMcpConfigForService(id, merged);
    if (!managedConfig) {
      return { success: false, message: `No MCP connector available for ${id}` };
    }
    return await testMcpServerConnection(managedConfig);
  }

  return {
    success: false,
    message: `${SERVICE_METADATA[id]?.name || id} requires MCP connector configuration.`,
  };
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
  const toolCount = server.toolCount ?? server.toolsCount;
  list.push({
    ...server,
    enabled: server.enabled ?? true,
    toolCount: toolCount !== undefined ? toolCount : undefined,
    toolsCount: toolCount !== undefined ? toolCount : undefined,
  });
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
  try {
    const res = await invoke<{
      success: boolean;
      message: string;
      latencyMs?: number;
      toolsCount?: number;
      tools?: Array<{ name: string; description?: string }>;
    }>('test_mcp_server', {
      config: {
        id: config.id,
        name: config.name,
        transport: config.transport,
        command: config.command || null,
        args: config.args || null,
        env: config.env || null,
        cwd: config.cwd || null,
        enabled: config.enabled ?? true,
        toolCount: config.toolCount ?? config.toolsCount ?? null,
      },
    });

    if (res.success && res.toolsCount !== undefined) {
      const servers = getMcpServers();
      const existing = servers.find((s) => s.id === config.id);
      if (existing) {
        existing.toolCount = res.toolsCount;
        existing.toolsCount = res.toolsCount;
        existing.status = 'connected';
        try {
          localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(servers));
        } catch {}
      }
    }

    return {
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
      toolCount: res.toolsCount,
      toolsCount: res.toolsCount,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.toString() || `Failed to probe MCP server ${config.name}`,
    };
  }
}

