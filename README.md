# Skill Router — AI Skills Marketplace & Agentic Orchestrator

**Live demo:** <https://ramp-skills-marketplace.vercel.app/>

A multi-agent skills marketplace where users type natural-language finance requests and a 3-agent pipeline (planner → executor → synthesizer) routes the request to one or more specialized skills, streams each step's status to the UI, and merges chained outputs into a single coherent response.

A separate **Insights** tab turns the session's usage into a feedback loop — per-skill 👍/👎 rollups, a routing-health score, deterministic QA flags, and a *"Diagnose with Claude"* button that hands the telemetry to a 4th analyst agent which returns prompt-level fixes citing specific skill files to edit.

Built as a portfolio piece for the Ramp **AI Operations Specialist | Agentic Workflows** role.

---

## How this maps to Ramp

| Ramp internal | Skill Router equivalent |
|---|---|
| **Dojo** — Ramp's marketplace of single-purpose AI skills | `skills/*.md` — 6 markdown-defined finance skills, each with its own system prompt, example inputs, and chaining hints. |
| **Sensei** — Ramp's routing layer that picks the right skill for a request | `src/lib/orchestrator.ts` — Claude-powered planner that returns an `ExecutionPlan` (ordered skill IDs + confidence). Plus `src/lib/roleRecommendations.ts` for proactive role-based surfacing. |
| (Not in Ramp today) **Skill chaining** | `src/lib/executor.ts` runs steps sequentially, injecting each prior skill's output as context for the next. `src/lib/synthesizer.ts` merges multi-skill outputs into one narrative. |
| **AI-built dashboards + QA + iterate on feedback** (the JD bullet) | `Insights` tab — `recharts` visualisations of per-skill 👍/👎 + confidence + routing-health, deterministic QA flags, and a *"Diagnose with Claude"* button that ships the session telemetry to a 4th agent (`agents/diagnostician.md`) which returns a prioritized markdown report citing specific skill files to edit. |

The chaining piece is the interesting bet: rather than treat skills as isolated single-shots (Dojo today), this demo shows what becomes possible when the router can *compose* skills automatically — e.g. "extract this invoice, categorize the line items, and flag anything non-compliant" runs three skills in order without the user wiring them up.

The Insights tab is the agentic punchline on top: Claude wrote the dashboard, *and* Claude is the analyst inside it — reading its own output and proposing concrete prompt-level improvements.

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

## The Insights tab

A separate tab that turns the session's usage into an AI-built feedback loop — the JD bullet on *"AI-built dashboards, QA checks, and iterate on user feedback"* rendered as a working surface.

| Card | What it shows |
|---|---|
| **Routing Health** | Composite score (0–100) — `avg confidence × thumbs-up rate × (1 − fallback rate)` — with traffic-light color, three sub-stats, and a time-axis sparkline of the last 10 routable queries. |
| **Skill Leaderboard** | Horizontal stacked bars per skill (👍 emerald · 👎 rose), sorted by run count. `recharts` `BarChart` with `layout="vertical"`. |
| **Confidence Histogram** | 5 bands aligned to the orchestrator's calibration rubric — Unambiguous (≥ 0.96) · High (0.81–0.95) · Medium (0.56–0.80) · Low (0.31–0.55) · No match. |
| **QA Flags** | Deterministic alerts over the data: low-approval skill (≥ 3 ratings, < 50% 👍), multi-skill chain with majority 👎, recent 10-query confidence average below 0.5, fallback rate above 10% over the last 20. |
| **Diagnose with Claude** | Ships the telemetry blob to a 4th analyst agent (`agents/diagnostician.md`). Returns a prioritized markdown report — top 1–3 issues with diagnosis + fix (citing specific skill files), plus one positive signal. Capped at 250 words. |

The first four cards are pure computation over `localStorage` — no API call, no flicker, no hallucinated alerts. **Diagnose** is the only LLM-backed piece, gated behind an explicit click so the dashboard stays fast and predictable.

Click **Load demo data** in the empty state to seed 20 synthetic entries (spanning ~22h of usage) and exercise every card immediately. The seed deliberately includes a low-approval skill and a chain with majority thumbs-down so two QA flags fire on first load.

### Telemetry & feedback

- Each assistant response writes a `ResponseStat` (skill IDs, confidence, error, timestamp) to `localStorage` under `skill-router:stats`.
- 👍 / 👎 on assistant messages writes a `FeedbackEntry` to `skill-router:feedback` (rating + skill IDs + prompt + timestamp).
- A footer pill (`SessionStats`) surfaces `queries · chains · avg confidence · fallbacks · 👍 / 👎` live during the session.
- Nothing leaves the device except when you click **Diagnose with Claude**, which posts the JSON blob to `/api/diagnose` for the Diagnostician agent.
- **Clear data** in the Insights header empties both keys; switching browsers or clearing site data resets the same way.

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
- **Markdown** — `react-markdown` + `remark-gfm` for assistant + diagnose-report rendering
- **Charts** — `recharts` for the Insights tab (bar leaderboard, histogram, time-axis sparkline)
- **Skill loading** — `gray-matter` for the `skills/*.md` frontmatter; codegen produces a client-safe metadata snapshot
- **Language** — TypeScript, strict mode
- **Persistence** — `localStorage` keys `skill-router:feedback` and `skill-router:stats` (no backend, no PII off-device)
- **Rate limiting** — `src/middleware.ts` caps `/api/chat` at 2 req/min per IP, `/api/diagnose` at 1 req/2min per IP. In-memory sliding-window (per-instance, not global) — first line of defense against drive-by scraping; the hard spend cap is set on the Anthropic key.

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
skills/                         # 6 markdown files — Dojo-style file-backed registry
agents/                         # 4 agent prompts as markdown — orchestrator / executor / synthesizer / diagnostician
AGENTS.md                       # Standalone explainer for the agent pipeline
MEMO.md                         # §6 submission memo (~1.5pp)
LOOM-OUTLINE.md                 # §6 90s recording script
docs/
└── architecture.md             # §6 Mermaid flow diagram + Ramp-internals mapping

scripts/
└── build-skill-metadata.mjs    # Codegen — emits src/lib/skill-metadata.ts on predev/prebuild/prelint

src/
├── app/
│   ├── page.tsx                # Main page — chat / skills / insights tab swap
│   ├── layout.tsx              # Fonts + theme
│   ├── globals.css             # Tailwind + markdown styling + theme tokens
│   └── api/
│       ├── chat/route.ts       # POST — NDJSON stream of pipeline events
│       └── diagnose/route.ts   # POST — Diagnostician markdown report
├── lib/
│   ├── types.ts                # Shared TS types + stream event union
│   ├── skills.ts               # 'server-only' loader for skills/*.md (gray-matter)
│   ├── skill-metadata.ts       # AUTO-GENERATED client-safe skill metadata
│   ├── agents.ts               # Loads agents/*.md at module init
│   ├── orchestrator.ts         # Agent 1: planner
│   ├── executor.ts             # Agent 2: runner (per-step onProgress)
│   ├── synthesizer.ts          # Agent 3: combiner (no-op for single-skill plans)
│   ├── roleRecommendations.ts  # Role → top-3 skill IDs map (Sensei surfacing)
│   ├── feedback.ts             # 👍/👎 localStorage layer
│   ├── stats.ts                # Per-response telemetry localStorage layer
│   └── insights.ts             # Pure rollups + 20-entry synthetic seed
└── components/
    ├── ChatPanel.tsx           # Chat scroll + input + example chips + live status
    ├── SkillMarketplace.tsx    # Right-rail grid of skill cards
    ├── SkillCard.tsx           # One card with clickable example inputs
    ├── SkillBadge.tsx          # Pill with icon + name
    ├── ExecutionPlan.tsx       # The "Invoice → Categorize → Compliance · 95%" row
    ├── MessageBubble.tsx       # Renders user / assistant / error messages + 👍/👎 thumbs
    ├── RoleStrip.tsx           # Sensei chip strip above the marketplace
    ├── SessionStats.tsx        # Footer pill: queries · chains · confidence · 👍/👎
    ├── InsightsPanel.tsx       # Insights tab body
    └── insights/
        ├── RoutingHealth.tsx        # Score + sub-stats + time-axis sparkline
        ├── SkillLeaderboard.tsx     # Horizontal stacked bars per skill (recharts)
        ├── ConfidenceHistogram.tsx  # 5-band histogram aligned to the rubric
        ├── QAFlags.tsx              # Deterministic alerts
        ├── EmptyState.tsx           # "Load demo data" CTA
        └── DiagnosePanel.tsx        # "Diagnose with Claude" button + report render
```
