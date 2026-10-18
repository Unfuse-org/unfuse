import React, { useState, useEffect } from 'react';
import { Check, Palette, Server, ChevronRight, Settings2, MessageSquare, ShieldCheck, Database, SlidersHorizontal, Sun, Trees, Flower2, Search, Keyboard, Waves, Mountain, Snowflake, Disc3, Contrast } from 'lucide-react';
import unfuseLogo from '../../assets/logo.png';
import { ThemeId, THEMES, applyTheme, getStoredTheme } from '../../theme/themes';
import { LocalModelBlade } from '../rack/types';

const themeIcons = { light: Sun, 'rose-pine': Flower2, everforest: Trees, nord: Snowflake, ocean: Waves, gruvbox: Disc3, 'high-contrast': Contrast, sand: Mountain };

function ThemeIcon({ id }: { id: ThemeId }) {
  const Icon = id === 'unfuse' ? null : themeIcons[id];
  return <span className="w-7 h-7 shrink-0 flex items-center justify-center" style={{ color: THEMES[id].category === 'light' ? 'var(--text-main)' : THEMES[id].colors.accent }}>
    {Icon ? <Icon size={18} strokeWidth={1.8} aria-hidden="true" /> : <img src={unfuseLogo} alt="" className="w-6 h-6 rounded" />}
  </span>;
}

interface SettingsViewProps {
  models: LocalModelBlade[];
  onOpenRack: () => void;
}

const sections = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'models', label: 'Models', icon: Server },
  { id: 'chat', label: 'Chat & pipeline', icon: MessageSquare },
  { id: 'tools', label: 'Tools & permissions', icon: ShieldCheck },
  { id: 'data', label: 'Data & storage', icon: Database },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: Keyboard },
] as const;

export const SettingsView: React.FC<SettingsViewProps> = ({ models, onOpenRack }) => {
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<typeof sections[number]['id']>('appearance');
  const [activeThemeId, setActiveThemeId] = useState<ThemeId>(getStoredTheme);
  useEffect(() => {
    const change = (event: Event) => setActiveThemeId((event as CustomEvent<ThemeId>).detail);
    window.addEventListener('unfuse_theme_changed', change);
    return () => window.removeEventListener('unfuse_theme_changed', change);
  }, []);

  const matchingSections = sections.filter((item) => `${item.label} ${detailSections[item.id]?.map((group) => `${group.title} ${group.rows.map((row) => `${row.label} ${row.description}`).join(' ')}`).join(' ') || ''}`.toLowerCase().includes(query.toLowerCase().trim()));
  const firstMatch = matchingSections[0]?.id;
  const sectionMatches = matchingSections.some((item) => item.id === section);
  useEffect(() => {
    if (query.trim() && !sectionMatches && firstMatch) setSection(firstMatch);
  }, [query, sectionMatches, firstMatch]);
  return (
    <div className="flex-1 h-full flex min-h-0" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <aside className="w-56 shrink-0 px-3 py-6 overflow-y-auto" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-panel)' }}>
        <h1 className="text-sm font-semibold px-3 mb-5 flex items-center gap-2"><Settings2 size={16} /> Settings</h1>
        <label className="flex items-center gap-2 px-3 py-2 mb-5 rounded-lg border" style={{ borderColor: 'var(--border-subtle)' }}><Search size={14} style={{ color: 'var(--text-muted)' }} /><input aria-label="Search settings" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a setting…" className="w-full min-w-0 bg-transparent outline-none text-xs" /></label>
        {matchingSections.length === 0 && <p className="text-xs px-3" style={{ color: 'var(--text-muted)' }}>No matching settings.</p>}
        <nav aria-label="Settings sections" className="space-y-1">
          {matchingSections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-left hover:bg-[var(--bg-surface-hover)]" style={{ backgroundColor: section === id ? 'var(--bg-active)' : undefined, color: section === id ? 'var(--text-main)' : 'var(--text-muted)' }}><Icon size={16} strokeWidth={1.8} />{label}</button>)}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto px-6 lg:px-10 py-7">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Workspace preferences</p>
          <h2 className="text-xl font-medium">{sections.find((item) => item.id === section)?.label}</h2>
          {(section === 'general' || section === 'chat' || section === 'tools' || section === 'data' || section === 'shortcuts') && <SettingsDetails section={section} query={query} /> }
          {section === 'appearance' && <>
            <p className="text-xs mt-2 mb-8" style={{ color: 'var(--text-muted)' }}>Choose a palette for your workspace. Changes apply immediately.</p>
            {(['dark', 'light'] as const).map((category) => <section key={category} className="mb-8">
              <h3 className="text-xs font-medium capitalize mb-3">{category} themes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.values(THEMES).filter((theme) => theme.category === category).map((theme) => <button key={theme.id} onClick={() => applyTheme(theme.id)} aria-pressed={theme.id === activeThemeId} className="rounded-xl border p-3 text-left hover:bg-[var(--bg-surface-hover)] transition-colors" style={{ borderColor: theme.id === activeThemeId ? 'var(--accent)' : 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
                  <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2.5 text-xs font-medium"><ThemeIcon id={theme.id} />{theme.name}{theme.id === 'unfuse' && <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>Default</span>}</span>{theme.id === activeThemeId && <Check size={14} style={{ color: 'var(--accent)' }} />}</div>
                  <div className="flex gap-1.5 mt-3">{theme.swatches.map((color, index) => <span key={index} className="h-5 flex-1 rounded-sm border border-black/10" style={{ backgroundColor: color }} />)}</div>
                </button>)}
              </div>
            </section>)}
            <SettingsDetails section="appearance" query={query} />
          </>}
          {section === 'models' && <>
            <p className="text-xs mt-2 mb-6 leading-6" style={{ color: 'var(--text-muted)' }}>Your rack connects models from different inference providers. Manage endpoints and per-model generation settings there.</p>
            <button onClick={onOpenRack} className="w-full p-4 border rounded-xl flex items-center gap-3 text-left hover:bg-[var(--bg-surface-hover)]" style={{ borderColor: 'var(--border-subtle)' }}><Server size={18} /><div className="flex-1"><p className="text-sm">Model rack</p><p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{models.length} configured {models.length === 1 ? 'model' : 'models'}</p></div><ChevronRight size={16} /></button>
            <SettingsDetails section="models" query={query} />
            <div className="mt-4">{models.map((model) => <div key={model.id} className="py-3 border-b flex justify-between gap-3 text-xs" style={{ borderColor: 'var(--border-subtle)' }}><span className="truncate">{model.displayName}</span><span style={{ color: 'var(--text-muted)' }}>{model.provider}</span></div>)}</div>
          </>}

        </div>
      </div>
    </div>
  );
};

type SettingRow = { label: string; description: string; choices?: string[]; numeric?: boolean; action?: string };
const detailSections: Record<string, { title: string; rows: SettingRow[] }[]> = {
  shortcuts: [{ title: 'Keyboard preferences', rows: [
    { label: 'Open settings', description: 'Configure a shortcut for workspace preferences.', choices: ['Assign shortcut'] },
    { label: 'Toggle chat sidebar', description: 'Show or hide the conversation list.', choices: ['Assign shortcut'] },
    { label: 'Open model rack', description: 'Show or hide your model connections.', choices: ['Assign shortcut'] },
    { label: 'Open workspace tools', description: 'Access files, changes, and the interactive terminal.', choices: ['Assign shortcut'] },
    { label: 'Cancel active run', description: 'Stop model execution when chat is connected.', choices: ['Assign shortcut'] },
  ] }],
  general: [
    { title: 'Startup & workspace', rows: [
      { label: 'Start page', description: 'Choose what opens when you launch Unfuse.', choices: ['Dashboard', 'Last conversation', 'New conversation'] },
      { label: 'Restore workspace', description: 'Reopen your previous project and conversation.' },
      { label: 'Prevent sleep during runs', description: 'Keep the computer awake while a local task is running.' },
      { label: 'Launch at login', description: 'Start Unfuse when you sign in to your computer.' },
    ] },
    { title: 'Notifications', rows: [
      { label: 'Run completed', description: 'Notify you when a model or pipeline finishes.' },
      { label: 'Approval needed', description: 'Notify you when a model needs permission to continue.' },
      { label: 'Run failed', description: 'Notify you when a task ends with an error.' },
    ] },
  ],
  appearance: [{ title: 'Typography & display', rows: [
    { label: 'Interface font size', description: 'Text size for navigation and workspace controls.', numeric: true },
    { label: 'Code font size', description: 'Text size in code, changes, and terminal output.', numeric: true },
    { label: 'Reduced motion', description: 'Minimize animations and transitions.' },
  ] }],
  models: [
    { title: 'Model lifecycle', rows: [
      { label: 'Load when needed', description: 'Request model loading only when a task uses it, where supported.' },
      { label: 'Idle unload timeout', description: 'Minutes before requesting unload from a supported inference provider.', numeric: true },
      { label: 'Connection health checks', description: 'Check configured provider endpoints without scanning unrelated ports.' },
      { label: 'Request timeout', description: 'Maximum seconds to wait for a provider response.', numeric: true },
    ] },
    { title: 'Generation settings', rows: [
      { label: 'Per-model configuration', description: 'Temperature, context length, output limits, and sampling belong to each model in the rack.', choices: ['Configure in model rack'] },
    ] },
  ],
  chat: [
    { title: 'Conversation', rows: [
      { label: 'Send shortcut', description: 'Choose how to submit a message.', choices: ['Enter', 'Command / Ctrl + Enter'] },
      { label: 'Default model', description: 'Model selected when starting a new conversation.', choices: ['Choose from rack'] },
      { label: 'Context handling', description: 'Choose what happens as a conversation reaches the model’s context limit.', choices: ['Ask before summarizing', 'Automatically summarize'] },
    ] },
    { title: 'Sequential pipeline', rows: [
      { label: 'Review steps before running', description: 'Show detected model assignments and their order before execution.' },
      { label: 'Failure handling', description: 'Choose whether a failed step stops the sequence or asks you what to do.', choices: ['Stop pipeline', 'Ask me'] },
      { label: 'Step execution limit', description: 'Maximum tool iterations for each model before asking you to continue.', numeric: true },
      { label: 'Handoff content', description: 'Choose the information passed to the next model.', choices: ['Prior findings and artifacts', 'Full conversation'] },
    ] },
  ],
  tools: [
    { title: 'Action approvals', rows: [
      { label: 'File edits', description: 'Review model-proposed edits before they are applied.', choices: ['Ask before editing', 'Use session policy'] },
      { label: 'Shell commands', description: 'Review model-issued commands before execution.', choices: ['Ask before running', 'Use session policy'] },
      { label: 'Network tools', description: 'Control model access to web search and remote tools.', choices: ['Ask before use', 'Use session policy'] },
    ] },
    { title: 'Execution boundaries', rows: [
      { label: 'Workspace access', description: 'Limit model file operations to the active project.', choices: ['Active project'] },
      { label: 'Tool output limit', description: 'Maximum captured output returned to a model from one tool call.', numeric: true },
      { label: 'Command timeout', description: 'Maximum seconds allowed for a model-issued shell command.', numeric: true },
      { label: 'MCP permissions', description: 'Review permissions by server and tool in Integrations.', choices: ['Configure in integrations'] },
    ] },
  ],
  data: [
    { title: 'Local storage', rows: [
      { label: 'Data location', description: 'Location for conversations, preferences, and project metadata.', choices: ['Choose local folder'] },
      { label: 'Conversation retention', description: 'Choose how long to retain saved conversations.', choices: ['Until deleted', '30 days', '90 days'] },
      { label: 'Log retention', description: 'Choose how long to retain model and execution logs.', choices: ['Session only', '7 days', '30 days'] },
    ] },
    { title: 'Export & backup', rows: [
      { label: 'Conversation export', description: 'Export selected conversations for your own records.', choices: ['Markdown', 'JSON'] },
      { label: 'Create database backup', description: 'Export a consistent local SQLite snapshot.', action: 'Create backup' },
      { label: 'Verify a backup', description: 'Check a snapshot before using it for recovery.', action: 'Choose backup' },
      { label: 'Restore a backup', description: 'Recover saved workspace data from a verified snapshot.', action: 'Choose backup' },
    ] },
  ],
};

function SettingsDetails({ section, query = '' }: { section: string; query?: string }) {
  const groups = detailSections[section]?.map((group) => ({ ...group, rows: group.rows.filter((row) => `${sections.find((item) => item.id === section)?.label} ${group.title} ${row.label} ${row.description}`.toLowerCase().includes(query.toLowerCase().trim())) })).filter((group) => group.rows.length > 0);
  return <div className="mt-6">
    {groups?.map((group) => <section key={group.title} className="mb-7">
      <h3 className="text-xs font-medium mb-3">{group.title}</h3>
      <div className="border-y overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
        {group.rows.map((row, index) => <div key={row.label} className={`px-4 py-4 flex items-center justify-between gap-5 ${index ? 'border-t' : ''}`} style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="min-w-0"><p className="text-xs font-medium">{row.label}</p><p className="text-[11px] mt-1 leading-5" style={{ color: 'var(--text-muted)' }}>{row.description}</p></div>
          {row.action ? <button aria-disabled="true" data-ui-only="true" className="shrink-0 text-[11px] border rounded-md px-3 py-1.5 opacity-40 cursor-not-allowed" style={{ borderColor: 'var(--border-subtle)' }}>{row.action}</button> : row.choices ? <select disabled aria-label={row.label} className="w-40 shrink-0 text-[11px] rounded-md border px-2 py-1.5 opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }} defaultValue=""><option value="">Not configured</option>{row.choices.map((choice) => <option key={choice}>{choice}</option>)}</select>
            : row.numeric ? <input disabled type="number" aria-label={row.label} placeholder="—" className="w-20 shrink-0 text-xs border rounded-md px-2 py-1.5 opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }} />
            : <input disabled type="checkbox" aria-label={row.label} className="w-4 h-4 shrink-0 opacity-40 cursor-not-allowed" />}
        </div>)}
      </div>
    </section>)}
  </div>;
}
