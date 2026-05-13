import Anthropic from '@anthropic-ai/sdk';
import type { SkillResult } from './types';

const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You are a synthesis agent. You've received outputs from multiple finance analysis skills that were run in sequence on a user's request. Combine them into one clear, unified response.

RULES:
- Preserve all data, tables, and specific findings from each skill
- Don't just concatenate — create a coherent narrative that flows naturally
- Use clear section headers to separate each skill's contribution
- End with a brief "Summary" section that ties the findings together
- Use markdown formatting (tables, bold, headers) for readability`;

function buildUserMessage(
  userMessage: string,
  results: SkillResult[],
): string {
  const blocks = results
    .map(
      (r, i) =>
        `### Step ${i + 1}: ${r.skillName}\n\n${r.output}`,
    )
    .join('\n\n');

  return `Original user request:
${userMessage}

Outputs from each skill, in execution order:

${blocks}

Synthesize these into one unified response per the rules.`;
}

export async function synthesizeResults(
  userMessage: string,
  results: SkillResult[],
): Promise<string> {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0].output;

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserMessage(userMessage, results) },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (textBlock && textBlock.type === 'text') return textBlock.text;

  return results.map((r) => `### ${r.skillName}\n\n${r.output}`).join('\n\n');
}
