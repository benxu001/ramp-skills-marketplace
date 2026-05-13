'use client';

import { useRef, useState } from 'react';
import ChatPanel, { ChatPanelHandle } from '@/components/ChatPanel';
import SkillMarketplace from '@/components/SkillMarketplace';
import type { ChatMessage, ChatStreamEvent } from '@/lib/types';

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Welcome to **Skill Router**. I can help with expense categorization, vendor risk assessment, invoice extraction, policy compliance, spend anomaly detection, and meeting cost calculation. Try typing a request — or click an example from the marketplace on the right.",
  timestamp: new Date(),
};

type Tab = 'chat' | 'skills';

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chat');
  const chatRef = useRef<ChatPanelHandle>(null);

  const runQuery = async (text: string) => {
    const userMessage: ChatMessage = {
      id: newId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((m) => [...m, userMessage]);
    setLoading(true);
    setStatusLine('Planning…');

    const finishWithError = (msg: string) => {
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: 'assistant',
          content: msg,
          error: true,
          retryPrompt: text,
          timestamp: new Date(),
        },
      ]);
    };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok || !res.body) {
        finishWithError(
          `Server returned ${res.status}. Please try again.`,
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let sawFinal = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          let event: ChatStreamEvent;
          try {
            event = JSON.parse(trimmed) as ChatStreamEvent;
          } catch {
            continue;
          }
          handleEvent(event);
          if (event.type === 'final') sawFinal = true;
          if (event.type === 'error') {
            finishWithError(event.message);
            sawFinal = true;
          }
        }
      }

      if (!sawFinal) {
        finishWithError(
          'The connection ended before a response was received. Please try again.',
        );
      }
    } catch {
      finishWithError(
        "I couldn't reach the server. Check that the dev server is running and try again.",
      );
    } finally {
      setLoading(false);
      setStatusLine(null);
    }
  };

  const handleEvent = (event: ChatStreamEvent) => {
    switch (event.type) {
      case 'plan':
        // We could surface the plan here, but spec says "ExecutionPlan
        // appears followed by the response" — so we just keep the status
        // line moving until we know which skill is running.
        return;
      case 'step_start':
        setStatusLine(`Executing: ${event.skillName}…`);
        return;
      case 'step_done':
        return;
      case 'synth_start':
        setStatusLine('Synthesizing results…');
        return;
      case 'final':
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: 'assistant',
            content: event.reply,
            executionPlan: event.executionPlan ?? undefined,
            timestamp: new Date(),
          },
        ]);
        return;
      case 'error':
        // handled by runQuery via finishWithError
        return;
    }
  };

  const handleExampleClick = (example: string) => {
    chatRef.current?.setInput(example);
    setTab('chat');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-bg/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-lg font-semibold tracking-tight"
              aria-label="Skill Router logo"
            >
              <span className="text-violet-400">{'>_'}</span>{' '}
              <span className="text-text">Skill Router</span>
            </span>
            <span className="hidden sm:inline text-xs text-muted ml-2">
              3-agent skills marketplace
            </span>
          </div>
          <nav className="md:hidden flex rounded-lg border border-border p-0.5 bg-surface">
            {(['chat', 'skills'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3 py-1 text-xs uppercase tracking-wider rounded-md transition-colors ${
                  tab === t
                    ? 'bg-violet-500 text-white'
                    : 'text-muted hover:text-text'
                }`}
              >
                {t === 'chat' ? 'Chat' : 'Skills'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-6 h-[calc(100vh-9rem)]">
          <section
            className={`md:col-span-3 ${
              tab === 'chat' ? 'flex' : 'hidden md:flex'
            } flex-col min-h-0`}
          >
            <ChatPanel
              ref={chatRef}
              messages={messages}
              loading={loading}
              statusLine={statusLine}
              onSend={runQuery}
              onRetry={runQuery}
            />
          </section>
          <aside
            className={`md:col-span-2 ${
              tab === 'skills' ? 'flex' : 'hidden md:flex'
            } flex-col min-h-0`}
          >
            <SkillMarketplace onExampleClick={handleExampleClick} />
          </aside>
        </div>
      </main>

      <footer className="py-3 text-center text-[10px] text-muted">
        Built for Ramp · AI Product Operator Application
      </footer>
    </div>
  );
}
