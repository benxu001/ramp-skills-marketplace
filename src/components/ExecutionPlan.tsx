'use client';

import SkillBadge from './SkillBadge';
import type { ChatMessage } from '@/lib/types';

type Props = {
  plan: NonNullable<ChatMessage['executionPlan']>;
};

export default function ExecutionPlan({ plan }: Props) {
  const confidencePct = Math.round(plan.confidence * 100);
  const label =
    plan.steps.length > 1 ? 'Skill chain' : 'Routed to';

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-muted">
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {plan.steps.map((step, i) => (
          <div key={`${step.skillId}-${i}`} className="flex items-center gap-2">
            <SkillBadge skillId={step.skillId} label={step.skillName} />
            {i < plan.steps.length - 1 && (
              <span className="text-muted/60" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <span className="text-muted/80">·</span>
      <span className="tabular-nums">{confidencePct}%</span>
    </div>
  );
}
