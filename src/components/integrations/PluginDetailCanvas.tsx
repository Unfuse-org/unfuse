import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Key,
  Shield,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  ServiceId,
  ServiceMetadata,
  SERVICE_METADATA,
} from './types';
import {
  getServiceState,
  saveServiceConfig,
  disconnectService,
} from './integrationStore';
import { renderIntegrationLogo } from './IntegrationLogos';

interface PluginDetailCanvasProps {
  serviceId: ServiceId;
  onBack: () => void;
}

export const PluginDetailCanvas: React.FC<PluginDetailCanvasProps> = ({
  serviceId,
  onBack,
}) => {
  const service: ServiceMetadata = SERVICE_METADATA[serviceId] || {
    id: serviceId,
    name: serviceId,
    category: 'devtools',
    description: '',
  };

  const [state, setState] = useState(() => getServiceState(serviceId));
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [isAuthExpanded, setIsAuthExpanded] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(state?.apiKey || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isConnected = state?.isConnected || false;

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(prompt);
    setTimeout(() => {
      setCopiedPrompt((curr) => (curr === prompt ? null : curr));
    }, 2000);
  };

  const handleConnect = () => {
    if (service.requiresKey === false) {
      saveServiceConfig(serviceId, { isConnected: true });
      setState(getServiceState(serviceId));
      return;
    }
    if (!apiKeyInput.trim()) {
      setIsAuthExpanded(true);
      return;
    }
    try {
      saveServiceConfig(serviceId, {
        isConnected: true,
        apiKey: apiKeyInput.trim(),
      });
      setState(getServiceState(serviceId));
      setSaveSuccess(true);
      setErrorMsg(null);
      setIsAuthExpanded(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const handleDisconnect = () => {
    disconnectService(serviceId);
    setState(getServiceState(serviceId));
    setIsAuthExpanded(false);
  };

  // Derive Example Prompts
  const examplePrompts = service.examplePrompts && service.examplePrompts.length > 0
    ? service.examplePrompts
    : [
        `Explain how to use ${service.name} to accelerate workflow automation and debugging`,
        `Inspect recent events and query active data from ${service.name}`,
        `Summarize recent updates and produce an actionable status report from ${service.name}`,
      ];

  // Derive Apps
  const apps = service.apps && service.apps.length > 0
    ? service.apps
    : [
        {
          name: service.name,
          description: service.description || `Access and query ${service.name} from agent context.`,
        },
      ];

  // Formatting helpers
  const accountEmail = service.accountEmail || 'proffersor45@gmail.com';
  const capabilities = service.capabilities || 'Interactive, Write';
  const developer = service.developer || 'OpenAI';
  const version = service.version || '0.1.12-5f7cd798dc99';
  const categoryLabel = service.category === 'engineering'
    ? 'Developer Tools'
    : service.category.charAt(0).toUpperCase() + service.category.slice(1);

  return (
    <div
      className="flex flex-col gap-8 pb-16 max-w-5xl mx-auto w-full font-sans select-none animate-in fade-in duration-200"
      style={{ color: 'var(--text-main)' }}
    >
      {/* 1. TOP BREADCRUMB / BACK NAVIGATION */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer group"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Plugins</span>
        </button>
      </div>

      {/* 2. HERO HEADER: LOGO, NAME, TAGLINE, SOLID CALM STATUS, ACTION BUTTON */}
      <div
        className="flex items-start justify-between gap-6 pb-6 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-start gap-5 min-w-0">
          <div
            className="w-16 h-16 border flex items-center justify-center shrink-0 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {renderIntegrationLogo(service.id, 42)}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                {service.name}
              </h1>
              {/* SOLID CALM STATUS BADGE (STRICTLY NO GREEN PULSE ANIMATION) */}
              {isConnected ? (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 border text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-active)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--accent)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                  <span>Connected</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-0.5 border text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full opacity-40" style={{ backgroundColor: 'var(--text-muted)' }} />
                  <span>Not connected</span>
                </div>
              )}
            </div>

            <p className="text-sm mt-1 leading-snug" style={{ color: 'var(--text-muted)' }}>
              {service.tagline || service.description}
            </p>
          </div>
        </div>

        {/* TOP RIGHT ACTION */}
        <div className="shrink-0 flex items-center gap-2">
          {isConnected ? (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3.5 py-1.5 border text-xs font-medium transition-all cursor-pointer hover:opacity-80"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-fg)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. PROMPT CARDS (3 PROMINENT AGENT USE-CASE CARDS) */}
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {examplePrompts.map((prompt, i) => (
            <div
              key={i}
              onClick={() => handleCopyPrompt(prompt)}
              className="border p-4 cursor-pointer transition-all flex flex-col justify-between group min-h-[128px]"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              title="Click to copy prompt"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-5 h-5 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--bg-app)' }}
                >
                  {renderIntegrationLogo(service.id, 14)}
                </div>
                <span
                  className="text-[11px] font-semibold transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {service.name}
                </span>
              </div>

              <p className="text-xs leading-relaxed font-normal transition-colors" style={{ color: 'var(--text-main)' }}>
                {prompt}
              </p>

              <div className="mt-3 flex items-center justify-end text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {copiedPrompt === prompt ? (
                  <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--accent)' }}>
                    <Check className="w-3 h-3" /> Copied
                  </span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Click to copy
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. OVERVIEW PARAGRAPH */}
      <div className="text-xs text-white/70 leading-relaxed max-w-4xl">
        <p>
          {service.overview || service.description}
        </p>
      </div>

      {/* 5. APPS SECTION */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white tracking-tight">Apps</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono font-medium">
            {apps.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {apps.map((app, i) => (
            <div
              key={i}
              className="bg-[#101114] border border-white/[0.06] rounded-xl p-3.5 flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                {renderIntegrationLogo(service.id, 18)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white">{app.name}</span>
                <span className="text-xs text-white/50 mt-0.5 leading-snug">
                  {app.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. CONNECTED ACCOUNTS SECTION */}
      <div className="flex flex-col gap-3 pt-2">
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Connected accounts
        </h2>

        {isConnected ? (
          <div className="flex flex-col gap-2">
            <div className="bg-[#101114] border border-white/[0.06] rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-semibold text-white">
                  {(accountEmail || 'u')[0].toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {accountEmail}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono text-white/70">
                      Primary
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDisconnect}
                className="text-xs text-white/40 hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 rounded"
              >
                Disconnect
              </button>
            </div>

            <button
              onClick={() => setIsAuthExpanded(!isAuthExpanded)}
              className="self-start text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect another account</span>
            </button>
          </div>
        ) : (
          <div className="bg-[#101114] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs text-white/40">No accounts connected yet</span>
            <button
              onClick={() => setIsAuthExpanded(!isAuthExpanded)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect account</span>
            </button>
          </div>
        )}

        {/* INLINE AUTH FORM DRAWER */}
        {isAuthExpanded && (
          <div className="bg-[#101114] border border-white/[0.1] rounded-xl p-4 flex flex-col gap-3 mt-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-white/60" />
                <span className="text-xs font-semibold text-white">
                  Authentication & Credentials
                </span>
              </div>
              <button
                onClick={() => setIsAuthExpanded(false)}
                className="text-xs text-white/40 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-white/60">
                {service.authPlaceholder || 'API Key or Access Token'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={service.authPlaceholder || 'Enter token or key'}
                  className="flex-1 h-8 px-3 rounded-lg bg-black border border-white/[0.1] focus:border-white/30 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={handleConnect}
                  disabled={service.requiresKey !== false && !apiKeyInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Save & Connect
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Account successfully connected!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. INFORMATION SECTION */}
      <div className="flex flex-col gap-4 pt-2">
        <h2 className="text-sm font-semibold text-white tracking-tight">Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-white/40 block text-[11px]">Capabilities</span>
            <span className="text-white/90 font-medium mt-0.5 block">{capabilities}</span>
          </div>

          <div>
            <span className="text-white/40 block text-[11px]">Developer</span>
            <span className="text-white/90 font-medium mt-0.5 block">{developer}</span>
          </div>

          <div>
            <span className="text-white/40 block text-[11px]">Category</span>
            <span className="text-white/90 font-medium mt-0.5 block">{categoryLabel}</span>
          </div>

          <div>
            <span className="text-white/40 block text-[11px]">Version</span>
            <span className="text-white/90 font-mono text-[11px] mt-0.5 block">{version}</span>
          </div>
        </div>

        {/* EXTERNAL LINKS */}
        <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-white/60">
          <a
            href={service.websiteUrl || service.docsUrl || 'https://github.com'}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Website</span>
            <ExternalLink className="w-3 h-3 text-white/40" />
          </a>

          <a
            href={service.privacyUrl || 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Privacy Policy</span>
            <ExternalLink className="w-3 h-3 text-white/40" />
          </a>

          <a
            href={service.termsUrl || 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service'}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Terms of Service</span>
            <ExternalLink className="w-3 h-3 text-white/40" />
          </a>
        </div>
      </div>

      {/* 8. SECURITY & DATA DISCLOSURE CALLOUT */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3 mt-2">
        <Shield className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
        <p className="text-[11px] text-white/40 leading-relaxed">
          This plugin may contain one or more apps, as listed above. When connected to an app, Unfuse may share relevant chats and memories with the app to help provide context for your requests. An app’s use of this data is subject to their terms and privacy policy, which can be found on the app’s page. If you have Memory enabled, data from the app may be used to proactively provide helpful information or suggestions. Unfuse always respects your training data preferences, including for data from connected apps. Use of apps may come with elevated risk. You can manage your preferences or disconnect from apps anytime in your settings.{' '}
          <a
            href={service.docsUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="text-white/60 hover:text-white underline underline-offset-2 transition-colors inline-block"
          >
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
};
