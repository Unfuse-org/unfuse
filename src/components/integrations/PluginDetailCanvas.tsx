import React, { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, Settings2, ShieldCheck, Trash2, Wrench } from 'lucide-react';
import { ServiceId, SERVICE_METADATA } from './types';
import { getServiceState, saveServiceConfig, disconnectService } from './integrationStore';
import { renderIntegrationLogo } from './IntegrationLogos';

// Provider requirements describe their APIs, not completed Unfuse connector features.
const SETUP_GUIDES: Record<ServiceId, { auth: string; requirement: string; access: string; url: string }> = {
  github: { auth: 'Personal access token', requirement: 'Choose the repositories and permissions on a fine-grained token. Organization approval may be required.', access: 'Repository access follows the token’s permissions and the account’s access.', url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens' },
  notion: { auth: 'Integration token', requirement: 'Create an internal connection and share the pages it needs using Add connections in Notion.', access: 'Internal connections can access shared pages within their configured capabilities.', url: 'https://developers.notion.com/guides/get-started/authorization' },
  linear: { auth: 'API key or OAuth', requirement: 'Create a personal API key in Linear settings, or authorize an OAuth application.', access: 'API access is limited by the key permissions and authorized workspace.', url: 'https://linear.app/developers/graphql' },
  gmail: { auth: 'OAuth access token', requirement: 'Enable the Gmail API and authorize the scopes required for reading mail or creating drafts. An API key alone does not grant mailbox access.', access: 'OAuth scopes determine which mailbox operations are allowed.', url: 'https://developers.google.com/workspace/gmail/api/auth/scopes' },
  googledrive: { auth: 'OAuth access token', requirement: 'Enable the Drive API and select the OAuth scopes needed for the files you want to use.', access: 'File access depends on OAuth scopes and the authorizing account’s permissions.', url: 'https://developers.google.com/workspace/drive/api/guides/api-specific-auth' },
  slack: { auth: 'Slack app token', requirement: 'Install a Slack app with the required OAuth scopes. Bot access also depends on channel membership.', access: 'The token type, granted scopes, and conversation access determine available operations.', url: 'https://docs.slack.dev/authentication/tokens/' },
  figma: { auth: 'Personal access token or OAuth', requirement: 'Create a scoped token or authorize an OAuth app with access to the relevant files.', access: 'File permissions and token scopes determine which design data can be read.', url: 'https://developers.figma.com/docs/rest-api/authentication/' },
  sentry: { auth: 'Auth token', requirement: 'Create an internal integration or personal token with scopes for the organizations and projects you need.', access: 'Token scopes control access to issues, projects, and organization data.', url: 'https://docs.sentry.io/api/auth/' },
  datadog: { auth: 'Scoped token or legacy API keys', requirement: 'Check your endpoint’s supported authentication. Datadog supports scoped access tokens; legacy access uses an API key paired with an application key.', access: 'Credential scopes and account permissions limit API access.', url: 'https://docs.datadoghq.com/account_management/api-app-keys/' },
  posthog: { auth: 'Personal API key', requirement: 'Private query endpoints require a personal API key and the correct cloud region or self-hosted URL. A project token is for public ingestion endpoints.', access: 'Personal API key scopes determine which analytics resources can be queried.', url: 'https://posthog.com/docs/api' },
  jira: { auth: 'API token or OAuth', requirement: 'For basic authentication, use an Atlassian account email and API token with your Jira site URL.', access: 'The authenticated account’s project permissions still apply.', url: 'https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/' },
  postgresql: { auth: 'Database connection string', requirement: 'Provide host, database, and role credentials using the connection format required by your connector.', access: 'Database role privileges control queries and modifications.', url: 'https://www.postgresql.org/docs/current/libpq-connect.html' },
  supabase: { auth: 'Project URL and API key', requirement: 'Choose the key type for your API use case. Secret and service-role keys are privileged server credentials.', access: 'Key type, database permissions, and row-level security determine access.', url: 'https://supabase.com/docs/guides/getting-started/api-keys' },
  redis: { auth: 'Redis connection details', requirement: 'Use the server address, ACL credentials, and TLS settings required by your Redis deployment.', access: 'Redis ACLs govern the commands and key patterns available to the connection.', url: 'https://redis.io/docs/latest/develop/clients/' },
  docker: { auth: 'Docker daemon access', requirement: 'The connector needs access to a running Docker daemon through its configured socket or secured endpoint.', access: 'Daemon access can control containers and affect the host machine.', url: 'https://docs.docker.com/engine/security/protect-access/' },
  duckduckgo: { auth: 'No API key in this adapter', requirement: 'Unfuse’s current search adapter uses keyless web requests. It is not an authenticated DuckDuckGo account connection.', access: 'Search queries are sent to the search service; availability depends on its responses.', url: 'https://duckduckgo.com' },
  brave: { auth: 'Search API key', requirement: 'Create a Brave Search API subscription and obtain a key from the API dashboard.', access: 'Requests use the subscription’s quota and available endpoints.', url: 'https://api-dashboard.search.brave.com/app/documentation/web-search/get-started' },
  tavily: { auth: 'API key', requirement: 'Obtain an API key from your Tavily account. Requests consume your account’s credits.', access: 'Search and extraction requests follow the API plan and request parameters.', url: 'https://docs.tavily.com/documentation/quickstart' },
  exa: { auth: 'API key', requirement: 'Obtain an Exa API key and check the search endpoints and usage limits for your account.', access: 'Search and content retrieval use the authenticated API account.', url: 'https://exa.ai/docs/search/quickstart' },
  google: { auth: 'API key and search engine ID', requirement: 'Custom Search requests require both an API key and a Programmable Search Engine ID (cx). The API is closed to new customers; existing customers must migrate before its January 1, 2027 discontinuation.', access: 'Results depend on the configured search engine and API quota.', url: 'https://developers.google.com/custom-search/v1/overview' },
  discord: { auth: 'Bot token', requirement: 'Create a Discord application, add its bot to the server, and grant the permissions and intents your connector needs.', access: 'Server permissions, channel permissions, and enabled intents limit bot access.', url: 'https://docs.discord.com/developers/topics/oauth2' },
  mcp: { auth: 'Server-specific', requirement: 'Configure an MCP server with its supported transport and required credentials. MCP is a protocol, not an account provider.', access: 'Tools are discovered from the server. Access depends on the server and its authorization.', url: 'https://modelcontextprotocol.io/docs/learn/architecture' },
};

// These fields describe provider requirements; unsupported connector fields remain disabled.
const ADDITIONAL_FIELDS: Partial<Record<ServiceId, Array<{ label: string; placeholder: string }>>> = {
  slack: [{ label: 'Workspace ID', placeholder: 'T0123456789' }],
  jira: [{ label: 'Jira site URL', placeholder: 'https://your-team.atlassian.net' }, { label: 'Account email', placeholder: 'you@company.com' }],
  datadog: [{ label: 'Datadog site', placeholder: 'datadoghq.com' }, { label: 'Application key', placeholder: 'Scoped application key' }],
  posthog: [{ label: 'Instance URL', placeholder: 'https://us.posthog.com' }, { label: 'Project ID', placeholder: 'Your project ID' }],
  supabase: [{ label: 'Project URL', placeholder: 'https://your-project.supabase.co' }],
  google: [{ label: 'Search engine ID', placeholder: 'Programmable Search Engine ID (cx)' }],
  docker: [{ label: 'Docker endpoint', placeholder: 'Your Docker daemon socket or secured endpoint' }],
  mcp: [{ label: 'Server command or URL', placeholder: 'Your MCP server configuration' }],
};

interface PluginDetailCanvasProps {
  serviceId: ServiceId;
  onBack: () => void;
}

export const PluginDetailCanvas: React.FC<PluginDetailCanvasProps> = ({ serviceId, onBack }) => {
  const service = SERVICE_METADATA[serviceId];
  const guide = SETUP_GUIDES[serviceId];
  const [state, setState] = useState(() => getServiceState(serviceId));
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'settings'>('overview');
  const isAuthExpanded = activeTab === 'settings';
  const setIsAuthExpanded = (expanded: boolean) => setActiveTab(expanded ? 'settings' : 'overview');
  const [apiKeyInput, setApiKeyInput] = useState(state.apiKey || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const hasConfig = state.isConnected;
  const requiresOAuth = serviceId === 'gmail' || serviceId === 'googledrive';
  const additionalFields = ADDITIONAL_FIELDS[serviceId] || [];
  const incompleteSetup = requiresOAuth || additionalFields.length > 0;
  const credentialLabel = serviceId === 'jira' ? 'Atlassian API token' : serviceId === 'figma' ? 'Personal access token' : serviceId === 'datadog' ? 'API key' : serviceId === 'slack' ? 'Bot token' : serviceId === 'discord' ? 'Bot token' : serviceId === 'linear' ? 'Personal API key' : guide.auth;

  const category = service.category === 'engineering' ? 'Developer tools' : service.category === 'devtools' ? 'Developer tools' : service.category;

  const handleSave = () => {
    if (service.requiresKey !== false && !apiKeyInput.trim()) return;
    try {
      saveServiceConfig(serviceId, { isConnected: true, ...(service.requiresKey !== false ? { apiKey: apiKeyInput.trim() } : {}) });
      setState(getServiceState(serviceId));
      setIsAuthExpanded(false);
      setErrorMsg(null);
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Could not save configuration');
    }
  };

  const handleDisconnect = () => {
    disconnectService(serviceId);
    setState(getServiceState(serviceId));
    setApiKeyInput('');
    setIsAuthExpanded(false);
  };

  const handleCopy = async (prompt: string) => {
    await navigator.clipboard.writeText(prompt);
    setCopiedPrompt(prompt);
    window.setTimeout(() => setCopiedPrompt((current) => current === prompt ? null : current), 2000);
  };

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto pb-8" style={{ color: 'var(--text-main)' }}>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-6 hover:text-[var(--text-main)]" style={{ color: 'var(--text-muted)' }}>
        <ArrowLeft size={14} /> All integrations
      </button>

      <header className="flex flex-wrap items-start gap-4 pb-6 border-b border-[var(--border-subtle)]">
        <div className="w-14 h-14 flex items-center justify-center shrink-0">{renderIntegrationLogo(serviceId, 32)}</div>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-[10px] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-muted)' }}>{category}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
          <p className="text-sm leading-6 mt-1 max-w-lg" style={{ color: 'var(--text-muted)' }}>{service.tagline || service.description}</p>
        </div>
        <button onClick={() => setIsAuthExpanded(!isAuthExpanded)} aria-expanded={isAuthExpanded} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:opacity-85" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}><Settings2 size={14} />{hasConfig ? 'Manage setup' : 'Configure'}</button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs border-b border-[var(--border-subtle)]">
        <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />{hasConfig ? 'Configuration saved' : 'Not configured'}</span>
        <span style={{ color: 'var(--text-muted)' }}>Live connection not verified</span>
      </div>

      <nav aria-label="Integration sections" className="flex gap-5 border-b border-[var(--border-subtle)] mb-2">
        {(['overview', 'tools', 'settings'] as const).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`py-3 text-xs capitalize border-b-2 ${activeTab === tab ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)]'}`}>{tab}</button>)}
      </nav>
      {isAuthExpanded && (
        <section className="py-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="shrink-0">{renderIntegrationLogo(serviceId, 24)}</div>
            <div><h2 className="text-sm font-medium">{service.name} connection</h2><p className="text-[11px] text-[var(--text-muted)] mt-1">{guide.auth}</p></div>
          </div>
          {requiresOAuth ? <div className="space-y-3"><p className="text-xs leading-5 text-[var(--text-muted)]">Authorize your Google account and choose the access you want to grant.</p><button disabled className="flex items-center justify-center gap-2 w-full border border-[var(--border-subtle)] rounded-lg py-2.5 text-xs opacity-40 cursor-not-allowed">{renderIntegrationLogo(serviceId, 16)}Continue with Google</button><p className="text-[11px] text-[var(--text-muted)]">OAuth is not connected yet.</p></div> : <>
            {service.requiresKey !== false && <label className="block text-xs space-y-2"><span>{credentialLabel}</span><input disabled={incompleteSetup} type="password" autoComplete="off" value={incompleteSetup ? '' : apiKeyInput} onChange={(event) => setApiKeyInput(event.target.value)} placeholder={service.authPlaceholder || credentialLabel} className="block w-full min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-2.5 text-xs outline-none focus:border-[var(--border-strong)] select-text disabled:opacity-40 disabled:cursor-not-allowed" /></label>}
            {additionalFields.map(field => <label key={field.label} className="block text-xs space-y-2"><span>{field.label}</span><input disabled placeholder={field.placeholder} className="block w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-app)] p-2.5 text-xs opacity-40 cursor-not-allowed" /></label>)}
            {incompleteSetup ? <p className="text-[11px] leading-5 text-[var(--text-muted)]">These provider fields are not wired to the connector yet.</p> : service.requiresKey !== false ? <p className="text-[11px] leading-5 text-[var(--text-muted)]">Saved on this device in browser storage. Connection has not been verified.</p> : <p className="text-xs text-[var(--text-muted)]">No credentials required.</p>}
            {errorMsg && <p role="alert" className="text-xs text-red-400">{errorMsg}</p>}
            <button onClick={handleSave} disabled={incompleteSetup || (service.requiresKey !== false && !apiKeyInput.trim())} className="rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>{service.requiresKey === false ? 'Enable' : 'Save credential'}</button>
          </>}
          <div className="text-xs leading-5 text-[var(--text-muted)] space-y-2"><p>{guide.requirement}</p><p>{guide.access}</p><a href={guide.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--text-main)] hover:underline">{service.name} setup guide<ExternalLink size={12} /></a></div>
          {hasConfig && <button onClick={handleDisconnect} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs border border-[var(--border-subtle)]"><Trash2 size={13} />Disconnect {service.name}</button>}
        </section>
      )}

      {activeTab === 'overview' && <section className="py-6 border-b border-[var(--border-subtle)]">
        <h2 className="text-sm font-semibold mb-2">About this integration</h2>
        <p className="text-sm leading-6 max-w-2xl" style={{ color: 'var(--text-muted)' }}>{service.description}</p>
      </section>}

      <div className="grid gap-x-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {activeTab === 'tools' && <section className="py-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold mb-2"><Wrench size={15} style={{ color: 'var(--text-muted)' }} />Tool catalog</h2>
          <p className="text-[11px] leading-5 mb-4" style={{ color: 'var(--text-muted)' }}>Listed in Unfuse’s catalog. Availability has not been verified with a live connector.</p>
          {service.tools?.length ? <div className="rounded-xl border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">{service.tools.map((tool) => <div key={tool.name} className="p-3 bg-[var(--bg-surface)]"><h3 className="text-[11px] font-mono break-words">{tool.name}</h3><p className="text-xs leading-5 mt-1" style={{ color: 'var(--text-muted)' }}>{tool.description}</p></div>)}</div> : <p className="text-xs leading-5 rounded-xl border border-dashed border-[var(--border-subtle)] p-4" style={{ color: 'var(--text-muted)' }}>This server’s tools need to be discovered after connection.</p>}
        </section>}
      </div>

      {activeTab === 'overview' && service.examplePrompts?.length && <section className="py-5 border-t border-[var(--border-subtle)]"><h2 className="text-sm font-semibold mb-3">Example requests</h2><div className="space-y-2">{service.examplePrompts.map((prompt) => <button key={prompt} onClick={() => void handleCopy(prompt)} className="w-full flex items-start gap-3 p-3 text-left rounded-lg hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)]"><span className="flex-1 text-xs leading-5">{prompt}</span>{copiedPrompt === prompt ? <Check size={14} className="mt-1 shrink-0" /> : <Copy size={14} className="mt-1 shrink-0" />}</button>)}</div></section>}

      <footer className="pt-5 border-t border-[var(--border-subtle)] space-y-4">
        <div className="flex gap-2 text-xs leading-5" style={{ color: 'var(--text-muted)' }}><ShieldCheck size={15} className="shrink-0 mt-0.5" /><p>Provider permissions determine accessible data. This page does not grant model access or enable automatic sharing of chats and memory.</p></div>
        <div className="flex flex-wrap gap-5 text-xs" style={{ color: 'var(--text-muted)' }}>
          {[{ label: 'Documentation', url: service.docsUrl }, { label: 'Website', url: service.websiteUrl }, { label: 'Privacy', url: service.privacyUrl }, { label: 'Terms', url: service.termsUrl }].filter((link) => link.url).map((link) => <a key={link.label} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-[var(--text-main)]">{link.label}<ExternalLink size={11} /></a>)}
        </div>
      </footer>
    </div>
  );
};
