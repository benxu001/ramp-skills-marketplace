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

// User-supplied rating on a single assistant message. Persisted to
// localStorage so the session stats survive a reload.
export interface FeedbackEntry {
  messageId: string;
  skillIds: string[];
  rating: 'up' | 'down';
  timestamp: number;
  prompt: string;
}

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
  /** Omitted for the hardcoded welcome bubble (no meaningful "sent at" time, and
   *  would otherwise cause an SSR/CSR hydration mismatch from `new Date()`). */
  timestamp?: Date;
}
