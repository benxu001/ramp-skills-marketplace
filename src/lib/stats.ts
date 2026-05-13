const STORAGE_KEY = 'skill-router:stats';

export type ResponseStat = {
  /** Number of skills in the executed plan. 0 for errors or empty plans. */
  stepCount: number;
  /** Orchestrator confidence (0-1) or null when no plan was produced. */
  confidence: number | null;
  /** True for failed requests (network error, server 5xx, etc.). */
  error: boolean;
  /** Skill IDs that produced the message, in execution order. Empty for errors. */
  skillIds: string[];
  /** Wall-clock time the response landed (epoch ms). Used by insights views. */
  timestamp: number;
};

export type StatsBlob = {
  /** User-message IDs as keys → trivial dedup on re-renders. */
  queries: Record<string, true>;
  /** Assistant-message IDs → response stat. */
  responses: Record<string, ResponseStat>;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function emptyBlob(): StatsBlob {
  return { queries: {}, responses: {} };
}

export function loadStats(): StatsBlob {
  if (!canUseStorage()) return emptyBlob();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBlob();
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as StatsBlob).queries !== 'object' ||
      typeof (parsed as StatsBlob).responses !== 'object'
    ) {
      return emptyBlob();
    }
    const stats = parsed as StatsBlob;
    const responses: Record<string, ResponseStat> = {};
    for (const [id, r] of Object.entries(stats.responses)) {
      responses[id] = {
        stepCount: r.stepCount ?? 0,
        confidence: r.confidence ?? null,
        error: !!r.error,
        skillIds: Array.isArray(r.skillIds) ? r.skillIds : [],
        timestamp: typeof r.timestamp === 'number' ? r.timestamp : 0,
      };
    }
    return { queries: stats.queries, responses };
  } catch {
    return emptyBlob();
  }
}

function persist(stats: StatsBlob) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // quota / serialization errors are non-fatal for a stats pill
  }
}

export function recordQuery(stats: StatsBlob, messageId: string): StatsBlob {
  if (stats.queries[messageId]) return stats;
  const next: StatsBlob = {
    queries: { ...stats.queries, [messageId]: true },
    responses: stats.responses,
  };
  persist(next);
  return next;
}

export function recordResponse(
  stats: StatsBlob,
  messageId: string,
  stat: ResponseStat,
): StatsBlob {
  const next: StatsBlob = {
    queries: stats.queries,
    responses: { ...stats.responses, [messageId]: stat },
  };
  persist(next);
  return next;
}

export function clearStats(): StatsBlob {
  const next = emptyBlob();
  persist(next);
  return next;
}
