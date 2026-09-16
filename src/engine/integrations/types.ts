export type ServiceId =
  | 'duckduckgo'
  | 'tavily'
  | 'brave'
  | 'exa'
  | 'google'
  | 'github'
  | 'linear'
  | 'sentry'
  | 'slack'
  | 'postgres'
  | 'sqlite';

export interface DuckDuckGoConfig {
  region?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
}

export interface TavilyConfig {
  apiKey: string;
}

export interface BraveConfig {
  apiKey: string;
}

export interface ExaConfig {
  apiKey: string;
}

export interface GoogleConfig {
  apiKey: string;
  searchEngineId?: string;
}

export interface GitHubConfig {
  token: string;
  defaultRepo?: string;
  username?: string;
  autoDetectCli?: boolean;
}

export interface LinearConfig {
  apiKey: string;
  defaultTeamKey?: string;
  workspaceName?: string;
}

export interface SentryConfig {
  authToken: string;
  orgSlug: string;
  projectSlug: string;
}

export interface SlackConfig {
  webhookUrl?: string;
  botToken?: string;
  defaultChannel?: string;
}

export interface PostgresConfig {
  connectionUri: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
}

export interface SQLiteConfig {
  dbPath: string;
}

export type IntegrationConfigMap = {
  duckduckgo: DuckDuckGoConfig;
  tavily: TavilyConfig;
  brave: BraveConfig;
  exa: ExaConfig;
  google: GoogleConfig;
  github: GitHubConfig;
  linear: LinearConfig;
  sentry: SentryConfig;
  slack: SlackConfig;
  postgres: PostgresConfig;
  sqlite: SQLiteConfig;
};

export interface ServiceState<T = any> {
  id: ServiceId;
  isConnected: boolean;
  lastTestedAt?: string;
  lastStatusMessage?: string;
  lastStatusSuccess?: boolean;
  config: T;
}

export interface ServiceMetadata {
  id: ServiceId;
  name: string;
  category: 'Web Search' | 'Code & VCS' | 'Issue Tracking' | 'Observability' | 'Communication' | 'Database';
  tagline: string;
  description: string;
  commandTag: string;
  docsUrl: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  cwd?: string;
  autoApprove?: string[];
  timeout?: number;
  enabled: boolean;
  toolsCount?: number;
  lastTestedAt?: string;
  status?: 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}
