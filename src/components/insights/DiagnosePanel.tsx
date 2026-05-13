'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FeedbackMap } from '@/lib/feedback';
import type { StatsBlob } from '@/lib/stats';

type Props = {
  stats: StatsBlob;
  feedback: FeedbackMap;
};

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; report: string };

export default function DiagnosePanel({ stats, feedback }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const run = async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats, feedback }),
      });
      const data = (await res.json()) as
        | { reply: string }
        | { error: string };

      if (!res.ok || !('reply' in data)) {
        setState({
          kind: 'error',
          message:
            'error' in data
              ? data.error
              : `Server returned ${res.status}.`,
        });
        return;
      }
      setState({ kind: 'success', report: data.reply });
    } catch {
      setState({
        kind: 'error',
        message:
          "Couldn't reach the server. Check that the dev server is running and try again.",
      });
    }
  };

  const buttonLabel =
    state.kind === 'loading'
      ? 'Analyzing…'
      : state.kind === 'success'
        ? 'Re-run diagnosis'
        : 'Diagnose with Claude';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text">
            Diagnose with Claude
          </h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Ship the current session telemetry to the Diagnostician agent. It
            returns a short markdown report — top issues, concrete prompt-level
            fixes, and what&apos;s working.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={state.kind === 'loading'}
          className="rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {buttonLabel}
        </button>
      </div>

      {state.kind === 'error' && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {state.message}
        </div>
      )}

      {state.kind === 'success' && (
        <div className="markdown-body rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {state.report}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
