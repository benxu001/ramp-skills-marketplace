import Anthropic from '@anthropic-ai/sdk';
import { SYNTHESIZER_SYSTEM_PROMPT } from './agents';
import type { SkillResult } from './types';

const MODEL = 'claude-sonnet-4-5';

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
    system: SYNTHESIZER_SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserMessage(userMessage, results) },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (textBlock && textBlock.type === 'text') return textBlock.text;

  return results.map((r) => `### ${r.skillName}\n\n${r.output}`).join('\n\n');
}
