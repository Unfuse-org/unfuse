import { useState } from 'react';
import { ArrowUp, ChevronDown, MessageSquare, Paperclip } from 'lucide-react';
import { LocalModelBlade } from '../rack/types';

interface MainChatPanelProps {
  sessionId: string;
  models: LocalModelBlade[];
  onOpenRack: () => void;
}

const starters = [
  { label: 'Explore a project', prompt: 'Help me understand this project and explain how its main pieces fit together.' },
  { label: 'Investigate a bug', prompt: 'Help me investigate a bug. Start by asking what is happening and what I expected.' },
  { label: 'Review some code', prompt: 'Review my code for correctness and explain any issues before suggesting changes.' },
];

export function MainChatPanel({ sessionId, models, onOpenRack }: MainChatPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [selectedModelId, setSelectedModelId] = useState('');
  const draft = drafts[sessionId] ?? '';
  const selectedModel = models.find((model) => model.id === selectedModelId) ?? models[0];
  const updateDraft = (text: string) => setDrafts((current) => ({ ...current, [sessionId]: text }));

  return (
    <main className="flex-1 h-full min-w-0 flex flex-col" style={{ backgroundColor: 'var(--bg-app)' }}>


      <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col justify-center">
        <div className="w-full max-w-2xl mx-auto py-10">
          <div className="mb-5 w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: 'var(--border-subtle)', color: 'var(--accent)' }}>
            <MessageSquare size={20} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl sm:text-3xl tracking-tight font-medium">What are we working on?</h2>
          <p className="mt-3 text-sm leading-6 max-w-md" style={{ color: 'var(--text-muted)' }}>
            A space for your project and your local models. Start with a question, a problem, or an idea.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {starters.map((starter) => (
              <button key={starter.label} onClick={() => updateDraft(starter.prompt)} className="text-xs rounded-lg border px-3 py-2.5 hover:bg-[var(--bg-surface-hover)] transition-colors" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                {starter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-[var(--border-subtle)] p-3 shadow-sm focus-within:border-[var(--accent)] transition-colors" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <textarea
              aria-label="Message draft"
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              placeholder="Ask anything about your project…"
              rows={3}
              className="w-full resize-none bg-transparent outline-none text-sm leading-6 px-1 py-1 min-h-[80px] max-h-48 select-text placeholder:text-[var(--text-muted)]"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2 min-w-0">
                <button disabled title="Attachments will be available when chat is connected" aria-label="Attach files (not connected)" className="w-8 h-8 flex items-center justify-center rounded-lg opacity-40 cursor-not-allowed">
                  <Paperclip size={17} />
                </button>
                {models.length > 0 ? (
                  <select aria-label="Choose model" value={selectedModel?.id ?? ''} onChange={(event) => setSelectedModelId(event.target.value)} className="text-xs bg-[var(--bg-surface)] outline-none max-w-[180px] rounded-md p-1" style={{ color: 'var(--text-muted)' }}>
                    {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
                  </select>
                ) : (
                  <button onClick={onOpenRack} className="flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5 hover:bg-[var(--bg-surface-hover)]" style={{ color: 'var(--text-muted)' }}>
                    Select a model <ChevronDown size={13} />
                  </button>
                )}
              </div>
              <button disabled aria-label="Send message (not connected)" title="Model execution is not connected yet" className="w-8 h-8 rounded-full flex items-center justify-center opacity-40 cursor-not-allowed" style={{ backgroundColor: 'var(--text-main)', color: 'var(--bg-app)' }}>
                <ArrowUp size={18} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
