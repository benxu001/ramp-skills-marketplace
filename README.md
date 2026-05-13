# Skill Router — AI Skills Marketplace & Agentic Orchestrator

A multi-agent skills marketplace where users type natural-language finance requests and a 3-agent pipeline (planner → executor → synthesizer) routes the request to one or more specialized skills, streams each step's status to the UI, and merges chained outputs into a single coherent response.

Built as a portfolio piece for the Ramp **AI Product Operator** role.

---

## How this maps to Ramp

| Ramp internal | Skill Router equivalent |
|---|---|
| **Dojo** — Ramp's marketplace of single-purpose AI skills | `src/lib/skills.ts` — a typed registry of 6 finance skills, each with its own system prompt and example inputs. |
| **Sensei** — Ramp's routing layer that picks the right skill for a request | `src/lib/orchestrator.ts` — Claude-powered planner that returns an `ExecutionPlan` (ordered skill IDs + confidence). |
| (Not in Ramp today) **Skill chaining** | `src/lib/executor.ts` runs steps sequentially, injecting each prior skill's output as context for the next. `src/lib/synthesizer.ts` merges multi-skill outputs into one narrative. |

The chaining piece is the interesting bet: rather than treat skills as isolated single-shots (Dojo today), this demo shows what becomes possible when the router can *compose* skills automatically — e.g. "extract this invoice, categorize the line items, and flag anything non-compliant" runs three skills in order without the user wiring them up.

---

## Architecture — 3-agent pipeline

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│  ORCHESTRATOR  (src/lib/orchestrator.ts)        │
│  Reads the query + skill registry.              │
│  Decides: single skill, chain, or no match.     │
│  Returns an ExecutionPlan:                      │
│    - ordered list of skill IDs (1-3 steps)      │
│    - how to pass output between steps           │
│    - confidence score                           │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  EXECUTOR  (src/lib/executor.ts)                │
│  Runs each skill in the plan sequentially.      │
│  For chained skills, the prior skill's output   │
│  is injected as "Prior Analysis" context into   │
│  the next skill's prompt. Collects all          │
│  intermediate outputs.                          │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  SYNTHESIZER  (src/lib/synthesizer.ts)          │
│  Only runs for multi-skill chains.              │
│  Takes all skill outputs + original query.      │
│  Produces one unified, coherent response.       │
│  For single-skill queries, skipped — executor   │
│  output is returned directly.                   │
└─────────────────────────────────────────────────┘
    │
    ▼
Final Response (with execution plan metadata)
```

The API route at `src/app/api/chat/route.ts` streams an NDJSON event sequence (`plan` → `step_start`/`step_done` → `synth_start` → `final`) so the UI can show *which* skill is running right now, not just a generic spinner.

---

## The 6 skills

| Skill | What it does |
|---|---|
| 🧾 Expense Categorizer | Parses raw expense descriptions into GL categories + codes with confidence. |
| 🚩 Vendor Risk Flagger | Surfaces risk signals for a vendor: geography, data sensitivity, freshness, industry. |
| 📄 Invoice Data Extractor | Pulls structured fields (vendor / number / date / line items / totals / terms) out of pasted invoice text. |
| ✅ Policy Compliance Checker | Evaluates an expense against a hardcoded company policy (meal caps, software approval thresholds, travel pre-approval, etc.). |
| 🔍 Spend Anomaly Detector | Flags duplicates, weekend charges, round-number patterns, and outlier amounts in a transaction list. |
| ⏱️ Meeting Cost Calculator | Estimates the loaded-cost of a meeting from attendee count + seniority mix + duration, with a worth-it verdict. |

Each skill exposes `chainableAfter` hints so the orchestrator knows which compositions are natural.

---

## Example chains (multi-skill queries)

- **"Extract this invoice and check if it's compliant"**
  → Invoice Extractor → Policy Compliance Checker
- **"Categorize these expenses and flag any anomalies"**
  → Expense Categorizer → Spend Anomaly Detector
- **"Extract this invoice, categorize the line items, and flag anything non-compliant"** (3-skill chain)
  → Invoice Extractor → Expense Categorizer → Policy Compliance Checker
- **"Assess this vendor's risk and estimate the review meeting cost"**
  → Vendor Risk Flagger → Meeting Cost Calculator

The chat UI shows the chosen chain as a row of badges with arrows above the response — same visual primitive as Sensei's routing decision.

---

## Run locally

Prereqs: Node 18+, an Anthropic API key.

```bash
git clone <this-repo>
cd ramp-skills-marketplace
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm run dev
# Open http://localhost:3000
```

Useful scripts:

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run lint     # eslint
```

---

## Tech stack

- **Framework** — Next.js 14 (App Router, RSC + client components)
- **Styling** — Tailwind CSS, dark theme, JetBrains Mono + Inter
- **AI** — Anthropic Claude via `@anthropic-ai/sdk` (model: `claude-sonnet-4-5`)
- **Streaming** — NDJSON over `fetch` + `ReadableStream` (no SSE / no WS)
- **Markdown** — `react-markdown` + `remark-gfm` for assistant message rendering
- **Language** — TypeScript, strict mode
- **State** — React state only (skills are code-defined; chat is in-memory)

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set `ANTHROPIC_API_KEY` in the Vercel project's environment variables before the first production deploy.

---

## Screenshots

_To be added after demo recording._

---

## Project layout

```
src/
├── app/
│   ├── page.tsx              # Main page — chat + marketplace
│   ├── layout.tsx            # Fonts + theme
│   ├── globals.css           # Tailwind + markdown styling + theme tokens
│   └── api/chat/route.ts     # POST endpoint — NDJSON stream of pipeline events
├── lib/
│   ├── types.ts              # Shared TypeScript types + stream event union
│   ├── skills.ts             # The 6 skill definitions
│   ├── colors.ts             # Skill-color → Tailwind class helpers
│   ├── orchestrator.ts       # Agent 1: planner
│   ├── executor.ts           # Agent 2: runner (with per-step onProgress)
│   └── synthesizer.ts        # Agent 3: combiner (no-op for single-skill plans)
└── components/
    ├── ChatPanel.tsx         # Chat scroll + input + example chips + live status
    ├── SkillMarketplace.tsx  # Right-rail grid of skill cards
    ├── SkillCard.tsx         # One card with clickable example inputs
    ├── SkillBadge.tsx        # Pill with icon + name
    ├── ExecutionPlan.tsx     # The "Invoice → Categorize → Compliance · 95%" row
    └── MessageBubble.tsx     # Renders user / assistant / error messages
```
