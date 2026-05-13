'use client';

import { skills } from '@/lib/skills';
import SkillCard from './SkillCard';

type Props = {
  onExampleClick: (example: string) => void;
};

export default function SkillMarketplace({ onExampleClick }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between mb-4 px-1">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
          Skills Marketplace
        </h2>
        <span className="text-xs text-muted">
          <span className="text-text font-semibold">{skills.length}</span>{' '}
          skills
        </span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto scroll-area pr-1 pb-2">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onExampleClick={onExampleClick}
          />
        ))}
      </div>
    </div>
  );
}
