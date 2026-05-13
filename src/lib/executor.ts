import Anthropic from '@anthropic-ai/sdk';
import type { ExecutionPlan, Skill, SkillResult } from './types';

const MODEL = 'claude-sonnet-4-5';

export type ExecutorProgressEvent =
  | { type: 'step_start'; skillId: string; skillName: string; index: number }
  | { type: 'step_done'; skillId: string; skillName: string; index: number };

function buildUserMessage(
  userMessage: string,
  priorResults: SkillResult[],
): string {
  if (priorResults.length === 0) {
    return userMessage;
  }

  const priorBlock = priorResults
    .map((r) => `[${r.skillName}] produced:\n${r.output}`)
    .join('\n\n');

  return `--- Prior Analysis ---
${priorBlock}
---

Now, given the above context and the user's original request below, perform your analysis.

User request: ${userMessage}`;
}

export async function executeSkills(
  plan: ExecutionPlan,
  userMessage: string,
  skills: Skill[],
  onProgress?: (event: ExecutorProgressEvent) => void,
): Promise<SkillResult[]> {
  if (plan.steps.length === 0) return [];

  const client = new Anthropic();
  const results: SkillResult[] = [];

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const skill = skills.find((s) => s.id === step.skillId);
    if (!skill) continue;

    onProgress?.({
      type: 'step_start',
      skillId: skill.id,
      skillName: skill.name,
      index: i,
    });

    const content = buildUserMessage(userMessage, results);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: skill.systemPrompt,
      messages: [{ role: 'user', content }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const output =
      textBlock && textBlock.type === 'text'
        ? textBlock.text
        : '(no output from skill)';

    results.push({
      skillId: skill.id,
      skillName: skill.name,
      output,
    });

    onProgress?.({
      type: 'step_done',
      skillId: skill.id,
      skillName: skill.name,
      index: i,
    });
  }

  return results;
}
