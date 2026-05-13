'use client';

import {
  KeyboardEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from 'react';
import type { ChatMessage } from '@/lib/types';
import MessageBubble from './MessageBubble';
import ExecutionPlan from './ExecutionPlan';

export type ChatPanelHandle = {
  setInput: (text: string) => void;
  focus: () => void;
};

const TRY_THESE = [
  {
    label: 'Categorize a few expenses',
    prompt:
      'Categorize: Uber $45, team dinner $320, Figma annual $180, AWS $12,400',
  },
  {
    label: 'Flag vendor risk',
    prompt:
      'Is this vendor risky? NovaPay Solutions, incorporated 3 months ago in Delaware, no public financials',
  },
  {
    label: 'Extract + compliance',
    prompt:
      'Extract this invoice and check compliance: Invoice #7301 from DataSync Ltd. Cloud storage $4,200/month, API credits $1,800. Net 45 terms.',
  },
  {
    label: 'Categorize + anomalies',
    prompt:
      'Categorize these expenses and flag anomalies: Marketing lunch $85, Marketing lunch $85, SaaS tool $49.99, Conference flight $8,000, Team snacks $500.00',
  },
];

type Props = {
  messages: ChatMessage[];
  loading: boolean;
  statusLine: string | null;
  onSend: (text: string) => void;
  onRetry: (prompt: string) => void;
};

const ChatPanel = forwardRef<ChatPanelHandle, Props>(function ChatPanel(
  { messages, loading, statusLine, onSend, onRetry },
  ref,
) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    setInput: (text) => {
      setInput(text);
      inputRef.current?.focus();
    },
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, statusLine]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChipClick = (prompt: string) => {
    if (loading) return;
    onSend(prompt);
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/60 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-area px-4 py-4 space-y-4"
      >
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-2">
            {m.role === 'assistant' && m.executionPlan && (
              <ExecutionPlan plan={m.executionPlan} />
            )}
            <MessageBubble message={m} onRetry={onRetry} />
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-muted px-1 py-2">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
            <span className="text-xs ml-2 font-mono">
              {statusLine ?? 'Working…'}
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-bg/60 backdrop-blur p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted mr-1">
            Try
          </span>
          {TRY_THESE.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => handleChipClick(t.prompt)}
              disabled={loading}
              className="text-[11px] rounded-full border border-border bg-surface-2 px-2.5 py-1 text-muted hover:text-text hover:border-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t.prompt}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask anything — I'll plan and run the right skill(s)."
            className="flex-1 resize-none bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-[0.9375rem] text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40 max-h-40"
            style={{ minHeight: '44px' }}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="shrink-0 h-[44px] px-4 rounded-xl bg-violet-500 text-white font-medium text-sm transition-colors hover:bg-violet-400 disabled:bg-surface-2 disabled:text-muted disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-muted text-center">
          Press <kbd className="font-mono">Enter</kbd> to send ·{' '}
          <kbd className="font-mono">Shift + Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
});

export default ChatPanel;
