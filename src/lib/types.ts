// A skill in the marketplace.
// Full shape including the system prompt — only safe to import server-side.
export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  exampleInputs: string[];
  systemPrompt: string;
  outputFormat: string;
  chainableAfter?: string[];
}

// Client-safe view of a skill. Excludes systemPrompt so it can be bundled
// into the browser without leaking prompt internals or pulling in `fs`.
export type SkillMeta = Omit<Skill, 'systemPrompt'>;

// A single step in an execution plan
export interface ExecutionStep {
  skillId: string;
  reason: string;
}

// Orchestrator response — the execution plan
export interface ExecutionPlan {
  steps: ExecutionStep[];
  confidence: number;
  reasoning: string;
}

// Result of a single skill execution
export interface SkillResult {
  skillId: string;
  skillName: string;
  output: string;
}

// NDJSON event emitted by POST /api/chat as it streams.
export type ChatStreamEvent =
  | {
      type: 'plan';
      plan: {
        steps: { skillId: string; skillName: string }[];
        confidence: number;
      };
    }
  | { type: 'step_start'; skillId: string; skillName: string; index: number }
  | { type: 'step_done'; skillId: string; skillName: string; index: number }
  | { type: 'synth_start' }
  | {
      type: 'final';
      reply: string;
      executionPlan:
        | {
            steps: { skillId: string; skillName: string }[];
            confidence: number;
          }
        | null;
    }
  | { type: 'error'; code: 'no_api_key' | 'internal'; message: string };

// Chat message
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  executionPlan?: {
    steps: { skillId: string; skillName: string }[];
    confidence: number;
  };
  /** Set on assistant messages produced by a failed request. */
  error?: boolean;
  /** Original user prompt that produced this error — used by the retry button. */
  retryPrompt?: string;
  timestamp: Date;
}
