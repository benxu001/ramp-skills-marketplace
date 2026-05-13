# Agents

This project is built around three small Claude-powered agents that each do one job. Together they turn a free-form user query into a routed, executed, and synthesized response. Each agent's prompt lives as a markdown file in `agents/` — frontmatter declares the role and runtime parameters, the body is the prompt the model actually sees.

## Pipeline

```
User query
   │
   ▼
┌──────────────────────────────────────────────┐
│  Orchestrator  (agents/orchestrator.md)      │
│  Reads query + skill registry.               │
│  Returns ExecutionPlan as JSON:              │
│    { steps: [{ skillId, reason }], …, conf } │
└──────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────┐
│  Executor      (agents/executor.md)          │
│  Walks the plan step-by-step.                │
│  Each step uses that *skill's* system prompt.│
│  On chained steps, the prior skill's output  │
│  is prepended as "Prior Analysis" context    │
│  using the template in executor.md.          │
└──────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────────┐
│  Synthesizer   (agents/synthesizer.md)       │
│  Only runs when plan has 2+ steps.           │
│  Combines per-skill outputs into one         │
│  coherent markdown response.                 │
└──────────────────────────────────────────────┘
   │
   ▼
Final response (with execution plan metadata)
```

## The three agents

| Agent | File | Runtime role |
|---|---|---|
| **Orchestrator** | `agents/orchestrator.md` | Plans which skill(s) to run and in what order. Returns JSON. |
| **Executor** | `agents/executor.md` | Dispatches each plan step to the matching skill. Holds the *user-message* template that wraps prior context. |
| **Synthesizer** | `agents/synthesizer.md` | Merges multi-skill output into one response. Skipped for single-skill plans. |

## How the markdown files are loaded

`src/lib/agents.ts` reads each markdown file once at server start:

- **Orchestrator + Synthesizer** — the body (everything after the frontmatter) is the model's `system` prompt. To change behavior, edit the body and restart `npm run dev`.
- **Executor** — the body is mostly documentation; the *first fenced code block* is the user-message template applied on chained steps. Placeholders `{{PRIOR_BLOCK}}` and `{{USER_MESSAGE}}` are filled in by `src/lib/executor.ts` at call time.

Server-only: these files are read with `fs.readFileSync` and are tagged in `next.config.mjs` (`outputFileTracingIncludes`) so they ship with the Vercel deployment.

## Where to edit what

| Want to… | Edit |
|---|---|
| Change how the planner decides routes | `agents/orchestrator.md` (body) |
| Change how chained context is presented to a downstream skill | `agents/executor.md` (the code-fenced template) |
| Change how multi-skill output is merged | `agents/synthesizer.md` (body) |
| Change which model an agent uses | `src/lib/{orchestrator,synthesizer}.ts` (`MODEL` constant — the markdown frontmatter is currently descriptive, not load-bearing) |
| Add or modify a skill | `src/lib/skills.ts` |

## Why this layout

- **Legibility for non-engineers.** A reviewer skimming the repo can read the orchestrator's actual decision rules without grokking TypeScript.
- **Fast iteration.** Tuning a prompt is a markdown edit + dev-server refresh — no recompile, no code review.
- **Symmetry with skills.** Skills are headed in the same direction (TS → markdown — see `upgrade-plan.md` §1), so agents share the same shape.
