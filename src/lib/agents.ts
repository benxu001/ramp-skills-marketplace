import fs from 'node:fs';
import path from 'node:path';

const AGENTS_DIR = path.join(process.cwd(), 'agents');

function readAgentFile(name: string): string {
  return fs.readFileSync(path.join(AGENTS_DIR, `${name}.md`), 'utf8');
}

function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---\n')) return raw;
  const end = raw.indexOf('\n---', 4);
  if (end === -1) return raw;
  return raw.slice(end + 4).replace(/^\n+/, '');
}

function extractFirstFencedBlock(body: string): string | null {
  const match = body.match(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/);
  return match ? match[1].replace(/\n$/, '') : null;
}

function loadSystemPrompt(name: string): string {
  return stripFrontmatter(readAgentFile(name)).trim();
}

function loadTemplate(name: string): string {
  const body = stripFrontmatter(readAgentFile(name));
  const fenced = extractFirstFencedBlock(body);
  if (!fenced) {
    throw new Error(
      `Agent "${name}" markdown body must contain a fenced code block holding its template.`,
    );
  }
  return fenced;
}

export const ORCHESTRATOR_SYSTEM_PROMPT = loadSystemPrompt('orchestrator');
export const SYNTHESIZER_SYSTEM_PROMPT = loadSystemPrompt('synthesizer');
export const EXECUTOR_USER_TEMPLATE = loadTemplate('executor');
export const DIAGNOSTICIAN_SYSTEM_PROMPT = loadSystemPrompt('diagnostician');
