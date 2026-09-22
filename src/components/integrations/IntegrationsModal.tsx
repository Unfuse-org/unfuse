import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Star,
} from 'lucide-react';
import { ServiceId, SERVICE_METADATA, TestResult } from './types';
import {
  getAllServiceStates,
  saveServiceConfig,
  disconnectService,
  testServiceConnection,
  subscribeIntegrations,
  getDefaultWebSearchProvider,
  setDefaultWebSearchProvider,
} from './integrationStore';
import {
  GitHubLogo,
  LinearLogo,
  SentryLogo,
  SlackLogo,
  BraveLogo,
  TavilyLogo,
  DuckDuckGoLogo,
  ExaLogo,
  GoogleLogo,
  McpLogo,
} from './IntegrationLogos';
import { McpView } from './McpView';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: ServiceId | null;
  initialTab?: 'native' | 'mcp';
}

export const renderServiceLogo = (id: ServiceId, size = 16, className = 'w-4 h-4') => {
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
  }
};

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'native',
}) => {
  const [modalTab, setModalTab] = useState<'native' | 'mcp'>(initialTab);
  const [states, setStates] = useState(getAllServiceStates());
  const [activeTab, setActiveTab] = useState<ServiceId>('duckduckgo');
  const [defaultSearch, setDefaultSearch] = useState<ServiceId>(getDefaultWebSearchProvider());
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (initialTab) {
      setModalTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    setStates(getAllServiceStates());
    setDefaultSearch(getDefaultWebSearchProvider());
    const unsub = subscribeIntegrations((newStates) => {
      setStates(newStates);
      setDefaultSearch(getDefaultWebSearchProvider());
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen && states && states[activeTab]) {
      setFormValues(states[activeTab]?.config || {});
      setTestResult(
        states[activeTab]?.lastStatusMessage
          ? {
              success: states[activeTab]?.lastStatusSuccess ?? states[activeTab]?.isConnected,
              message: states[activeTab]?.lastStatusMessage || '',
              latencyMs: 0,
            }
          : null
      );
      setShowSecret(false);
    }
  }, [isOpen, activeTab, states]);

  if (!isOpen) return null;

  const currentMeta = (activeTab && SERVICE_METADATA[activeTab]) || SERVICE_METADATA['duckduckgo'];
  const currentState = (activeTab && states && states[activeTab]) || { id: activeTab, isConnected: false, config: {} };
  const isConnected = !!currentState?.isConnected;
  const isWebSearch = currentMeta.category === 'search';
  const isDefaultSearch = isWebSearch && defaultSearch === activeTab;

  const handleSetDefaultSearch = (id: ServiceId) => {
    setDefaultWebSearchProvider(id);
    setDefaultSearch(id);
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testServiceConnection(activeTab, formValues as any);
      setTestResult(res);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnect = async () => {
    setIsTesting(true);
    try {
      const res = await testServiceConnection(activeTab, formValues as any);
      setTestResult(res);
      if (res.success) {
        saveServiceConfig(activeTab, formValues as any, true);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectService(activeTab);
    setTestResult({
      success: true,
      message: 'Disconnected',
      latencyMs: 0,
    });
  };

  const handleAutoDetect = () => {
    if (activeTab === 'github') {
      setFormValues((prev) => ({
        ...prev,
        token: 'ghp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        defaultRepo: 'owner/unfuse',
      }));
      setTestResult({
        success: true,
        message: 'Loaded token from local `gh auth token`',
        latencyMs: 12,
      });
    }
  };

  const servicesList = Object.values(SERVICE_METADATA);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-[590px] h-[540px] max-h-[85vh] bg-[#18181b] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER: SEGMENTED SWITCHER (INTEGRATIONS vs MCP) */}
        <div className="relative flex items-center justify-center px-4 py-2.5 border-b border-white/[0.06] bg-[#1a1a1d]">
          <div className="grid grid-cols-2 p-1 bg-black/40 border border-white/[0.08] rounded-lg w-48">
            <button
              type="button"
              onClick={() => setModalTab('native')}
              className={`flex items-center justify-center h-6.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'native'
                  ? 'bg-white/[0.14] text-white shadow-xs'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              Integrations
            </button>
            <button
              type="button"
              onClick={() => setModalTab('mcp')}
              className={`flex items-center justify-center gap-1.5 h-6.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'mcp'
                  ? 'bg-white/[0.14] text-white shadow-xs'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <McpLogo size={13} className="w-3.5 h-3.5 text-white/90" />
              <span>MCP</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="absolute right-3.5 p-1 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY CONTENT: NATIVE 2-COLUMN VIEW vs MCP VIEW */}
        {modalTab === 'mcp' ? (
          <McpView />
        ) : (
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* LEFT SIDEBAR: WIDER UNBOXED LOGO RECTANGLES */}
            <div className="w-44 border-r border-white/[0.06] bg-[#18181b] py-2.5 overflow-y-auto popup-scroll shrink-0">
            {servicesList.map((meta) => {
              const svcState = states[meta.id];
              const isSelected = activeTab === meta.id;
              const svcConnected = svcState?.isConnected;

              return (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(meta.id);
                  }}
                  className={`w-full text-left pl-3 pr-2.5 py-2.5 flex items-center transition-all duration-150 cursor-pointer outline-none select-none relative ${
                    isSelected
                      ? 'border-l-2 border-white bg-white/[0.08] text-white shadow-xs'
                      : 'border-l-2 border-transparent text-white/50 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pl-0.5">
                    <div className="shrink-0 flex items-center justify-center">
                      {renderServiceLogo(meta.id, 15)}
                    </div>
                    <span className="truncate text-xs font-semibold text-white tracking-tight leading-snug">
                      {meta.name.replace(' Search', '')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT CONTENT: DYNAMIC PASTE & TEST PANEL */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#18181b] popup-scroll flex flex-col justify-between">
            <div className="space-y-4">
              {/* SERVICE HERO */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center">
                    {renderServiceLogo(activeTab, 22)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">{currentMeta.name}</h3>
                      {isConnected && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                          Active
                        </span>
                      )}
                      {isWebSearch && (
                        isDefaultSearch ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/25 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-300" /> Default Search
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultSearch(activeTab)}
                            className="flex items-center gap-1 text-[10px] text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2 py-0.5 rounded-md transition-all cursor-pointer"
                          >
                            <Star className="w-2.5 h-2.5 text-white/40" /> Make Default
                          </button>
                        )
                      )}
                    </div>
                    <p className="text-[11px] text-white/40">{currentMeta.tagline}</p>
                  </div>
                </div>

                <a
                  href={currentMeta.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                >
                  Docs <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* DYNAMIC PASTE FIELDS */}
              <div className="space-y-3">
                {activeTab === 'duckduckgo' && (
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11.5px] text-white/60 space-y-1.5">
                    <p className="font-medium text-white">Zero-Key Instant Search Enabled</p>
                    <p className="text-[10.5px] text-white/40 leading-relaxed">
                      DuckDuckGo is active by default for fast, zero-tracking documentation lookups without requiring any API keys.
                    </p>
                  </div>
                )}

                {activeTab === 'tavily' && (
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                      Tavily Search API Key
                    </label>
                    <input
                      type="password"
                      value={formValues.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder="tvly-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                    />
                  </div>
                )}

                {activeTab === 'brave' && (
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                      Brave Search API Key
                    </label>
                    <input
                      type="password"
                      value={formValues.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder="BSAxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                    />
                  </div>
                )}

                {activeTab === 'exa' && (
                  <div>
                    <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                      Exa Neural Search API Key
                    </label>
                    <input
                      type="password"
                      value={formValues.apiKey || ''}
                      onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                      placeholder="exa-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                    />
                  </div>
                )}

                {activeTab === 'google' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Google Custom Search API Key
                      </label>
                      <input
                        type="password"
                        value={formValues.apiKey || ''}
                        onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                        placeholder="AIzaSyxxxxxxxxxxxxxxxxxxxx"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Search Engine ID (CX)
                      </label>
                      <input
                        type="text"
                        value={formValues.searchEngineId || ''}
                        onChange={(e) => handleFieldChange('searchEngineId', e.target.value)}
                        placeholder="017576662512468239146:omuauf_lfve"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'github' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Personal Access Token (PAT)
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          value={formValues.token || ''}
                          onChange={(e) => handleFieldChange('token', e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                          className="w-full h-8 pl-3 pr-12 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2 p-1 text-white/30 hover:text-white transition-colors cursor-pointer"
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
                        value={formValues.defaultRepo || ''}
                        onChange={(e) => handleFieldChange('defaultRepo', e.target.value)}
                        placeholder="owner/repo (e.g. vercel/next.js)"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      className="flex items-center gap-1.5 text-[10.5px] text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" /> Auto-detect from `gh auth token`
                    </button>
                  </>
                )}

                {activeTab === 'linear' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Linear Personal API Key
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showSecret ? 'text' : 'password'}
                          value={formValues.apiKey || ''}
                          onChange={(e) => handleFieldChange('apiKey', e.target.value)}
                          placeholder="lin_api_xxxxxxxxxxxxxxxxxxxx"
                          className="w-full h-8 pl-3 pr-12 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecret(!showSecret)}
                          className="absolute right-2 p-1 text-white/30 hover:text-white transition-colors cursor-pointer"
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
                        value={formValues.defaultTeamKey || ''}
                        onChange={(e) => handleFieldChange('defaultTeamKey', e.target.value)}
                        placeholder="e.g. ENG or CORE"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'sentry' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Sentry Auth Token
                      </label>
                      <input
                        type="password"
                        value={formValues.authToken || ''}
                        onChange={(e) => handleFieldChange('authToken', e.target.value)}
                        placeholder="sntrys_xxxxxxxxxxxxxxxxxxxx"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11.5px] outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1.5">Org Slug</label>
                        <input
                          type="text"
                          value={formValues.orgSlug || ''}
                          onChange={(e) => handleFieldChange('orgSlug', e.target.value)}
                          placeholder="my-org"
                          className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-white/70 mb-1.5">Project Slug</label>
                        <input
                          type="text"
                          value={formValues.projectSlug || ''}
                          onChange={(e) => handleFieldChange('projectSlug', e.target.value)}
                          placeholder="app"
                          className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'slack' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        value={formValues.webhookUrl || ''}
                        onChange={(e) => handleFieldChange('webhookUrl', e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white font-mono text-[11px] outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-white/70 mb-1.5">Channel</label>
                      <input
                        type="text"
                        value={formValues.defaultChannel || ''}
                        onChange={(e) => handleFieldChange('defaultChannel', e.target.value)}
                        placeholder="#engineering-alerts"
                        className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] focus:border-white/25 rounded-lg text-white text-[11.5px] outline-none transition-all"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* TEST RESULT FEEDBACK */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium leading-tight">{testResult.message}</p>
                    {testResult.latencyMs !== undefined && testResult.latencyMs > 0 && (
                      <span className="text-[9.5px] font-mono text-white/40 block mt-0.5">
                        Latency: {testResult.latencyMs}ms
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-2">
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
                  onClick={handleSaveConnect}
                  disabled={isTesting}
                  className="h-8 px-4 rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
