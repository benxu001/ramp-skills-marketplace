# Skill Router — portfolio submission

**Role:** AI Operations Specialist | Agentic Workflows
**Author:** Ben Xu · `ben.xu01@gmail.com`
**Date:** 2026-05-13
**Live demo:** <https://ramp-skills-marketplace.vercel.app/> · **Repo:** <https://github.com/benxu001/ramp-skills-marketplace>
**Companion artifacts:** [`docs/architecture.md`](docs/architecture.md) (flow diagram), [`LOOM-OUTLINE.md`](LOOM-OUTLINE.md) (90s recording script), [`AGENTS.md`](AGENTS.md) (agent pipeline doc).

---

## TL;DR

- **What it is.** *Skill Router* — an AI skills marketplace styled after Ramp's **Dojo** + **Sensei**, with a 3-agent pipeline that *composes* skills automatically. A query like *"Extract this invoice, categorize the line items, and flag anything non-compliant"* runs three skills in order with no user wiring.
- **The bet.** Single-skill routing leaves compound workflows on the table. Once Dojo crosses ~50 skills, **composition is the next bottleneck, not coverage** — the highest-value workflows are the ones nobody runs because nobody knows to chain them by hand.
- **The agentic punchline.** An *Insights* tab built into the app turns session telemetry into a feedback loop: Claude wrote the dashboard, *and* a fourth Claude agent (the Diagnostician) reads its own output to propose specific prompt-level fixes citing skill files to edit. AI-built dashboard + AI-built analyst in one surface — the JD bullet on *"AI-built dashboards, QA checks, and iteratively improve based on user feedback"* rendered as a working artifact.

---

## Problem framing — why chaining

Dojo is a marketplace for single-purpose AI skills. Sensei routes a request to the right skill. This works beautifully when a request maps to one skill — *"categorize these expenses"* → the categorizer. But finance work is rarely one-shot. An AP specialist who pastes a new invoice doesn't just want extraction; they want extraction → categorization → policy compliance, in that order, automatically.

The cost of *not* chaining isn't a missing feature; it's a UX tax that grows with registry depth. A user has to know to invoke skill A, copy its output into B's input, then again into C's. Three skills' worth of friction for what's really one workflow. By the time the registry crosses ~50 skills, the most valuable workflows are the ones nobody runs because nobody composes them.

**The bet here is that the next bottleneck is composition, not coverage.** A planner agent that reads the registry, knows which skills can chain after which (via `chainableAfter` frontmatter), and returns a `[skillA → skillB → skillC]` plan turns the hardest workflows into one-prompt requests. That's what Sensei could grow into.

---

## What I built

**3-agent request pipeline** (see [`docs/architecture.md`](docs/architecture.md) for the flow diagram):

1. **Orchestrator** (`agents/orchestrator.md`) — reads the query + skill registry, returns an `ExecutionPlan` JSON: ordered skill IDs, confidence (0–1, calibrated to a 5-band rubric), and a reasoning trail.
2. **Executor** (`agents/executor.md`) — runs each skill sequentially. For chained skills, the prior output is injected as a `## Prior Analysis` block in the next skill's user message. No shared state, no orchestration framework — just context injection.
3. **Synthesizer** (`agents/synthesizer.md`) — merges multi-skill outputs into one coherent response. **Conditional**: single-skill plans skip the synthesizer entirely to keep latency low.

The chat UI shows the chosen chain as a row of badges with arrows above the response, and streams per-step status (`plan` → `step_start`/`step_done` → `synth_start` → `final`) as NDJSON so the user sees *which* skill is running right now, not a generic spinner.

**6 finance skills**, each a markdown file under `skills/`: expense categorizer, vendor risk flagger, invoice data extractor, policy compliance checker, spend anomaly detector, meeting cost calculator. Each skill has extended frontmatter (icon, color, examples, `chainableAfter`, output format) and the system prompt as its body. **Adding a 7th skill is one new `.md` file** — a codegen script regenerates the client-safe metadata on the next `npm run dev`.

**Sensei role strip** — five role chips (AP Specialist, Procurement, Controller, FP&A, Founder / GM) above the marketplace. Clicking a chip reorders the cards by that role's top-3 skills, each tagged with a *Recommended for {role}* badge. Proactive surfacing on top of reactive routing.

**Insights tab — the AI-built feedback loop.** A third tab that turns session usage into a measurement surface:

- **Routing Health** — composite score (avg confidence × thumbs-up rate × (1 − fallback rate)) with a time-axis sparkline of the last 10 routable queries.
- **Skill Leaderboard** — horizontal stacked bars per skill (👍 / 👎).
- **Confidence Histogram** — 5 bands aligned to the orchestrator's own calibration rubric. Makes the rubric visible *as a result of itself*.
- **QA Flags** — *deterministic* rules over the data: low-approval skill, chain with majority 👎, recent confidence < 0.5, fallback rate > 10%. No LLM call, no flicker, no hallucinated alerts.
- **Diagnose with Claude** — a button that ships the telemetry blob to `agents/diagnostician.md`, a fourth analyst agent that returns a prioritized markdown report: top 1–3 issues with diagnosis + fix (citing specific skill files to edit), plus one positive signal. Capped at 250 words. Cost per click ~$0.01; gated behind an explicit click.

**Everything is markdown-defined.** Six skills, four agents (orchestrator / executor / synthesizer / diagnostician), and the in-repo docs (`AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`) are all `.md` files an operator can edit without touching TypeScript. That's the right shape for an internal AI tool: optimize for prompt-iteration speed.

---

## Tangible impact (honest framing)

This is a prototype, not a deployed product, so I can't show real-user metrics. What I *can* show:

- **The 3-agent pipeline works end-to-end on the four canonical chain queries.** Invoice → policy compliance, expense categorizer → anomaly detection, vendor risk → meeting cost, and the 3-skill invoice → categorizer → policy chain. The orchestrator returns the expected plan in each case; the executor wires the outputs; the synthesizer merges coherently.
- **The Insights feedback loop is real and exercisable.** Clicking *"Load demo data"* seeds 20 synthetic entries that deliberately trip two QA flags (a low-approval skill and a low-approval chain). Clicking *Diagnose with Claude* returns a markdown report citing those specific skill IDs and proposing concrete fixes — not generic advice, not boilerplate.
- **The build itself was data-driven.** Five upgrade phases, each shipped as a separate commit with explicit acceptance criteria and post-hoc deviation notes (see [`upgrade-plan.md`](upgrade-plan.md)). The plan tracks four landed phases plus this submission bundle.

**What I'd measure if this shipped at Ramp**, in priority order:

1. Per-skill **thumbs-up rate** (leading indicator of prompt quality).
2. **Chain completion confidence** (how often does the orchestrator return a plan with > 0.85 confidence?).
3. **Fallback rate** (queries with no matching skill — surfaces coverage gaps).
4. **Diagnostician → ship time** — the rate at which Diagnostician-proposed fixes ship to production within a week of being surfaced. This is the loop's KPI: a feedback loop you don't act on is theatre.

The Insights tab is built to surface those metrics directly. The Diagnostician closes the loop.

---

## What this shows about how I work

**Shipping discipline.** I started from a five-section upgrade plan with explicit acceptance criteria per phase. Each phase landed as a separate commit with a follow-up doc-sync commit. The plan tracks where I deviated from the spec at implementation time (e.g., desktop nav wasn't a 3-tab switcher because chat/skills tabs were a no-op on `md+`; sparkline X axis switched from sequence index to real timestamps once I had data to plot). Plans aren't aspirational — they're the work doc.

**Product-operator framing.** The README opens with a Ramp-mapping table, not a feature list. Every component points back to a Ramp internal: Dojo, Sensei, Glass. The Insights tab exists because the JD names that bullet explicitly — and the implementation matches the framing (Claude builds the dashboard, *and* Claude is the analyst inside it). I built the thing that answers the question the JD asks, not the thing that flattered my preferences.

**Technical fluency without backend-only thinking.** No DB, no auth, no infra. The skill registry, the agent prompts, and the Diagnostician's prompt are all `.md` files an operator can edit. Telemetry stays in `localStorage` — no PII off-device. That's the right shape for an internal AI prototype: maximize the surface area an operator can iterate on without involving an engineer.

---

## v2 roadmap (one sentence each)

- **Memory** — persist a thread of past chains per user so the orchestrator can learn personal patterns ("this user's invoices always need policy compliance after extraction").
- **Scheduled automations** — turn a chain into a recurring job ("every Monday, run anomaly detection over last week's expenses").
- **Slack assistant** — same orchestrator, different frontend; a Slack DM triggers a chain, the bot posts the response inline.
- **User-contributed skills** — open the `skills/` directory to PRs from non-engineers; Sensei treats community skills the same way it treats official ones. (This is the Dojo bet generalized.)
- **A11y + i18n pass** — the dashboard's traffic-light colors should not be the only signal; sparkline tick labels are English-only.

---

## Lessons

**The chaining cost-to-build was lower than I expected; the cost-to-make-legible was higher.** The orchestrator's plan, the executor's per-step output, and the synthesizer's merge are all easy to write. The hard part was making the routing decisions *visible* in the UI so a reviewer can see what the agent decided, not just what it returned. The execution-plan badges and the streaming NDJSON status events are what do that work — without them, the whole pipeline looks like one opaque call.

**The Insights tab is the piece I'd ship first if this were a real product.** The dashboard is fine, but the *Diagnostician* is the unlock — an analyst agent that reads its own product's telemetry and proposes prompt-level fixes is the right shape for compounding improvements over time. It's the JD bullet in literal form: AI builds the dashboard, AI iterates the prompts based on feedback, the loop closes inside the product.

**If I had another day, I'd add real users.** The synthetic seed is a fine demo, but the real signal is what the Diagnostician says when it has 50 real entries instead of 20 fake ones. The bet I haven't tested yet is that the Diagnostician's reports get *better* — more specific, more actionable — as the dataset grows. That's the compounding piece, and it's the thing I'd want to validate on day 1 inside Ramp.
