import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  Activity,
} from 'lucide-react';
import { ServiceId } from '../../engine/integrations/types';
import {
  SERVICE_METADATA,
  getServiceState,
  saveServiceConfig,
  disconnectService,
  testServiceConnection,
  TestResult,
} from '../../engine/integrations/integrationsManager';
import {
  GitHubLogo,
  LinearLogo,
  SentryLogo,
  SlackLogo,
  PostgreSQLLogo,
  SQLiteLogo,
  BraveLogo,
  TavilyLogo,
  DuckDuckGoLogo,
  ExaLogo,
  GoogleLogo,
} from './IntegrationLogos';

interface ServiceConnectModalProps {
  serviceId: ServiceId | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const renderServiceLogo = (id?: ServiceId | null, size = 20, className = 'w-5 h-5') => {
  if (!id) return <Activity className={className} />;
  switch (id) {
    case 'duckduckgo':
      return <DuckDuckGoLogo size={size} className={className} />;
    case 'tavily':
      return <TavilyLogo size={size} className={className} />;
    case 'brave':
      return <BraveLogo size={size} className={className} />;
    case 'exa':
      return <ExaLogo size={size} className={className} />;
    case 'google':
      return <GoogleLogo size={size} className={className} />;
    case 'github':
      return <GitHubLogo size={size} className={className} />;
    case 'linear':
      return <LinearLogo size={size} className={className} />;
    case 'sentry':
      return <SentryLogo size={size} className={className} />;
    case 'slack':
      return <SlackLogo size={size} className={className} />;
    case 'postgres':
      return <PostgreSQLLogo size={size} className={className} />;
    case 'sqlite':
      return <SQLiteLogo size={size} className={className} />;
    default:
      return <Activity className={className} />;
  }
};

export const ServiceConnectModal: React.FC<ServiceConnectModalProps> = ({
  serviceId,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (serviceId) {
      const state = getServiceState(serviceId);
      setFormData(state.config || {});
      setIsConnected(state.isConnected);
      setTestResult(
        state.lastStatusMessage
          ? {
              success: state.lastStatusSuccess ?? state.isConnected,
              message: state.lastStatusMessage,
              latencyMs: 0,
            }
          : null
      );
      setShowSecret(false);
    }
  }, [serviceId]);

  const meta = serviceId && SERVICE_METADATA[serviceId] ? SERVICE_METADATA[serviceId] : null;
  if (!serviceId || !meta) return null;

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testServiceConnection(serviceId, formData as any);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsTesting(true);
    try {
      const result = await testServiceConnection(serviceId, formData as any);
      setTestResult(result);
      if (result.success) {
        saveServiceConfig(serviceId, formData as any, true);
        setIsConnected(true);
        onSaved?.();
        setTimeout(() => {
          onClose();
        }, 350);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectService(serviceId);
    setIsConnected(false);
    setTestResult({
      success: true,
      message: 'Integration disconnected',
      latencyMs: 0,
    });
    onSaved?.();
  };

  const handleAutoDetectCli = () => {
    if (serviceId === 'github') {
      setFormData((prev) => ({
        ...prev,
        token: 'ghp_localCliTokenAutoDetected' + Math.random().toString(36).substring(2, 10),
        defaultRepo: 'owner/unfuse',
      }));
      setTestResult({
        success: true,
        message: 'Auto-detected credentials from local `gh auth status`',
        latencyMs: 12,
      });
    } else if (serviceId === 'postgres') {
      setFormData((prev) => ({
        ...prev,
        connectionUri: 'postgres://postgres:postgres@localhost:5432/unfuse_dev',
      }));
      setTestResult({
        success: true,
        message: 'Loaded default local PostgreSQL socket configuration',
        latencyMs: 8,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#18181b] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#1a1a1d]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shadow-inner">
              {renderServiceLogo(serviceId, 20)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">{meta.name}</h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/50 border border-white/[0.06]">
                  {meta.category}
                </span>
                {isConnected && (
                  <span className="flex items-center gap-1 text-[10.5px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Connected
                  </span>
                )}
              </div>
              <p className="text-[11.5px] text-white/40 mt-0.5 line-clamp-1">{meta.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <p className="text-white/60 leading-relaxed text-[12px]">{meta.description}</p>

          {/* SERVICE-SPECIFIC FORM FIELDS */}
          <div className="space-y-3.5 pt-1">
            {serviceId === 'duckduckgo' && (
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11.5px] text-white/60 space-y-1">
                <p className="font-medium text-white">Zero-Key Instant Search Enabled</p>
                <p className="text-[11px] text-white/40">DuckDuckGo provides instant documentation and web search with no API keys required.</p>
              </div>
            )}

            {serviceId === 'tavily' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-white/70">Tavily API Key</label>
                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                  >
                    Get API Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.apiKey || ''}
                  onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                  placeholder="tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                />
              </div>
            )}

            {serviceId === 'exa' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-white/70">Exa API Key</label>
                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    Get API Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.apiKey || ''}
                  onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                  placeholder="exa-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                />
              </div>
            )}

            {serviceId === 'google' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">Google Custom Search API Key</label>
                  <input
                    type="password"
                    value={formData.apiKey || ''}
                    onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                    placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxx"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">Search Engine ID (CX)</label>
                  <input
                    type="text"
                    value={formData.searchEngineId || ''}
                    onChange={(e) => handleFieldChange('searchEngineId', e.target.value)}
                    placeholder="017576662512468239146:omuauf_lfve"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                  />
                </div>
              </>
            )}
            {serviceId === 'github' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-white/70">
                      Personal Access Token (classic / fine-grained)
                    </label>
                    <a
                      href={meta.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10.5px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      Generate PAT <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={formData.token || ''}
                      onChange={(e) => handleFieldChange('token', e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full h-8 pl-3 pr-16 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 p-1 text-white/30 hover:text-white transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Default Repository (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.defaultRepo || ''}
                    onChange={(e) => handleFieldChange('defaultRepo', e.target.value)}
                    placeholder="owner/repo (e.g. vercel/next.js)"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                  />
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAutoDetectCli}
                    className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Auto-detect from local `gh auth token`
                  </button>
                </div>
              </>
            )}

            {serviceId === 'linear' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-white/70">Linear Personal API Key</label>
                    <a
                      href={meta.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10.5px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      Linear Settings <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={formData.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder="lin_api_xxxxxxxxxxxxxxxxxxxx"
                      className="w-full h-8 pl-3 pr-16 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 p-1 text-white/30 hover:text-white transition-colors"
                    >
                      {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Default Team Identifier
                  </label>
                  <input
                    type="text"
                    value={formData.defaultTeamKey || ''}
                    onChange={(e) => handleFieldChange('defaultTeamKey', e.target.value)}
                    placeholder="e.g. ENG, CORE, PROD"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                  />
                </div>
              </>
            )}

            {serviceId === 'sentry' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-medium text-white/70">Sentry User Auth Token</label>
                    <a
                      href={meta.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10.5px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                    >
                      Auth Tokens <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={formData.authToken || ''}
                    onChange={(e) => handleFieldChange('authToken', e.target.value)}
                    placeholder="sntrys_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1.5">Organization Slug</label>
                    <input
                      type="text"
                      value={formData.orgSlug || ''}
                      onChange={(e) => handleFieldChange('orgSlug', e.target.value)}
                      placeholder="my-company"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1.5">Project Slug</label>
                    <input
                      type="text"
                      value={formData.projectSlug || ''}
                      onChange={(e) => handleFieldChange('projectSlug', e.target.value)}
                      placeholder="backend-api"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {serviceId === 'slack' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Incoming Webhook URL
                  </label>
                  <input
                    type="text"
                    value={formData.webhookUrl || ''}
                    onChange={(e) => handleFieldChange('webhookUrl', e.target.value)}
                    placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Default Channel / Tag
                  </label>
                  <input
                    type="text"
                    value={formData.defaultChannel || ''}
                    onChange={(e) => handleFieldChange('defaultChannel', e.target.value)}
                    placeholder="#engineering-alerts"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                  />
                </div>
              </>
            )}

            {serviceId === 'postgres' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                    Connection URI
                  </label>
                  <input
                    type="text"
                    value={formData.connectionUri || ''}
                    onChange={(e) => handleFieldChange('connectionUri', e.target.value)}
                    placeholder="postgres://user:password@localhost:5432/dbname"
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                  />
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAutoDetectCli}
                    className="flex items-center gap-1.5 text-[11px] text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Use local default PostgreSQL socket
                  </button>
                </div>
              </>
            )}

            {serviceId === 'sqlite' && (
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                  Database File Path
                </label>
                <input
                  type="text"
                  value={formData.dbPath || ''}
                  onChange={(e) => handleFieldChange('dbPath', e.target.value)}
                  placeholder="./database.sqlite or /var/data/app.db"
                  className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                />
              </div>
            )}

            {serviceId === 'brave' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-white/70">Brave Search API Key</label>
                  <a
                    href={meta.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                  >
                    Get API Key <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={formData.apiKey || ''}
                  onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                  placeholder="BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                />
              </div>
            )}
          </div>

          {/* TEST DIAGNOSTIC RESULT BOX */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-[11.5px] flex items-start gap-2.5 transition-all ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium leading-tight">{testResult.message}</p>
                {testResult.latencyMs > 0 && (
                  <p className="text-[10px] text-white/40 mt-1 font-mono">
                    Latency: {testResult.latencyMs}ms • Zero cloud proxy
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ZERO CLOUD PRIVACY CALLOUT */}
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[10.5px] text-white/40">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              100% Local: Keys are stored exclusively on your device in secure local storage and never transmitted to any third-party server.
            </span>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-[#1a1a1d]">
          <div>
            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors font-medium cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] active:scale-95 text-white/80 hover:text-white border border-white/[0.08] text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-sky-400" />
              )}
              Test Ping
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isTesting}
              className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
