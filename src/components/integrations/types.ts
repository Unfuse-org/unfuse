export type ServiceId =
  | 'github'
  | 'linear'
  | 'sentry'
  | 'slack'
  | 'brave'
  | 'tavily'
  | 'duckduckgo'
  | 'exa'
  | 'google'
  | 'mcp';

export interface ServiceMetadata {
  id: ServiceId;
  name: string;
  category: 'search' | 'devtools' | 'communication' | 'protocol';
  description: string;
  tagline?: string;
  docsUrl?: string;
  isPopular?: boolean;
  requiresKey?: boolean;
}

export interface ServiceState {
  id: ServiceId;
  isConnected: boolean;
  apiKey?: string;
  endpoint?: string;
  options?: Record<string, unknown>;
  config?: Record<string, unknown>;
  lastConnected?: number;
  lastStatusMessage?: string;
  lastStatusSuccess?: boolean;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse' | 'websocket';
  command?: string;
  args?: string[];
  url?: string;
  cwd?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  autoApprove?: string[];
  timeout?: number;
  status: 'connected' | 'disconnected' | 'error';
  enabled?: boolean;
  toolCount?: number;
  toolsCount?: number;
}

export interface TestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

export const SERVICE_METADATA: Record<ServiceId, ServiceMetadata> = {
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo Search',
    category: 'search',
    description: 'Free, zero-config anonymous web search for instant context and lookups.',
    tagline: 'Instant anonymous web search',
    docsUrl: 'https://duckduckgo.com',
    isPopular: true,
    requiresKey: false,
  },
  brave: {
    id: 'brave',
    name: 'Brave Search',
    category: 'search',
    description: 'Independent, privacy-first web search API indexed directly from the web.',
    tagline: 'Privacy-focused independent web index',
    docsUrl: 'https://brave.com/search/api/',
    isPopular: true,
    requiresKey: true,
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily Search',
    category: 'search',
    description: 'AI-optimized real-time search engine built specifically for autonomous agents.',
    tagline: 'Search API built for AI agents',
    docsUrl: 'https://tavily.com',
    isPopular: true,
    requiresKey: true,
  },
  exa: {
    id: 'exa',
    name: 'Exa Neural Search',
    category: 'search',
    description: 'Embeddings-based semantic search across billions of indexed web pages.',
    tagline: 'Neural semantic web embeddings',
    docsUrl: 'https://exa.ai',
    isPopular: false,
    requiresKey: true,
  },
  google: {
    id: 'google',
    name: 'Google Custom Search',
    category: 'search',
    description: 'Official Google Programmable Search Engine API with JSON results.',
    tagline: 'Official Google Programmable Search Engine',
    docsUrl: 'https://developers.google.com/custom-search/v1/overview',
    isPopular: false,
    requiresKey: true,
  },
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'devtools',
    description: 'Read issues, pull requests, commits, and repository files via Octokit.',
    tagline: 'Pull requests, issues, and code search',
    docsUrl: 'https://docs.github.com/en/rest',
    isPopular: true,
    requiresKey: true,
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    category: 'devtools',
    description: 'Manage project issues, roadmaps, and sprint cycles via GraphQL API.',
    tagline: 'Issue tracking & sprint cycles',
    docsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
    isPopular: true,
    requiresKey: true,
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    category: 'devtools',
    description: 'Fetch production crash reports, stack traces, and error logs.',
    tagline: 'Error tracking & crash diagnostics',
    docsUrl: 'https://docs.sentry.io/api/',
    isPopular: false,
    requiresKey: true,
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Broadcast notifications and share architectural reviews directly to channels.',
    tagline: 'Team messaging & alert webhooks',
    docsUrl: 'https://api.slack.com/',
    isPopular: false,
    requiresKey: true,
  },
  mcp: {
    id: 'mcp',
    name: 'Model Context Protocol',
    category: 'protocol',
    description: 'Connect custom MCP servers exposing specialized toolsets.',
    tagline: 'Universal tool protocol standard',
    docsUrl: 'https://modelcontextprotocol.io',
    isPopular: true,
    requiresKey: false,
  },
};
