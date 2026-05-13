import { NextResponse } from 'next/server';
import { planExecution } from '@/lib/orchestrator';
import { executeSkills } from '@/lib/executor';
import { synthesizeResults } from '@/lib/synthesizer';
import { skills } from '@/lib/skills';
import type { ChatStreamEvent } from '@/lib/types';

export const runtime = 'nodejs';

function fallbackReply(): string {
  const skillList = skills
    .map((s) => `- **${s.name}** — ${s.description}`)
    .join('\n');

  const examples = skills
    .slice(0, 3)
    .map((s) => `- "${s.exampleInputs[0]}"`)
    .join('\n');

  return `I don't have a specific skill for that. Here are the skills I can help with:

${skillList}

Try asking something like:
${examples}`;
}

function isApiKeyConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return !!key && key !== 'your-key-here' && key.startsWith('sk-');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const message =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message.trim()
      : '';

  if (!message) {
    return NextResponse.json(
      { error: 'message is required' },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      };

      try {
        if (!isApiKeyConfigured()) {
          emit({
            type: 'error',
            code: 'no_api_key',
            message:
              'ANTHROPIC_API_KEY is not configured on the server. Set it in .env.local (or in your Vercel project env) and restart the dev server.',
          });
          return;
        }

        const plan = await planExecution(message);

        if (plan.steps.length === 0) {
          emit({
            type: 'final',
            reply: fallbackReply(),
            executionPlan: null,
          });
          return;
        }

        const planForClient = {
          steps: plan.steps
            .map((s) => {
              const skill = skills.find((k) => k.id === s.skillId);
              return skill
                ? { skillId: skill.id, skillName: skill.name }
                : null;
            })
            .filter((s): s is { skillId: string; skillName: string } => !!s),
          confidence: plan.confidence,
        };
        emit({ type: 'plan', plan: planForClient });

        const results = await executeSkills(plan, message, skills, (event) => {
          emit(event);
        });

        if (results.length === 0) {
          emit({
            type: 'final',
            reply: fallbackReply(),
            executionPlan: null,
          });
          return;
        }

        let reply: string;
        if (results.length > 1) {
          emit({ type: 'synth_start' });
          reply = await synthesizeResults(message, results);
        } else {
          reply = results[0].output;
        }

        emit({
          type: 'final',
          reply,
          executionPlan: {
            steps: results.map((r) => ({
              skillId: r.skillId,
              skillName: r.skillName,
            })),
            confidence: plan.confidence,
          },
        });
      } catch (err) {
        console.error('[/api/chat] unexpected error', err);
        emit({
          type: 'error',
          code: 'internal',
          message: 'Something went wrong. Please try again.',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
