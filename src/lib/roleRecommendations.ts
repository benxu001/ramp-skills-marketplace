// Sensei-style proactive recommendations: each role gets a curated top-3
// of skills that map to its day-to-day. The order of roles below is the
// order they render in the chip strip. The order of skill IDs is the
// surfacing priority (first id = most prominent).

export interface RoleRecommendation {
  id: string;
  label: string;
  skillIds: string[];
}

export const ROLE_RECOMMENDATIONS: RoleRecommendation[] = [
  {
    id: 'ap',
    label: 'AP Specialist',
    skillIds: [
      'invoice-extractor',
      'policy-compliance-checker',
      'spend-anomaly-detector',
    ],
  },
  {
    id: 'procurement',
    label: 'Procurement',
    skillIds: [
      'vendor-risk-flagger',
      'policy-compliance-checker',
      'invoice-extractor',
    ],
  },
  {
    id: 'controller',
    label: 'Controller',
    skillIds: [
      'spend-anomaly-detector',
      'expense-categorizer',
      'policy-compliance-checker',
    ],
  },
  {
    id: 'fpa',
    label: 'FP&A',
    skillIds: [
      'meeting-cost-calculator',
      'spend-anomaly-detector',
      'expense-categorizer',
    ],
  },
  {
    id: 'founder',
    label: 'Founder / GM',
    skillIds: [
      'meeting-cost-calculator',
      'vendor-risk-flagger',
      'spend-anomaly-detector',
    ],
  },
];

export function getRoleById(id: string | null): RoleRecommendation | undefined {
  if (!id) return undefined;
  return ROLE_RECOMMENDATIONS.find((r) => r.id === id);
}
