'use client';

import { ROLE_RECOMMENDATIONS } from '@/lib/roleRecommendations';

type Props = {
  selectedRoleId: string | null;
  onSelect: (roleId: string | null) => void;
};

export default function RoleStrip({ selectedRoleId, onSelect }: Props) {
  return (
    <div className="mb-3 px-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">
          For your role
        </span>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_RECOMMENDATIONS.map((role) => {
            const active = role.id === selectedRoleId;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelect(active ? null : role.id)}
                className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                  active
                    ? 'border-violet-500/60 bg-violet-500/15 text-violet-200'
                    : 'border-border bg-surface text-muted hover:text-text hover:border-violet-500/40'
                }`}
                aria-pressed={active}
              >
                {role.label}
              </button>
            );
          })}
          {selectedRoleId && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs rounded-full px-2.5 py-1 text-muted hover:text-text transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
