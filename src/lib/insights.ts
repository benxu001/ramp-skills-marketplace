import type { FeedbackEntry } from './types';
import {
  type FeedbackMap,
  clearFeedback,
  recordFeedback,
} from './feedback';
import {
  type ResponseStat,
  type StatsBlob,
  clearStats,
  recordQuery,
  recordResponse,
} from './stats';

export type SkillPerformance = {
  skillId: string;
  runs: number;
  ups: number;
  downs: number;
  /** ups / (ups + downs); null when no ratings. */
  approval: number | null;
  /** Average orchestrator confidence across responses using this skill. Null
   *  when no non-null confidence exists for the skill (all errors/empties). */
  avgConfidence: number | null;
};

export type ConfidenceBucket = {
  key: 'unambiguous' | 'high' | 'medium' | 'low' | 'noMatch';
  label: string;
  range: string;
  count: number;
};

export type RoutingHealth = {
  score: number;
  avgConfidence: number | null;
  thumbsUpRate: number | null;
  fallbackRate: number;
  totalResponses: number;
  /** Last 10 routable responses (non-null confidence), oldest → newest. */
  recent: { timestamp: number; confidence: number }[];
};

export type QAFlag = {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  body: string;
};

function nonErrorResponses(stats: StatsBlob): ResponseStat[] {
  return Object.values(stats.responses).filter((r) => !r.error);
}

export function perSkillStats(
  stats: StatsBlob,
  feedback: FeedbackMap,
): SkillPerformance[] {
  const acc = new Map<
    string,
    { runs: number; confSum: number; confCount: number; ups: number; downs: number }
  >();
  const touch = (skillId: string) => {
    let cell = acc.get(skillId);
    if (!cell) {
      cell = { runs: 0, confSum: 0, confCount: 0, ups: 0, downs: 0 };
      acc.set(skillId, cell);
    }
    return cell;
  };

  for (const r of Object.values(stats.responses)) {
    if (r.error) continue;
    for (const skillId of r.skillIds) {
      const cell = touch(skillId);
      cell.runs += 1;
      if (typeof r.confidence === 'number') {
        cell.confSum += r.confidence;
        cell.confCount += 1;
      }
    }
  }

  for (const entry of Object.values(feedback)) {
    for (const skillId of entry.skillIds) {
      const cell = touch(skillId);
      if (entry.rating === 'up') cell.ups += 1;
      else cell.downs += 1;
    }
  }

  const out: SkillPerformance[] = [];
  acc.forEach((c, skillId) => {
    const rated = c.ups + c.downs;
    out.push({
      skillId,
      runs: c.runs,
      ups: c.ups,
      downs: c.downs,
      approval: rated > 0 ? c.ups / rated : null,
      avgConfidence: c.confCount > 0 ? c.confSum / c.confCount : null,
    });
  });
  out.sort((a, b) => b.runs - a.runs);
  return out;
}

const BUCKET_DEFS: Omit<ConfidenceBucket, 'count'>[] = [
  { key: 'unambiguous', label: 'Unambiguous', range: '≥ 0.96' },
  { key: 'high', label: 'High', range: '0.81 – 0.95' },
  { key: 'medium', label: 'Medium', range: '0.56 – 0.80' },
  { key: 'low', label: 'Low', range: '0.31 – 0.55' },
  { key: 'noMatch', label: 'No match', range: 'null / 0' },
];

function bucketKey(conf: number | null): ConfidenceBucket['key'] {
  if (conf === null) return 'noMatch';
  if (conf >= 0.96) return 'unambiguous';
  if (conf >= 0.81) return 'high';
  if (conf >= 0.56) return 'medium';
  if (conf >= 0.31) return 'low';
  return 'noMatch';
}

export function confidenceBuckets(stats: StatsBlob): ConfidenceBucket[] {
  const counts: Record<ConfidenceBucket['key'], number> = {
    unambiguous: 0,
    high: 0,
    medium: 0,
    low: 0,
    noMatch: 0,
  };
  for (const r of Object.values(stats.responses)) {
    counts[bucketKey(r.confidence)] += 1;
  }
  return BUCKET_DEFS.map((b) => ({ ...b, count: counts[b.key] }));
}

export function routingHealth(
  stats: StatsBlob,
  feedback: FeedbackMap,
): RoutingHealth {
  const responses = Object.values(stats.responses);
  const totalResponses = responses.length;
  const successResponses = nonErrorResponses(stats);
  const confidences = successResponses
    .map((r) => r.confidence)
    .filter((c): c is number => typeof c === 'number');
  const avgConfidence =
    confidences.length === 0
      ? null
      : confidences.reduce((a, b) => a + b, 0) / confidences.length;

  const ratings = Object.values(feedback);
  const ups = ratings.filter((r) => r.rating === 'up').length;
  const downs = ratings.filter((r) => r.rating === 'down').length;
  const thumbsUpRate = ups + downs === 0 ? null : ups / (ups + downs);

  const fallbacks = responses.filter((r) => r.error).length;
  const fallbackRate = totalResponses === 0 ? 0 : fallbacks / totalResponses;

  const score =
    (avgConfidence ?? 1) * (thumbsUpRate ?? 1) * (1 - fallbackRate);

  const recent = [...successResponses]
    .filter((r): r is typeof r & { confidence: number } =>
      typeof r.confidence === 'number',
    )
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-10)
    .map((r) => ({ timestamp: r.timestamp, confidence: r.confidence }));

  return {
    score,
    avgConfidence,
    thumbsUpRate,
    fallbackRate,
    totalResponses,
    recent,
  };
}

function lastNByTimestamp(stats: StatsBlob, n: number): ResponseStat[] {
  return [...Object.values(stats.responses)]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-n);
}

export function detectQAFlags(
  stats: StatsBlob,
  feedback: FeedbackMap,
): QAFlag[] {
  const flags: QAFlag[] = [];
  const perSkill = perSkillStats(stats, feedback);

  for (const s of perSkill) {
    const rated = s.ups + s.downs;
    if (rated >= 3 && s.approval !== null && s.approval < 0.5) {
      flags.push({
        id: `low-approval:${s.skillId}`,
        severity: 'warning',
        title: `${s.skillId}: ${s.ups}/${rated} 👍`,
        body: `Approval ${(s.approval * 100).toFixed(0)}% across ${rated} ratings. Review the system prompt — examples may be off-target or the output format may be unhelpful.`,
      });
    }
  }

  const chainCounts = new Map<
    string,
    { runs: number; ups: number; downs: number }
  >();
  for (const r of Object.values(stats.responses)) {
    if (r.error || r.skillIds.length < 2) continue;
    const key = r.skillIds.join(' → ');
    let cell = chainCounts.get(key);
    if (!cell) {
      cell = { runs: 0, ups: 0, downs: 0 };
      chainCounts.set(key, cell);
    }
    cell.runs += 1;
  }
  for (const entry of Object.values(feedback)) {
    if (entry.skillIds.length < 2) continue;
    const key = entry.skillIds.join(' → ');
    const cell = chainCounts.get(key);
    if (!cell) continue;
    if (entry.rating === 'up') cell.ups += 1;
    else cell.downs += 1;
  }
  chainCounts.forEach((c, chain) => {
    const rated = c.ups + c.downs;
    if (rated >= 2 && c.downs / rated > 0.5) {
      flags.push({
        id: `chain-down:${chain}`,
        severity: 'critical',
        title: `Chain ${chain} has ${c.downs}/${rated} 👎`,
        body: `Multi-skill chain getting more thumbs-down than up. Check the synthesizer's merge — the per-step outputs may be coherent on their own but contradict when combined.`,
      });
    }
  });

  const last10 = lastNByTimestamp(stats, 10);
  const recentConfs = last10
    .map((r) => r.confidence)
    .filter((c): c is number => typeof c === 'number');
  if (recentConfs.length >= 5) {
    const avg = recentConfs.reduce((a, b) => a + b, 0) / recentConfs.length;
    if (avg < 0.5) {
      flags.push({
        id: 'coverage-gap',
        severity: 'warning',
        title: `Recent confidence avg ${(avg * 100).toFixed(0)}%`,
        body: `The last ${recentConfs.length} routable queries averaged below 0.5 confidence. Query patterns may exceed the current skill set — consider adding a skill or expanding example coverage.`,
      });
    }
  }

  const last20 = lastNByTimestamp(stats, 20);
  if (last20.length >= 10) {
    const fallbacks = last20.filter((r) => r.error).length;
    const rate = fallbacks / last20.length;
    if (rate > 0.1) {
      flags.push({
        id: 'fallback-rate',
        severity: 'critical',
        title: `Fallback rate ${(rate * 100).toFixed(0)}%`,
        body: `${fallbacks} of the last ${last20.length} responses errored. Check ANTHROPIC_API_KEY, network reliability, or whether the orchestrator prompt is throwing.`,
      });
    }
  }

  return flags;
}

type SeedEntry = {
  skillIds: string[];
  confidence: number | null;
  error?: boolean;
  rating?: 'up' | 'down';
  prompt: string;
  /** Hours ago. Oldest entries should have larger values. */
  hoursAgo: number;
};

const SEED_ENTRIES: SeedEntry[] = [
  { skillIds: ['expense-categorizer'], confidence: 0.95, rating: 'up', prompt: 'Uber to airport $45, team lunch at Sweetgreen $230, AWS bill $1,240', hoursAgo: 22 },
  { skillIds: ['expense-categorizer'], confidence: 0.92, rating: 'up', prompt: 'Hotel in Austin $612, conference ticket $899, client dinner $187', hoursAgo: 21 },
  { skillIds: ['expense-categorizer'], confidence: 1.0, rating: 'up', prompt: 'Figma annual seat $180, Notion team $96, Adobe CC $54', hoursAgo: 19 },
  { skillIds: ['expense-categorizer'], confidence: 0.88, rating: 'up', prompt: 'Q1 SaaS renewals: GitHub $84, Linear $200, Vercel team $480', hoursAgo: 17 },
  { skillIds: ['expense-categorizer'], confidence: 0.90, rating: 'down', prompt: 'Various office snacks and travel from last week, $1,420 total', hoursAgo: 16 },
  { skillIds: ['vendor-risk-flagger'], confidence: 0.85, rating: 'up', prompt: 'Acme Marketing LLC — agency we have used for 3 years, US-based', hoursAgo: 14 },
  { skillIds: ['vendor-risk-flagger'], confidence: 0.70, rating: 'down', prompt: 'NovaCloud Ltd — payment processor based in Cyprus, signed up last week', hoursAgo: 13 },
  { skillIds: ['vendor-risk-flagger'], confidence: 0.80, rating: 'down', prompt: 'OfflineHand BV — Netherlands-based contractor invoicing in EUR', hoursAgo: 12 },
  { skillIds: ['vendor-risk-flagger'], confidence: 0.90, prompt: 'Quanta Data Services — offshore data labeling vendor, handles PII', hoursAgo: 11 },
  { skillIds: ['invoice-extractor', 'policy-compliance-checker'], confidence: 0.85, rating: 'up', prompt: 'Extract this invoice and check it against policy: Invoice #4421 from Globex Logistics, freight Apr 1–30 $4,200', hoursAgo: 9 },
  { skillIds: ['invoice-extractor', 'policy-compliance-checker'], confidence: 0.85, rating: 'down', prompt: 'Pull fields from this invoice and verify compliance: Pied Piper Inc. invoice 22-A for $19,075', hoursAgo: 8 },
  { skillIds: ['invoice-extractor', 'policy-compliance-checker'], confidence: 0.85, rating: 'down', prompt: 'Parse + policy-check: DataSync Ltd invoice for $7,300, consulting Q2', hoursAgo: 7 },
  { skillIds: ['expense-categorizer', 'spend-anomaly-detector'], confidence: 0.95, rating: 'up', prompt: 'Categorize these expenses and flag anomalies: 2026-05-01 AWS $1,240.55 (x2), Sweetgreen $87.10', hoursAgo: 6 },
  { skillIds: ['expense-categorizer', 'spend-anomaly-detector'], confidence: 0.95, rating: 'up', prompt: 'Categorize + anomaly check on March Stripe fees rollup', hoursAgo: 5 },
  { skillIds: ['meeting-cost-calculator'], confidence: 1.0, rating: 'up', prompt: '8 attendees, 60 minutes, mix of mid and senior', hoursAgo: 4 },
  { skillIds: ['meeting-cost-calculator'], confidence: 1.0, rating: 'up', prompt: '4 execs and 2 senior ICs, 90-minute strategy review', hoursAgo: 3 },
  { skillIds: ['meeting-cost-calculator'], confidence: 1.0, rating: 'up', prompt: '12 juniors, 30 minutes, weekly status update', hoursAgo: 2 },
  { skillIds: ['invoice-extractor', 'expense-categorizer', 'policy-compliance-checker'], confidence: 0.80, rating: 'up', prompt: 'Extract this invoice, categorize the line items, flag anything non-compliant', hoursAgo: 1.5 },
  { skillIds: ['expense-categorizer'], confidence: 0.42, prompt: 'Some random charges from a trip somewhere last month', hoursAgo: 1 },
  { skillIds: [], confidence: null, error: true, prompt: 'help me figure out my taxes', hoursAgo: 0.5 },
];

function newSeedId(seed: string, i: number): string {
  return `seed-${seed}-${i}`;
}

export function seedInsights(): { stats: StatsBlob; feedback: FeedbackMap } {
  let stats: StatsBlob = clearStats();
  let feedback: FeedbackMap = clearFeedback();
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  SEED_ENTRIES.forEach((entry, i) => {
    const userId = newSeedId('u', i);
    const assistantId = newSeedId('a', i);
    const ts = now - entry.hoursAgo * hour;

    stats = recordQuery(stats, userId);
    stats = recordResponse(stats, assistantId, {
      stepCount: entry.skillIds.length,
      confidence: entry.confidence,
      error: !!entry.error,
      skillIds: entry.skillIds,
      timestamp: ts,
    });

    if (entry.rating) {
      const fb: FeedbackEntry = {
        messageId: assistantId,
        skillIds: entry.skillIds,
        rating: entry.rating,
        timestamp: ts,
        prompt: entry.prompt,
      };
      feedback = recordFeedback(feedback, fb);
    }
  });

  return { stats, feedback };
}

export function clearInsights(): { stats: StatsBlob; feedback: FeedbackMap } {
  return {
    stats: clearStats(),
    feedback: clearFeedback(),
  };
}
