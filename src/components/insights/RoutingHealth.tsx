'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RoutingHealth as Health } from '@/lib/insights';

type Props = {
  health: Health;
};

function scoreColor(score: number): string {
  if (score >= 0.8) return 'text-emerald-400';
  if (score >= 0.6) return 'text-violet-300';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-rose-400';
}

function pct(value: number | null): string {
  if (value === null) return '—';
  return `${Math.round(value * 100)}%`;
}

function formatRelative(ts: number, now: number): string {
  const diffMs = now - ts;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function SparklineTooltip({
  active,
  payload,
  now,
}: {
  active?: boolean;
  payload?: { payload: { ts: number; v: number } }[];
  now: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div
      className="rounded-md border px-2 py-1 text-[11px] font-mono shadow-xl"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <div>
        <span className="text-text">{Math.round(p.v * 100)}%</span>
        <span className="text-muted ml-1.5">conf</span>
      </div>
      <div className="text-muted text-[10px] mt-0.5">
        {formatClock(p.ts)} · {formatRelative(p.ts, now)}
      </div>
    </div>
  );
}

export default function RoutingHealth({ health }: Props) {
  const scoreLabel = `${Math.round(health.score * 100)}`;
  const now = Date.now();
  const sparklineData = health.recent.map((r) => ({
    ts: r.timestamp,
    v: r.confidence,
  }));
  const tickValues =
    sparklineData.length >= 2
      ? [sparklineData[0].ts, sparklineData[sparklineData.length - 1].ts]
      : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center">
      <div className="flex flex-col items-center sm:items-start">
        <div
          className={`font-mono text-5xl font-semibold tracking-tight ${scoreColor(
            health.score,
          )}`}
        >
          {scoreLabel}
          <span className="text-xl text-muted">/100</span>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-muted mt-1">
          Routing health
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-muted text-[10px] uppercase tracking-wider">
              Avg confidence
            </div>
            <div className="text-text font-mono text-sm">
              {pct(health.avgConfidence)}
            </div>
          </div>
          <div>
            <div className="text-muted text-[10px] uppercase tracking-wider">
              Thumbs-up rate
            </div>
            <div className="text-text font-mono text-sm">
              {pct(health.thumbsUpRate)}
            </div>
          </div>
          <div>
            <div className="text-muted text-[10px] uppercase tracking-wider">
              Fallback rate
            </div>
            <div className="text-text font-mono text-sm">
              {pct(health.fallbackRate)}
            </div>
          </div>
        </div>
        {sparklineData.length >= 2 && (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                Confidence trend
              </span>
              <span className="text-[10px] text-muted">
                last {sparklineData.length} routable{' '}
                {sparklineData.length === 1 ? 'query' : 'queries'}
              </span>
            </div>
            <div className="h-20 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sparklineData}
                  margin={{ top: 4, right: 8, bottom: 16, left: 8 }}
                >
                  <XAxis
                    dataKey="ts"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    scale="time"
                    ticks={tickValues}
                    tickFormatter={(ts: number) => formatRelative(ts, now)}
                    tick={{ fill: 'rgb(148 163 184)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    minTickGap={0}
                  />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip
                    cursor={{
                      stroke: 'rgb(167 139 250)',
                      strokeDasharray: '3 3',
                      strokeOpacity: 0.5,
                    }}
                    content={<SparklineTooltip now={now} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="rgb(167 139 250)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: 'rgb(167 139 250)' }}
                    activeDot={{ r: 4, fill: 'rgb(167 139 250)' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="text-[10px] text-muted">
          Score = avg confidence × thumbs-up rate × (1 − fallback rate)
        </div>
      </div>
    </div>
  );
}
