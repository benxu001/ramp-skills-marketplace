// In-memory sliding-window rate limiter. Per-instance, not global —
// Vercel scales out under load and each isolate has its own Map, so the
// effective ceiling on `2 req/min` grows with instance count. This is a
// first line of defense against drive-by scraping, not a hard cap. The
// hard cap is the Anthropic per-key spend limit set in the Console.

const HITS = new Map<string, number[]>();

let lastCleanup = Date.now();
const CLEANUP_EVERY_MS = 5 * 60 * 1000;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_EVERY_MS) return;
  lastCleanup = now;
  const cutoff = now - STALE_THRESHOLD_MS;
  HITS.forEach((hits, key) => {
    const recent = hits.filter((t) => t > cutoff);
    if (recent.length === 0) HITS.delete(key);
    else HITS.set(key, recent);
  });
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  cleanupIfNeeded();
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = HITS.get(key) ?? [];
  const recent = hits.filter((t) => t > cutoff);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(
      Math.ceil((oldest + windowMs - now) / 1000),
      1,
    );
    HITS.set(key, recent);
    return { allowed: false, retryAfterSeconds };
  }

  recent.push(now);
  HITS.set(key, recent);
  return { allowed: true };
}
