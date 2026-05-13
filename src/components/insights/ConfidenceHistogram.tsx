'use client';

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ConfidenceBucket } from '@/lib/insights';

type Props = {
  data: ConfidenceBucket[];
};

const BAR_COLORS: Record<ConfidenceBucket['key'], string> = {
  unambiguous: 'rgb(167 139 250)',
  high: 'rgb(139 92 246)',
  medium: 'rgb(124 58 237)',
  low: 'rgb(217 119 6)',
  noMatch: 'rgb(100 116 139)',
};

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ConfidenceBucket }[];
}) {
  if (!active || !payload || !payload.length) return null;
  const b = payload[0].payload;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-xl"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="font-medium text-text">{b.label}</div>
      <div className="text-muted text-[11px] mt-0.5">{b.range}</div>
      <div className="text-text mt-1">
        {b.count} {b.count === 1 ? 'response' : 'responses'}
      </div>
    </div>
  );
}

export default function ConfidenceHistogram({ data }: Props) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
            axisLine={{ stroke: 'rgb(51 65 85)' }}
            tickLine={{ stroke: 'rgb(51 65 85)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
            axisLine={{ stroke: 'rgb(51 65 85)' }}
            tickLine={{ stroke: 'rgb(51 65 85)' }}
            width={28}
          />
          <Tooltip
            cursor={{ fill: 'rgb(30 41 59 / 0.4)' }}
            content={<TooltipContent />}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((b) => (
              <Cell key={b.key} fill={BAR_COLORS[b.key]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
