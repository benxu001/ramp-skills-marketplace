'use client';

import {
  confidenceBuckets,
  detectQAFlags,
  perSkillStats,
  routingHealth,
} from '@/lib/insights';
import type { FeedbackMap } from '@/lib/feedback';
import type { StatsBlob } from '@/lib/stats';
import ConfidenceHistogram from './insights/ConfidenceHistogram';
import DiagnosePanel from './insights/DiagnosePanel';
import EmptyState from './insights/EmptyState';
import QAFlags from './insights/QAFlags';
import RoutingHealth from './insights/RoutingHealth';
import SkillLeaderboard from './insights/SkillLeaderboard';

type Props = {
  stats: StatsBlob;
  feedback: FeedbackMap;
  onSeed: () => void;
  onClear: () => void;
};

function PanelSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface/60 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider">
          {title}
        </h2>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function InsightsPanel({
  stats,
  feedback,
  onSeed,
  onClear,
}: Props) {
  const totalResponses = Object.keys(stats.responses).length;
  const totalRatings = Object.keys(feedback).length;
  const isEmpty = totalResponses === 0 && totalRatings === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-y-auto">
        <PanelHeader />
        <div className="py-6">
          <EmptyState onSeed={onSeed} />
        </div>
      </div>
    );
  }

  const skills = perSkillStats(stats, feedback);
  const buckets = confidenceBuckets(stats);
  const health = routingHealth(stats, feedback);
  const flags = detectQAFlags(stats, feedback);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <PanelHeader onClear={onClear} />

      <div className="flex flex-col gap-4 pb-6">
        <PanelSection title="Routing health">
          <RoutingHealth health={health} />
        </PanelSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PanelSection
            title="Skill leaderboard"
            hint="Stacked: 👍 left · 👎 right"
          >
            {skills.length > 0 ? (
              <SkillLeaderboard data={skills} />
            ) : (
              <p className="text-sm text-muted">
                No skill-level data yet.
              </p>
            )}
          </PanelSection>

          <PanelSection
            title="Confidence histogram"
            hint="Orchestrator calibration bands"
          >
            <ConfidenceHistogram data={buckets} />
          </PanelSection>
        </div>

        <PanelSection title="QA flags" hint="Deterministic rules over the data">
          <QAFlags flags={flags} />
        </PanelSection>

        <PanelSection title="Diagnose">
          <DiagnosePanel stats={stats} feedback={feedback} />
        </PanelSection>
      </div>
    </div>
  );
}

function PanelHeader({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4 border-b border-border mb-4 sticky top-0 bg-bg/95 backdrop-blur z-10">
      <div>
        <h1 className="text-base font-semibold text-text">Insights</h1>
        <p className="text-xs text-muted mt-0.5">
          Per-skill rollups, QA checks, and a Claude-powered diagnosis loop.
        </p>
      </div>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] uppercase tracking-wider text-muted hover:text-rose-300 transition-colors"
        >
          Clear data
        </button>
      )}
    </div>
  );
}
