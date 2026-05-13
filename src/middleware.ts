import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/ratelimit';

const LIMITS = {
  '/api/chat': { max: 2, windowMs: 60_000, label: 'chat' },
  '/api/diagnose': { max: 1, windowMs: 120_000, label: 'diagnose' },
} as const;

function clientKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'anonymous';
  return request.ip ?? 'anonymous';
}

export function middleware(request: NextRequest) {
  const cfg = LIMITS[request.nextUrl.pathname as keyof typeof LIMITS];
  if (!cfg) return NextResponse.next();

  const ip = clientKey(request);
  const result = checkRateLimit(`${cfg.label}:${ip}`, cfg.max, cfg.windowMs);
  if (result.allowed) return NextResponse.next();

  return NextResponse.json(
    {
      error: `Rate limit exceeded. Try again in ${result.retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Limit': String(cfg.max),
        'X-RateLimit-Window-Seconds': String(cfg.windowMs / 1000),
      },
    },
  );
}

export const config = {
  matcher: ['/api/chat', '/api/diagnose'],
};
