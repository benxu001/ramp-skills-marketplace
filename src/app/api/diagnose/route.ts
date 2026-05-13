import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { DIAGNOSTICIAN_SYSTEM_PROMPT } from '@/lib/agents';
import { perSkillStats } from '@/lib/insights';
import type { FeedbackMap } from '@/lib/feedback';
import type { StatsBlob } from '@/lib/stats';

export const runtime = 'nodejs';

const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 800;
const MAX_RECORDS = 100;

function isApiKeyConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return !!key && key !== 'your-key-here' && key.startsWith('sk-');
}

function ageHours(ts: number, now: number): number {
  if (!ts) return 0;
  return Math.round((now - ts) / 36000) / 100;
}

function isStatsBlob(value: unknown): value is StatsBlob {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.queries === 'object' &&
    v.queries !== null &&
    typeof v.responses === 'object' &&
    v.responses !== null
  );
}

function isFeedbackMap(value: unknown): value is FeedbackMap {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every(
    (e) =>
      e &&
      typeof e === 'object' &&
      ((e as { rating?: unknown }).rating === 'up' ||
        (e as { rating?: unknown }).rating === 'down'),
  );
}

function buildPromptBody(
  stats: StatsBlob,
  feedback: FeedbackMap,
  now: number,
): string {
  const responses = Object.entries(stats.responses)
    .map(([id, r]) => ({
      id,
      skillIds: r.skillIds,
      confidence: r.confidence,
      error: r.error,
      ageHours: ageHours(r.timestamp, now),
    }))
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(-MAX_RECORDS);

  const ratings = Object.values(feedback)
    .map((f) => ({
      messageId: f.messageId,
      skillIds: f.skillIds,
      rating: f.rating,
      prompt: f.prompt.length > 240 ? f.prompt.slice(0, 240) + '…' : f.prompt,
      ageHours: ageHours(f.timestamp, now),
    }))
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(-MAX_RECORDS);

  const perSkill = perSkillStats(stats, feedback);

  const blob = {
    summary: {
      totalResponses: responses.length,
      totalRatings: ratings.length,
      totalFallbacks: responses.filter((r) => r.error).length,
    },
    perSkill,
    responses,
    feedback: ratings,
  };

  return `Session telemetry:\n\n\`\`\`json\n${JSON.stringify(blob, null, 2)}\n\`\`\`\n\nReturn the diagnostic report as markdown only.`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const stats = (body as { stats?: unknown })?.stats;
  const feedback = (body as { feedback?: unknown })?.feedback;
  if (!isStatsBlob(stats) || !isFeedbackMap(feedback)) {
    return NextResponse.json(
      { error: 'stats and feedback are required' },
      { status: 400 },
    );
  }

  if (!isApiKeyConfigured()) {
    return NextResponse.json(
      {
        error:
          'ANTHROPIC_API_KEY is not configured on the server. Set it in .env.local (or in your Vercel project env) and restart the dev server.',
      },
      { status: 503 },
    );
  }

  const responses = Object.values(stats.responses);
  if (responses.length === 0 && Object.keys(feedback).length === 0) {
    return NextResponse.json(
      { error: 'No telemetry to analyze. Load demo data or run a few queries first.' },
      { status: 400 },
    );
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: DIAGNOSTICIAN_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildPromptBody(stats, feedback, Date.now()),
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json(
        { error: 'Diagnostician returned an empty response.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply: textBlock.text.trim() });
  } catch (err) {
    console.error('[/api/diagnose] unexpected error', err);
    return NextResponse.json(
      { error: 'Something went wrong while running the diagnosis.' },
      { status: 500 },
    );
  }
}
