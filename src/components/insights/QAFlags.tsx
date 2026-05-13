'use client';

import type { QAFlag } from '@/lib/insights';

type Props = {
  flags: QAFlag[];
};

const SEVERITY_STYLES: Record<
  QAFlag['severity'],
  { container: string; icon: string; label: string }
> = {
  warning: {
    container: 'border-amber-500/40 bg-amber-500/5',
    icon: 'text-amber-400',
    label: 'Warning',
  },
  critical: {
    container: 'border-rose-500/40 bg-rose-500/5',
    icon: 'text-rose-400',
    label: 'Critical',
  },
};

export default function QAFlags({ flags }: Props) {
  if (flags.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3 text-sm text-emerald-200">
        <span className="font-medium">All clear.</span>{' '}
        <span className="text-emerald-300/80">
          No QA rules tripped on the current data.
        </span>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {flags.map((f) => {
        const s = SEVERITY_STYLES[f.severity];
        return (
          <li
            key={f.id}
            className={`rounded-lg border px-3 py-2.5 ${s.container}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold ${s.icon}`}
              >
                {s.label}
              </span>
              <span className="text-sm text-text font-medium">{f.title}</span>
            </div>
            <p className="text-xs text-muted mt-1 leading-relaxed">{f.body}</p>
          </li>
        );
      })}
    </ul>
  );
}
