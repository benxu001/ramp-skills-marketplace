'use client';

import { useMemo } from 'react';
import { skillMetadata } from '@/lib/skill-metadata';
import { getRoleById } from '@/lib/roleRecommendations';
import SkillCard from './SkillCard';
import RoleStrip from './RoleStrip';

type Props = {
  onExampleClick: (example: string) => void;
  selectedRoleId: string | null;
  onRoleChange: (roleId: string | null) => void;
};

export default function SkillMarketplace({
  onExampleClick,
  selectedRoleId,
  onRoleChange,
}: Props) {
  const role = getRoleById(selectedRoleId);

  const orderedSkills = useMemo(() => {
    if (!role) return skillMetadata;
    const rank = new Map(role.skillIds.map((id, i) => [id, i]));
    return [...skillMetadata].sort((a, b) => {
      const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.POSITIVE_INFINITY;
      const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.POSITIVE_INFINITY;
      return ra - rb;
    });
  }, [role]);

  const recommendedSet = useMemo(
    () => new Set(role?.skillIds ?? []),
    [role],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-mono text-sm uppercase tracking-wider text-muted">
          Skills Marketplace
        </h2>
        <span className="text-xs text-muted">
          <span className="text-text font-semibold">{skillMetadata.length}</span>{' '}
          skills
        </span>
      </div>
      <RoleStrip
        selectedRoleId={selectedRoleId}
        onSelect={onRoleChange}
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto scroll-area pr-1 pb-2">
        {orderedSkills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onExampleClick={onExampleClick}
            recommendedFor={
              role && recommendedSet.has(skill.id) ? role.label : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
