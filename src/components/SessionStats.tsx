'use client';

import type { ChatMessage } from '@/lib/types';
import type { FeedbackMap } from '@/lib/feedback';

type Props = {
  messages: ChatMessage[];
  feedback: FeedbackMap;
};

export default function SessionStats({ messages, feedback }: Props) {
  const queries = messages.filter((m) => m.role === 'user').length;
  if (queries === 0) return null;

  const planned = messages.filter(
    (m) => m.role === 'assistant' && m.executionPlan,
  );
  const chains = planned.filter(
    (m) => (m.executionPlan?.steps.length ?? 0) > 1,
  ).length;
  const fallbacks = messages.filter(
    (m) => m.role === 'assistant' && m.error,
  ).length;

  const confidences = planned
    .map((m) => m.executionPlan?.confidence)
    .filter((c): c is number => typeof c === 'number');
  const avgConfidence =
    confidences.length === 0
      ? null
      : Math.round(
          (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
        );

  const ratings = Object.values(feedback);
  const ups = ratings.filter((r) => r.rating === 'up').length;
  const downs = ratings.filter((r) => r.rating === 'down').length;
  const showThumbs = ups + downs > 0;

  return (
    <div
      className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border bg-surface/60 px-3 py-1 text-[11px] font-mono text-muted"
      aria-label="Session statistics"
    >
      <span>
        <span className="text-text">{queries}</span>{' '}
        {queries === 1 ? 'query' : 'queries'}
      </span>
      <span aria-hidden className="text-border">
        ·
      </span>
      <span>
        <span className="text-text">{chains}</span>{' '}
        {chains === 1 ? 'chain' : 'chains'}
      </span>
      {avgConfidence !== null && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            <span className="text-text">{avgConfidence}%</span> avg confidence
          </span>
        </>
      )}
      {fallbacks > 0 && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span>
            <span className="text-text">{fallbacks}</span>{' '}
            {fallbacks === 1 ? 'fallback' : 'fallbacks'}
          </span>
        </>
      )}
      {showThumbs && (
        <>
          <span aria-hidden className="text-border">
            ·
          </span>
          <span aria-label={`${ups} thumbs up, ${downs} thumbs down`}>
            <span aria-hidden>👍</span>{' '}
            <span className="text-text">{ups}</span>{' '}
            <span className="text-border">/</span>{' '}
            <span aria-hidden>👎</span>{' '}
            <span className="text-text">{downs}</span>
          </span>
        </>
      )}
    </div>
  );
}
