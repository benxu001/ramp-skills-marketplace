import Anthropic from '@anthropic-ai/sdk';
import { skills } from './skills';
import { ORCHESTRATOR_SYSTEM_PROMPT } from './agents';
import type { ExecutionPlan, Skill } from './types';

const MODEL = 'claude-sonnet-4-5';

function summarizeSkillsForPrompt(registry: Skill[]): string {
  return registry
    .map((s) => {
      const chain =
        s.chainableAfter && s.chainableAfter.length > 0
          ? `\n  chainableAfter: [${s.chainableAfter.join(', ')}]`
          : '';
      const examples = s.exampleInputs
        .map((ex) => `    - ${ex.replace(/\s+/g, ' ').slice(0, 140)}`)
        .join('\n');
      return `- id: ${s.id}
  name: ${s.name}
  description: ${s.description}${chain}
  exampleInputs:
${examples}`;
    })
    .join('\n');
}

function buildUserMessage(query: string): string {
  return `Available skills:
${summarizeSkillsForPrompt(skills)}

User query:
${query}

Return the execution plan as JSON only — no prose, no code fences.`;
}

const VALID_SKILL_IDS = new Set(skills.map((s) => s.id));

function isPlausiblePlan(value: unknown): value is ExecutionPlan {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.steps)) return false;
  if (typeof v.confidence !== 'number') return false;
  if (typeof v.reasoning !== 'string') return false;
  return v.steps.every(
    (s) =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as { skillId?: unknown }).skillId === 'string' &&
      typeof (s as { reason?: unknown }).reason === 'string',
  );
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

const EMPTY_PLAN: ExecutionPlan = {
  steps: [],
  confidence: 0,
  reasoning: 'No matching skills.',
};

export async function planExecution(query: string): Promise<ExecutionPlan> {
  if (!query.trim()) return EMPTY_PLAN;

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: ORCHESTRATOR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(query) }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return EMPTY_PLAN;

    const raw = extractJson(textBlock.text);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return EMPTY_PLAN;
    }

    if (!isPlausiblePlan(parsed)) return EMPTY_PLAN;

    const filteredSteps = parsed.steps
      .filter((s) => VALID_SKILL_IDS.has(s.skillId))
      .slice(0, 3);

    if (filteredSteps.length === 0 || parsed.confidence < 0.3) {
      return {
        steps: [],
        confidence: parsed.confidence ?? 0,
        reasoning: parsed.reasoning ?? EMPTY_PLAN.reasoning,
      };
    }

    return {
      steps: filteredSteps,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch {
    return EMPTY_PLAN;
  }
}
