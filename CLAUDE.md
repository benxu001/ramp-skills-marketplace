# Skill Router — AI Skills Marketplace & Agentic Orchestrator

## What This Is
A portfolio project demonstrating an AI-powered skills marketplace with multi-agent orchestration (inspired by Ramp's Dojo + Sensei). Users type natural language requests, and a 3-agent system plans, executes, and synthesizes responses — automatically chaining multiple skills when a query requires it.

Target audience: Ramp hiring team for the "AI Product Operator" role. This project mirrors Ramp's internal Dojo (skill marketplace) and Sensei (AI routing layer), with the addition of multi-skill chaining that demonstrates genuinely agentic workflows.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — model: `claude-sonnet-4-5`
- **Charts**: `recharts` (Insights tab)
- **Language**: TypeScript
- **State**: React state (no database — skills are markdown files on disk, chat is in-memory). Feedback + per-response stats persist to `localStorage` under `skill-router:feedback` and `skill-router:stats`.

## Architecture

```
skills/                       # Skill registry — one markdown file per skill
├── expense-categorizer.md    # Frontmatter (metadata) + body (system prompt)
├── vendor-risk-flagger.md
├── invoice-extractor.md
├── policy-compliance-checker.md
├── spend-anomaly-detector.md
└── meeting-cost-calculator.md

agents/                       # Agent prompts as markdown (loaded at server start)
├── orchestrator.md           # Body = system prompt for the planner
├── executor.md               # First fenced block = user-message template for chained steps
├── synthesizer.md            # Body = system prompt for multi-skill merge
└── diagnostician.md          # Body = system prompt for the Insights "Diagnose with Claude" agent

AGENTS.md                     # Repo-root doc explaining the 3-agent pipeline

scripts/
└── build-skill-metadata.mjs  # Codegen: skills/*.md → src/lib/skill-metadata.ts
                              # Runs automatically via predev / prebuild / prelint

src/
├── app/
│   ├── page.tsx              # Main chat + marketplace UI + Insights tab swap
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Tailwind + custom styles
│   └── api/
│       ├── chat/route.ts     # POST endpoint: orchestrates the 3-agent pipeline (NDJSON stream)
│       └── diagnose/route.ts # POST endpoint: ships stats+feedback to the Diagnostician
├── lib/
│   ├── skills.ts             # Server-only loader: reads skills/*.md via gray-matter
│   ├── skill-metadata.ts     # AUTO-GENERATED client-safe metadata (no systemPrompt)
│   ├── agents.ts             # Loads agents/*.md at module init; exports prompts
│   ├── orchestrator.ts       # Agent 1: Plans execution — single skill or chain
│   ├── executor.ts           # Agent 2: Runs skills in sequence, passing outputs forward
│   ├── synthesizer.ts        # Agent 3: Combines multi-skill outputs into one response
│   ├── roleRecommendations.ts # Role → top-3 skill IDs map (Sensei surfacing layer)
│   ├── feedback.ts           # 👍/👎 localStorage layer (key: skill-router:feedback)
│   ├── stats.ts              # Per-response stats localStorage layer (key: skill-router:stats)
│   ├── insights.ts           # Pure rollups + 20-entry synthetic seed for the Insights tab
│   └── types.ts              # Shared TS types (Skill, SkillMeta, FeedbackEntry, ChatMessage…)
├── components/
│   ├── ChatPanel.tsx         # Chat interface (left panel); threads feedback to MessageBubble
│   ├── SkillCard.tsx         # Individual skill display card (supports Recommended badge)
│   ├── SkillMarketplace.tsx  # Grid of available skills (right panel); owns role-based reorder
│   ├── RoleStrip.tsx         # Sensei chip strip above marketplace (5 roles + clear)
│   ├── MessageBubble.tsx     # Chat message component; renders 👍/👎 on real assistant messages
│   ├── SessionStats.tsx      # Footer pill: queries · chains · avg confidence · fallbacks · 👍/👎
│   ├── SkillBadge.tsx        # Shows which skill(s) were used for a response
│   ├── ExecutionPlan.tsx     # Visual display of the orchestrator's plan
│   ├── InsightsPanel.tsx     # Insights tab body: composes routing-health / charts / QA / Diagnose
│   └── insights/
│       ├── RoutingHealth.tsx        # Score (0-100) + 3 sub-stats + time-axis sparkline
│       ├── SkillLeaderboard.tsx     # Horizontal stacked bars (👍 / 👎) per skill (recharts)
│       ├── ConfidenceHistogram.tsx  # 5-band histogram aligned to the orchestrator's rubric
│       ├── QAFlags.tsx              # Deterministic rules (low approval, chain down, etc.)
│       ├── EmptyState.tsx           # "Load demo data" CTA when telemetry is empty
│       └── DiagnosePanel.tsx        # Button + markdown render of the Diagnostician's reply
```

**Adding a new skill:** drop a `skills/<id>.md` file. The codegen step regenerates `skill-metadata.ts` on next `npm run dev` / `build` / `lint` — no other code changes needed.

**Editing agent behavior:** orchestrator / synthesizer / diagnostician prompts
and the executor's chained-step template live in `agents/*.md`. Edit the
markdown and restart the dev server — no code change needed. See `AGENTS.md`
for the full map.

## 3-Agent Pipeline

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────┐
│  ORCHESTRATOR (Agent 1)                         │
│  Reads the query + skill registry.              │
│  Decides: single skill, chain, or no match.     │
│  Returns an ExecutionPlan:                      │
│    - ordered list of skill IDs                  │
│    - how to pass output between steps           │
│    - confidence score                           │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  EXECUTOR (Agent 2)                             │
│  Runs each skill in the plan sequentially.      │
│  For chained skills, the prior skill's output   │
│  is injected as context into the next skill's   │
│  prompt. Collects all intermediate outputs.     │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│  SYNTHESIZER (Agent 3)                          │
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

## Skills (Finance-Themed, Mapping to Ramp Use Cases)

1. **Expense Categorizer** — Takes expense descriptions, categorizes into GL codes
2. **Vendor Risk Flagger** — Analyzes vendor names/descriptions for risk signals
3. **Invoice Data Extractor** — Extracts structured data from invoice text
4. **Policy Compliance Checker** — Checks expense requests against company policy
5. **Spend Anomaly Detector** — Flags unusual patterns in spend data
6. **Meeting Cost Calculator** — Estimates the cost of meetings based on attendees/duration

## Example Chains (Multi-Skill Queries)

- "Extract this invoice and check if it's compliant" → Invoice Extractor → Policy Compliance Checker
- "Categorize these expenses and flag any anomalies" → Expense Categorizer → Spend Anomaly Detector
- "Assess this vendor's risk and estimate the review meeting cost" → Vendor Risk Flagger → Meeting Cost Calculator
- "Extract this invoice, categorize the line items, and flag anything non-compliant" → Invoice Extractor → Expense Categorizer → Policy Compliance Checker (3-skill chain)

## Key Design Decisions
- **3 agents, not 1**: Orchestrator plans, executor runs, synthesizer merges — clean separation
- **Synthesizer is conditional**: only fires for multi-skill chains (saves latency on simple queries)
- **Chaining via context injection**: each skill's output is prepended to the next skill's user message as "Prior analysis" context — no shared memory or state management needed
- Skills are **markdown-defined** under `skills/` (extended frontmatter + system-prompt body), parsed by `gray-matter` — Dojo-style file-backed registry without a database
- The UI shows the **full execution plan** visually — which skills ran, in what order, with confidence
- **Feedback + stats persist to `localStorage`**, not a backend — keys `skill-router:feedback` and `skill-router:stats`. Survive reload; switching browsers / clearing site data resets them. No PII leaves the device.
- **Insights tab is "AI-built" twice over** — the dashboard itself is built by Claude as part of the app, *and* the "Diagnose with Claude" panel ships the localStorage telemetry to a 4th agent (`agents/diagnostician.md`) that returns a markdown report citing specific skill files to edit. Maps directly to the JD bullet on "AI-built dashboards, QA checks, and iteratively improve based on user feedback."
- **QA flags are deterministic, not LLM-generated** — predictable, no per-render API call, no hallucinated alerts. Only the Diagnose panel is LLM-backed, and it's gated behind an explicit button click.
- **Desktop nav exposes only an "Insights" toggle**; chat + skills are always side-by-side on `md+`. Mobile still gets the 3-tab pill switcher.
- No auth needed — this is a demo app

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Commands
```bash
npm run dev     # Start dev server on localhost:3000
npm run build   # Production build
npm run lint    # Lint
```

## Style Guidelines
- Clean, modern UI — dark theme with accent colors per skill
- Each skill gets a unique icon and color
- Chat panel on left, skill marketplace on right (desktop) or tabbed (mobile)
- Show the routing decision visually (which skill was picked, confidence score)
- Minimal animations, focus on clarity and speed

## Important Notes
- Always use `claude-sonnet-4-5` as the model string
- Use the Anthropic Node SDK (`@anthropic-ai/sdk`), NOT raw fetch
- Tool use is NOT needed for this project — we're using prompt templates, not tool calling
- Keep API calls server-side only (Next.js API routes)
- `src/lib/skills.ts` is marked `'server-only'` — never import it from a client component. Client components use `src/lib/skill-metadata.ts` (auto-generated, no systemPrompt)
- The orchestrator prompt should return JSON with: `{ steps: [{ skillId, reason }], confidence, reasoning }`
- The executor runs each step sequentially, injecting prior output as context
- The synthesizer only runs when steps.length > 1
- Max chain length: 3 skills (to cap latency and API cost)
