'use client';

import { getSkillMetaById } from '@/lib/skill-metadata';
import { badgeClasses } from '@/lib/colors';

type Props = {
  skillId: string;
  /** Falls back to the skill's registry name if not provided. */
  label?: string;
  size?: 'sm' | 'md';
};

export default function SkillBadge({ skillId, label, size = 'sm' }: Props) {
  const skill = getSkillMetaById(skillId);
  if (!skill) return null;

  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${badgeClasses(
        skill.color,
      )} ${padding} ${text} font-medium`}
    >
      <span aria-hidden>{skill.icon}</span>
      <span>{label ?? skill.name}</span>
    </span>
  );
}
