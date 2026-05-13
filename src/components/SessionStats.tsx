'use client';

import type { FeedbackMap } from '@/lib/feedback';
import type { StatsBlob } from '@/lib/stats';

type Props = {
  stats: StatsBlob;
  feedback: FeedbackMap;
};

export default function SessionStats({ stats, feedback }: Props) {
  const queries = Object.keys(stats.queries).length;
  const responses = Object.values(stats.responses);
  const ratings = Object.values(feedback);

  if (queries + responses.length + ratings.length === 0) return null;

  const chains = responses.filter((r) => !r.error && r.stepCount > 1).length;
  const fallbacks = responses.filter((r) => r.error).length;

  const confidences = responses
    .filter((r) => !r.error)
    .map((r) => r.confidence)
    .filter((c): c is number => typeof c === 'number');
  const avgConfidence =
    confidences.length === 0
      ? null
      : Math.round(
          (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100,
        );

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
