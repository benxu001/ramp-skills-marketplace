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
import { getSkillMetaById } from '@/lib/skill-metadata';
import type { SkillPerformance } from '@/lib/insights';

type Props = {
  data: SkillPerformance[];
};

type Row = {
  skillId: string;
  name: string;
  icon: string;
  ups: number;
  downs: number;
  runs: number;
  approval: number | null;
};

function buildRows(data: SkillPerformance[]): Row[] {
  return data.map((s) => {
    const meta = getSkillMetaById(s.skillId);
    return {
      skillId: s.skillId,
      name: meta?.name ?? s.skillId,
      icon: meta?.icon ?? '•',
      ups: s.ups,
      downs: s.downs,
      runs: s.runs,
      approval: s.approval,
    };
  });
}

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  const approvalLabel =
    row.approval === null
      ? 'no ratings'
      : `${Math.round(row.approval * 100)}% 👍`;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-xl"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="font-medium text-text">
        {row.icon} {row.name}
      </div>
      <div className="text-muted mt-0.5">
        {row.runs} {row.runs === 1 ? 'run' : 'runs'} · {approvalLabel}
      </div>
      <div className="mt-1 flex gap-3 text-[11px]">
        <span className="text-emerald-400">👍 {row.ups}</span>
        <span className="text-rose-400">👎 {row.downs}</span>
      </div>
    </div>
  );
}

export default function SkillLeaderboard({ data }: Props) {
  const rows = buildRows(data);
  const height = Math.max(120, rows.length * 44 + 24);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          barCategoryGap={12}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: 'rgb(148 163 184)', fontSize: 11 }}
            axisLine={{ stroke: 'rgb(51 65 85)' }}
            tickLine={{ stroke: 'rgb(51 65 85)' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fill: 'rgb(226 232 240)', fontSize: 12 }}
            axisLine={{ stroke: 'rgb(51 65 85)' }}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgb(30 41 59 / 0.4)' }}
            content={<TooltipContent />}
          />
          <Bar
            dataKey="ups"
            name="👍"
            stackId="ratings"
            fill="rgb(52 211 153)"
            radius={[2, 0, 0, 2]}
          >
            {rows.map((r) => (
              <Cell key={`up-${r.skillId}`} />
            ))}
          </Bar>
          <Bar
            dataKey="downs"
            name="👎"
            stackId="ratings"
            fill="rgb(251 113 133)"
            radius={[0, 2, 2, 0]}
          >
            {rows.map((r) => (
              <Cell key={`down-${r.skillId}`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
