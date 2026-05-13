'use client';

import type { SkillMeta } from '@/lib/types';
import { cardAccentClasses, exampleChipClasses } from '@/lib/colors';

type Props = {
  skill: SkillMeta;
  onExampleClick: (example: string) => void;
  recommendedFor?: string;
};

export default function SkillCard({
  skill,
  onExampleClick,
  recommendedFor,
}: Props) {
  return (
    <div
      className={`group rounded-xl border bg-surface p-4 transition-colors ${cardAccentClasses(
        skill.color,
      )} ${
        recommendedFor
          ? 'border-violet-500/40 ring-1 ring-violet-500/20'
          : 'border-border'
      }`}
    >
      {recommendedFor && (
        <div className="mb-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border border-violet-500/40 bg-violet-500/10 text-violet-300">
          <span aria-hidden>★</span>
          <span>Recommended for {recommendedFor}</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none mt-0.5" aria-hidden>
          {skill.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-semibold text-text truncate">{skill.name}</h3>
            <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
              {skill.category}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted">
          Try
        </span>
        {skill.exampleInputs.slice(0, 3).map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onExampleClick(ex)}
            className={`text-left text-xs rounded-md px-2.5 py-1.5 border border-transparent hover:border-border transition-colors ${exampleChipClasses(
              skill.color,
            )} truncate`}
            title={ex}
          >
            {ex.length > 90 ? `${ex.slice(0, 90).replace(/\s+/g, ' ')}…` : ex}
          </button>
        ))}
      </div>
    </div>
  );
}
