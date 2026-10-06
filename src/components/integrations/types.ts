export type ServiceCategory =
  | 'workspace'
  | 'observability'
  | 'engineering'
  | 'database'
  | 'search'
  | 'communication'
  | 'design'
  | 'protocol'
  | 'devtools';

export type ServiceId =
  | 'gmail'
  | 'notion'
  | 'googledrive'
  | 'datadog'
  | 'sentry'
  | 'posthog'
  | 'github'
  | 'linear'
  | 'jira'
  | 'postgresql'
  | 'supabase'
  | 'redis'
  | 'docker'
  | 'duckduckgo'
  | 'brave'
  | 'tavily'
  | 'exa'
  | 'google'
  | 'slack'
  | 'discord'
  | 'figma'
  | 'mcp';

export interface PluginToolDefinition {
  name: string;
  description: string;
}

export interface PluginAppDefinition {
  name: string;
  description: string;
}

export interface ServiceMetadata {
  id: ServiceId;
  name: string;
  category: ServiceCategory;
  description: string;
  tagline?: string;
  overview?: string;
  examplePrompts?: string[];
  apps?: PluginAppDefinition[];
  accountEmail?: string;
  capabilities?: string;
  developer?: string;
  version?: string;
  websiteUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  docsUrl?: string;
  isPopular?: boolean;
  requiresKey?: boolean;
  authPlaceholder?: string;
  authType?: 'apiKey' | 'token' | 'oauth' | 'connectionString';
  tools?: PluginToolDefinition[];
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
  toolCount?: number;
  toolsCount?: number;
}

export const SERVICE_METADATA: Record<ServiceId, ServiceMetadata> = {
  // WORKSPACE & DOCS
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    category: 'workspace',
    description: 'Search emails, read thread context, triage customer bugs, and draft technical release notes.',
    tagline: 'Email triage, thread context & drafting',
    docsUrl: 'https://developers.google.com/gmail/api',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'Paste Google OAuth Client Token or Service Key',
    authType: 'token',
    tools: [
      { name: 'gmail_search_threads', description: 'Search emails and threads with query filters (from, subject, date)' },
      { name: 'gmail_read_thread', description: 'Retrieve complete thread history, sender headers, and message text' },
      { name: 'gmail_create_draft', description: 'Create draft emails or replies with recipient context' },
    ],
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    category: 'workspace',
    description: 'Query company wikis, technical RFCs, architecture specs, and sprint roadmaps into prompt context.',
    tagline: 'Wikis, specs, RFCs & docs knowledge base',
    docsUrl: 'https://developers.notion.com',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'secret_...',
    authType: 'apiKey',
    tools: [
      { name: 'notion_search', description: 'Search pages, databases, and blocks across workspace' },
      { name: 'notion_read_page', description: 'Fetch full page markdown content and database properties' },
      { name: 'notion_query_database', description: 'Query database rows with custom filters and sort criteria' },
    ],
  },
  googledrive: {
    id: 'googledrive',
    name: 'Google Drive',
    category: 'workspace',
    description: 'Fetch design briefs, Product Requirement Docs (PRDs), spreadsheets, and shared team assets.',
    tagline: 'PRDs, design briefs & spreadsheets',
    docsUrl: 'https://developers.google.com/drive',
    isPopular: false,
    requiresKey: true,
    authPlaceholder: 'Paste Drive API Key or OAuth Token',
    authType: 'token',
    tools: [
      { name: 'drive_search_files', description: 'Search documents, sheets, and assets by name and mime type' },
      { name: 'drive_read_file', description: 'Export and read content of docs, sheets, or uploaded files' },
    ],
  },

  // OBSERVABILITY & TELEMETRY
  datadog: {
    id: 'datadog',
    name: 'Datadog',
    category: 'observability',
    description: 'Pull APM distributed traces, live service logs, metric graphs, and monitors for instant diagnosis.',
    tagline: 'APM distributed traces, logs & monitor alerts',
    docsUrl: 'https://docs.datadoghq.com/api/',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'Paste Datadog API Key',
    authType: 'apiKey',
    tools: [
      { name: 'datadog_query_metrics', description: 'Query timeseries metrics and APM latency graphs' },
      { name: 'datadog_get_service_logs', description: 'Fetch live service stdout/stderr logs and error traces' },
      { name: 'datadog_list_monitors', description: 'Inspect monitor alert states and triggered thresholds' },
    ],
  },
  sentry: {
    id: 'sentry',
    name: 'Sentry',
    category: 'observability',
    description: 'Fetch production crash reports, exception stack traces, and release diagnostic payloads.',
    tagline: 'Error tracking, stack traces & crash diagnostics',
    docsUrl: 'https://docs.sentry.io/api/',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'sntrys_...',
    authType: 'token',
    tools: [
      { name: 'sentry_list_issues', description: 'Fetch unresolved crashes, error events, and release diagnostics' },
      { name: 'sentry_get_issue_trace', description: 'Inspect full stack traces, breadcrumbs, tags, and culprit code' },
    ],
  },
  posthog: {
    id: 'posthog',
    name: 'PostHog',
    category: 'observability',
    description: 'Query product analytics, user session event recordings, and feature flag release states.',
    tagline: 'Product analytics, session replays & feature flags',
    docsUrl: 'https://posthog.com/docs/api',
    isPopular: false,
    requiresKey: true,
    authPlaceholder: 'phx_...',
    authType: 'apiKey',
    tools: [
      { name: 'posthog_query_events', description: 'Query user event streams, session recordings, and funnel analytics' },
      { name: 'posthog_get_feature_flags', description: 'Check active feature flags and user experiment variants' },
    ],
  },

  // ENGINEERING & WORKFLOWS
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'engineering',
    description: 'Review PR diffs, search repository code, manage issues, and automate git workflows via Octokit.',
    tagline: 'Triage PRs, issues, CI, and publish flows',
    overview:
      'Use GitHub to inspect repositories, review pull requests, address feedback, debug failing Actions checks, and prepare code changes for review through a connector-first workflow with targeted CLI fallbacks.',
    examplePrompts: [
      "Explain this repo's authentication using code and docs: components, request flow, and how credentials and tokens are handled",
      'Summarize this pull request like a senior reviewer: what changed, what could break, and what tests are missing or weak',
      'Turn the last 7 days of commits and merged PRs into a stakeholder update: shipped work, risks, and next steps',
    ],
    apps: [
      {
        name: 'GitHub',
        description: 'Access repositories, issues, and pull requests. Required for some features such as Codex',
      },
      {
        name: 'GitHub Enterprise',
        description: 'Workspace-specific GitHub connector for a GitHub Enterprise host.',
      },
    ],
    accountEmail: 'proffersor45@gmail.com',
    capabilities: 'Interactive, Write',
    developer: 'OpenAI',
    version: '0.1.12-5f7cd798dc99',
    websiteUrl: 'https://github.com',
    privacyUrl: 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement',
    termsUrl: 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service',
    docsUrl: 'https://docs.github.com/en/rest',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'ghp_... (Personal Access Token)',
    authType: 'token',
    tools: [
      { name: 'github_get_pull_request', description: 'Fetch PR diff, commits, reviews, and CI status checks' },
      { name: 'github_search_code', description: 'Search repositories for code snippets, symbols, and files' },
      { name: 'github_create_issue', description: 'File issues or bug tickets with labels and assignees' },
      { name: 'github_list_commits', description: 'Inspect recent commit history and author information' },
    ],
  },
  linear: {
    id: 'linear',
    name: 'Linear',
    category: 'engineering',
    description: 'Manage project issues, sprint cycles, roadmap milestones, and team triage via GraphQL API.',
    tagline: 'Issue tracking, sprint cycles & roadmaps',
    docsUrl: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'lin_api_...',
    authType: 'apiKey',
    tools: [
      { name: 'linear_list_issues', description: 'List assigned issues, priority backlog, and sprint cycles' },
      { name: 'linear_create_issue', description: 'Create new tickets with priority, estimate, and team labels' },
      { name: 'linear_update_issue', description: 'Transition issue workflow state (e.g. In Progress, Done)' },
    ],
  },
  jira: {
    id: 'jira',
    name: 'Jira',
    category: 'engineering',
    description: 'Enterprise ticket management, agile sprint backlogs, and status workflow transitions.',
    tagline: 'Enterprise ticket management & agile backlogs',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'Paste Atlassian API Token',
    authType: 'token',
    tools: [
      { name: 'jira_get_issue', description: 'Fetch enterprise ticket details, acceptance criteria, and subtasks' },
      { name: 'jira_transition_issue', description: 'Move ticket across workflow status columns' },
    ],
  },

  // DATABASES & INFRASTRUCTURE
  postgresql: {
    id: 'postgresql',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Introspect live database schemas, run safe validation queries, and verify relational migrations.',
    tagline: 'Live schema introspection & SQL querying',
    docsUrl: 'https://www.postgresql.org/docs/',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'postgresql://user:password@localhost:5432/dbname',
    authType: 'connectionString',
    tools: [
      { name: 'postgres_query', description: 'Run parameterized SQL queries with safety and read limit controls' },
      { name: 'postgres_describe_table', description: 'Introspect column types, foreign keys, indexes, and constraints' },
      { name: 'postgres_list_tables', description: 'List all public schemas, tables, and views' },
    ],
  },
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    category: 'database',
    description: 'Query Postgres databases, authentication tables, and storage bucket files via Supabase SDK.',
    tagline: 'Managed Postgres, Auth & Storage APIs',
    docsUrl: 'https://supabase.com/docs',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'eyJhbGciOi... (Supabase Service Role Key)',
    authType: 'apiKey',
    tools: [
      { name: 'supabase_query_table', description: 'Query database rows via PostgREST with column filters' },
      { name: 'supabase_list_buckets', description: 'Inspect storage buckets and user authentication records' },
    ],
  },
  redis: {
    id: 'redis',
    name: 'Redis',
    category: 'database',
    description: 'Inspect cache keys, TTL values, queue states, and pub/sub channels during agent task execution.',
    tagline: 'In-memory cache inspection & queue states',
    docsUrl: 'https://redis.io/docs/',
    isPopular: false,
    requiresKey: true,
    authPlaceholder: 'redis://default:password@localhost:6379',
    authType: 'connectionString',
    tools: [
      { name: 'redis_get', description: 'Retrieve cached keys, hashes, and serialized values' },
      { name: 'redis_keys', description: 'Search pattern keys and inspect TTL expiration timers' },
    ],
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    category: 'database',
    description: 'Inspect running containers, retrieve container stdout/stderr logs, and test build environments.',
    tagline: 'Container inspection, logs & build verification',
    docsUrl: 'https://docs.docker.com/engine/api/',
    isPopular: true,
    requiresKey: false,
    authPlaceholder: 'unix:///var/run/docker.sock',
    authType: 'connectionString',
    tools: [
      { name: 'docker_list_containers', description: 'List running and stopped container instances' },
      { name: 'docker_get_logs', description: 'Fetch container stdout and stderr execution logs' },
    ],
  },

  // SEARCH & WEB INTELLIGENCE
  duckduckgo: {
    id: 'duckduckgo',
    name: 'DuckDuckGo Search',
    category: 'search',
    description: 'Free, zero-config anonymous web search for instant context and error lookups.',
    tagline: 'Instant zero-config web search',
    docsUrl: 'https://duckduckgo.com',
    isPopular: true,
    requiresKey: false,
    tools: [
      { name: 'duckduckgo_search', description: 'Execute instant anonymous web queries without rate limits' },
      { name: 'duckduckgo_fetch_page', description: 'Extract readable markdown text from web search links' },
    ],
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
    authPlaceholder: 'BSA...',
    authType: 'apiKey',
    tools: [
      { name: 'brave_search', description: "Query Brave's independent web index for web, news, and code" },
    ],
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
    authPlaceholder: 'tvly-...',
    authType: 'apiKey',
    tools: [
      { name: 'tavily_search', description: 'Search AI-optimized web index and extract clean summary context' },
    ],
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
    authPlaceholder: 'Paste Exa API Key',
    authType: 'apiKey',
    tools: [
      { name: 'exa_search', description: 'Run neural semantic embeddings search across web URLs' },
    ],
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
    authPlaceholder: 'AIzaSy...',
    authType: 'apiKey',
    tools: [
      { name: 'google_custom_search', description: 'Query official Google Programmable Search Engine API' },
    ],
  },

  // COMMUNICATION & DESIGN
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Broadcast notifications and share architectural reviews directly to channels.',
    tagline: 'Team messaging & alert webhooks',
    docsUrl: 'https://api.slack.com/',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'xoxb-... or Webhook URL',
    authType: 'token',
    tools: [
      { name: 'slack_post_message', description: 'Broadcast formatted messages or notifications to channels' },
      { name: 'slack_list_channels', description: 'List accessible public and private workspace channels' },
    ],
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    category: 'communication',
    description: 'Post automated build alerts, test regressions, and agent completions to developer servers.',
    tagline: 'Developer server webhooks & channel alerts',
    docsUrl: 'https://discord.com/developers/docs/intro',
    isPopular: false,
    requiresKey: true,
    authPlaceholder: 'Paste Discord Bot Token or Webhook URL',
    authType: 'token',
    tools: [
      { name: 'discord_send_webhook', description: 'Send automated build alerts and test regressions to channels' },
    ],
  },
  figma: {
    id: 'figma',
    name: 'Figma',
    category: 'design',
    description: 'Extract design tokens, component frames, typography styles, and layout CSS variables.',
    tagline: 'Design tokens, component frames & CSS specs',
    docsUrl: 'https://www.figma.com/developers/api',
    isPopular: true,
    requiresKey: true,
    authPlaceholder: 'figd_...',
    authType: 'token',
    tools: [
      { name: 'figma_get_file', description: 'Extract component nodes, layout frames, styles, and typography' },
      { name: 'figma_get_image', description: 'Render SVG or PNG assets for designated component nodes' },
    ],
  },

  // PROTOCOL
  mcp: {
    id: 'mcp',
    name: 'Model Context Protocol',
    category: 'protocol',
    description: 'Connect custom MCP servers exposing specialized toolsets via stdio or sse.',
    tagline: 'Universal tool protocol standard',
    docsUrl: 'https://modelcontextprotocol.io',
    isPopular: true,
    requiresKey: false,
  },
};
