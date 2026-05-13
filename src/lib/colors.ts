// Maps a skill's `color` field to Tailwind class strings.
// Each pattern below must also be present in tailwind.config.ts `safelist`.

export type SkillColor =
  | 'emerald'
  | 'rose'
  | 'sky'
  | 'violet'
  | 'amber'
  | 'fuchsia';

export function badgeClasses(color: string): string {
  return [
    `border-${color}-500/40`,
    `bg-${color}-500/10`,
    `text-${color}-300`,
  ].join(' ');
}

export function cardAccentClasses(color: string): string {
  return [
    `hover:border-${color}-500/60`,
    `text-${color}-400`,
  ].join(' ');
}

export function exampleChipClasses(color: string): string {
  return [`bg-${color}-500/10`, `text-${color}-300`].join(' ');
}
