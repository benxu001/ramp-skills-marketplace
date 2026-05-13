import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Skill } from './types';

const SKILLS_DIR = path.join(process.cwd(), 'skills');

function loadSkillsFromDisk(): Skill[] {
  const files = fs
    .readdirSync(SKILLS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const loaded = files.map((file) => {
    const raw = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    return {
      id: String(data.id),
      name: String(data.name),
      description: String(data.description),
      icon: String(data.icon),
      color: String(data.color),
      category: String(data.category),
      exampleInputs: Array.isArray(data.exampleInputs)
        ? (data.exampleInputs as string[])
        : [],
      outputFormat: String(data.outputFormat ?? ''),
      systemPrompt: content.trim(),
      chainableAfter: Array.isArray(data.chainableAfter)
        ? (data.chainableAfter as string[])
        : undefined,
    } satisfies Skill;
  });

  // Preserve the original registry order from the previous TS file so the
  // marketplace UI looks identical to the pre-migration build.
  const ORDER = [
    'expense-categorizer',
    'vendor-risk-flagger',
    'invoice-extractor',
    'policy-compliance-checker',
    'spend-anomaly-detector',
    'meeting-cost-calculator',
  ];
  return loaded.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

export const skills: Skill[] = loadSkillsFromDisk();

export function getSkillById(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
