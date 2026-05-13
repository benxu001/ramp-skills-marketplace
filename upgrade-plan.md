# Upgrade Plan

## Why

The current build is a strong technical demo (3-agent pipeline, NDJSON streaming, finance-themed skills, Dojo/Sensei naming) but under-indexes on the axes Ramp actually weighs heaviest for the *AI Product Operator* role: **enablement, distribution, and measurement**. This upgrade closes those gaps with four code changes and one submission bundle.

Mapping to gap analysis:

| Gap | Upgrade |
|---|---|
| Skills are TS objects, not user-contributable markdown (mismatch with Ramp's 350+ git-backed Dojo skills) | §1 Skill format migration |
| Three agents live as inline TS strings — not legible to non-engineers reading the repo | §2 Agent prompts → markdown |
| "Sensei" is reactive routing, not proactive surfacing (mismatch with JD: *"surfaces the right skills to the right people"*) | §3 Sensei-style role recommendations |
| No measurement / feedback (mismatch with JD: *"measure impact via (AI-built!) dashboards"*) | §4 Feedback + measurement layer |
| Vercel link alone underdelivers vs. application ask of *"2–3 AI artifacts"* | §5 Submission bundle (memo + diagram + Loom outline) |

## Starting line (what's already there)

- Next.js 14 App Router + TS strict + Tailwind
- 6 finance skills in `src/lib/skills.ts` (TS objects)
- 3-agent pipeline in `src/lib/{orchestrator,executor,synthesizer}.ts` (inline system prompts)
- NDJSON streaming `POST /api/chat` with `plan` → `step_start`/`step_done` → `synth_start` → `final` events
- Marketplace + chat UI, mobile tabs, retry on error, example chips
- Verified end-to-end against the live API

---

## §1 — Skill format migration (TS objects → markdown)

**Decision recap:** Extended frontmatter — keep all 8 existing fields, body = system prompt.

**Files affected**
- New: `skills/<id>.md` × 6
- Modified: `src/lib/skills.ts` (export becomes a `loadSkills()` reading from disk)
- Modified: `src/lib/types.ts` (no type change, but `Skill.systemPrompt` now sourced from md body)
- New dep: `gray-matter` (~5KB, the de facto YAML-frontmatter parser)

**Skill file format** (`skills/invoice-extractor.md`):

```markdown
---
# Claude Code skill spec fields
name: Invoice Data Extractor
description: Pull structured fields (vendor, number, date, line items, totals, terms) out of pasted invoice text.

# Project-specific extensions
id: invoice-extractor
icon: "📄"
color: amber
category: Documents
chainableAfter: []
exampleInputs:
  - "Extract this invoice: Invoice #7301 from DataSync Ltd..."
  - "..."
outputFormat: "Structured markdown with sections: Vendor, Invoice #, Date, Line Items (table), Subtotal, Tax, Total, Payment Terms."
---

You are an Invoice Data Extractor. Given raw invoice text, extract structured fields...

## CHAINING NOTE

If you see a "Prior Analysis" section in the user message, this means another skill ran first...
```

**Steps**
1. Add `gray-matter` to dependencies.
2. Create `skills/` directory at project root.
3. Migrate each of the 6 skills from `src/lib/skills.ts` into its own markdown file. The current `systemPrompt` (including `CHAINING_NOTE`) becomes the body.
4. Rewrite `src/lib/skills.ts` to a loader: reads `skills/*.md` at module init using `fs.readdirSync` + `matter()`, returns the same `Skill[]` shape so no downstream code changes.
5. Verify all 6 still route correctly (run the same 4 curl tests from Phase 2).

**Acceptance**
- All 6 skills load with byte-identical system prompts to the current TS version
- `npm run build` succeeds (Next.js server-side filesystem reads work in API routes)
- UI is visually unchanged (colors, icons, example chips all render)
- Adding a 7th skill takes one new markdown file, zero code changes

**Risks**
- Next.js bundling: `fs.readdirSync` only works server-side. Ensure `skills.ts` is only imported from server code (`/api/chat/route.ts`, lib modules) — never from a client component. Currently it is — `SkillCard`/`SkillMarketplace` import `skills` directly. We may need to either: (a) split into `skills.server.ts` + `skills.client.ts` (with client getting a JSON snapshot at build time), or (b) keep a small client-safe export of just metadata. **Decide at implementation time.**

---

## §2 — Agent prompts → markdown + `AGENTS.md`

**Decision recap:** Webapp agents only. No `.claude/agents/` CLI subagents.

**Files affected**
- New: `agents/orchestrator.md`, `agents/executor.md`, `agents/synthesizer.md`
- New: `AGENTS.md` at project root
- Modified: `src/lib/orchestrator.ts`, `src/lib/executor.ts`, `src/lib/synthesizer.ts` — system prompts move from inline strings to file reads

**Agent file format** (`agents/orchestrator.md`):

```markdown
---
name: Orchestrator
role: planner
model: claude-sonnet-4-5
maxTokens: 500
description: Routes a user query to one or more skills. Returns an ExecutionPlan as JSON.
inputs: User query + skill registry
outputs: JSON { steps: [{ skillId, reason }], confidence, reasoning }
---

You are the Orchestrator. Given a user query and a list of available skills, decide which skill(s) to invoke...
```

**Steps**
1. Create `agents/` directory.
2. Extract each agent's current system prompt into the matching markdown file. Frontmatter captures the metadata we already have in the TS files (model, max_tokens).
3. Update each `*.ts` agent file to load its prompt from disk at module init (same pattern as skills).
4. Write `AGENTS.md` at root — a one-page doc explaining the 3-agent system: how the pipeline works, which agent does what, where to edit prompts. Audience is a Ramp reviewer skimming the repo.

**Acceptance**
- All 3 agents load behavior-identical prompts from markdown
- Editing `agents/orchestrator.md` and refreshing the dev server changes orchestrator behavior, no code edit needed
- `AGENTS.md` reads cleanly standalone — someone who's never seen the repo can understand the pipeline from that file

**Risks**
- Same Next.js filesystem caveat as §1. Apply the same fix.

---

## §3 — Sensei-style proactive role recommendation

**Decision recap:** Hardcoded role → top-3 skills mapping, surfaced as a strip above the marketplace.

**Files affected**
- New: `src/lib/roleRecommendations.ts` — the mapping
- New: `src/components/RoleStrip.tsx` — the chip strip
- Modified: `src/components/SkillMarketplace.tsx` — accepts a `highlightedSkillIds` prop, reorders/badges accordingly
- Modified: `src/app/page.tsx` — owns the selected role state

**Role list** (initial proposal — easy to tune)

| Role | Top-3 skills |
|---|---|
| AP Specialist | Invoice Extractor, Policy Compliance, Spend Anomaly Detector |
| Procurement | Vendor Risk Flagger, Policy Compliance, Invoice Extractor |
| Controller | Spend Anomaly Detector, Expense Categorizer, Policy Compliance |
| FP&A | Meeting Cost Calculator, Spend Anomaly Detector, Expense Categorizer |
| Founder / GM | Meeting Cost Calculator, Vendor Risk Flagger, Spend Anomaly Detector |

**UX**
- Strip above marketplace: *"For your role:"* + 5 chips
- Click a chip → marketplace cards reorder so the top-3 for that role are first, with a small *Recommended* badge
- "Clear" option to return to default order
- Default: no role selected, default ordering

**Steps**
1. Define `RoleRecommendations` map in `src/lib/roleRecommendations.ts`.
2. Build `RoleStrip` component (5 chips + clear button).
3. Add `selectedRole` state to `page.tsx`, pass into `SkillMarketplace`.
4. Update `SkillMarketplace` to accept `recommendedSkillIds: string[]` and reorder + badge.
5. Verify visually that clicking each role visibly changes the marketplace.

**Acceptance**
- 5 role chips render above marketplace on desktop
- Clicking a chip immediately reorders the cards + adds a *Recommended for {role}* badge to the top-3
- Mobile: strip remains visible on the *Skills* tab
- Clearing the role returns to default order

**Risks**
- Visual clutter: marketplace already has 6 cards + a header. Adding a chip strip might make it too dense. Mitigation: keep chip styling minimal, use the existing example-chip pattern.

---

## §4 — Feedback + measurement layer

**Decision recap:** 👍/👎 per assistant message + session stats pill.

**Files affected**
- Modified: `src/components/MessageBubble.tsx` — add thumb buttons under assistant messages
- New: `src/lib/feedback.ts` — localStorage helpers (get/set/clear)
- New: `src/components/SessionStats.tsx` — a small pill component
- Modified: `src/app/page.tsx` — tracks running stats (query count, chain count, fallback count, confidence avg), renders `SessionStats`

**LocalStorage shape**

```ts
type FeedbackEntry = {
  messageId: string;
  skillIds: string[];          // which skills produced the message
  rating: 'up' | 'down';
  timestamp: number;
  prompt: string;              // for context when reviewing
};

// key: 'skill-router:feedback'
```

**Stats pill**

Render in the footer (or as a header element on desktop). Compact format:

```
12 queries · 4 chains · 91% avg confidence · 2 fallbacks · 👍 6 / 👎 1
```

**Steps**
1. Add `feedback.ts` localStorage utils with versioned key.
2. Add thumb buttons to `MessageBubble` (only on assistant messages, only when not in error state). Click toggles selection (one rating per message); persists to localStorage.
3. Add `SessionStats` component reading from `messages` + localStorage. Renders the compact pill.
4. Wire stats into page footer.
5. Optional stretch: a `/stats` modal that breaks down ratings per skill — but this is gold-plating, skip if time-constrained.

**Acceptance**
- 👍/👎 visible under each assistant message
- Clicking a thumb persists across reload (localStorage)
- Stats pill updates live as user interacts
- Stats survive page reload but reset on localStorage clear

**Risks**
- localStorage SSR: must guard `typeof window` checks. Standard Next.js pattern.

---

## §5 — Submission bundle (memo + diagram + Loom outline)

**Decision recap:** All three artifacts.

### 5a. `MEMO.md` — the written outline

~1.5–2 pages. Audience: hiring manager skimming during review. Sections:

1. **TL;DR** (3 bullets — what I built, why, what it shows about me)
2. **Problem framing** — "Once Dojo crosses N skills, single-skill routing leaves compound workflows on the table. Users don't intuit which 2–3 to invoke in sequence." Establish chaining as the next bottleneck, not a vanity feature.
3. **What I built** — quick walkthrough of the 3 agents, the markdown skill registry, the Sensei strip. Link to live demo + repo.
4. **Tangible impact (honest framing)** — this is a prototype, not a deployed product, so I can't show real-user metrics. Instead: (a) what *would* be measured if shipped at Ramp, (b) directional results from internal testing (e.g., chain accuracy across the 4 canonical test queries — 100% currently).
5. **What this shows about how I work** — 1 paragraph each on: shipping discipline, framing problems in product-operator language, technical fluency without being a backend-only engineer.
6. **v2 roadmap** — memory, scheduled automations, Slack assistant, user-contributed skill submission. One sentence each.
7. **Lessons** — mirror the tweet's "What We Learned" rhetorical move. Honest.

### 5b. Flow diagram

`docs/pipeline.png` (or SVG). Shows:
- User query at top
- Three-agent pipeline (orchestrator → executor → synthesizer) with the chaining-via-prior-analysis arrow
- Skill registry on the side (the 6 skills as boxes)
- Output at bottom
- Inset table: Dojo/Sensei → file mapping

Tool: probably draw.io or Excalidraw. Or hand-draw and photograph for a more human vibe. **Decide at execution time.**

### 5c. Loom outline (`LOOM-OUTLINE.md`)

Not the recording itself — a 60–90s script you record after the build is done. Sections:

1. **0:00–0:10** — Hook: "Ramp's Dojo is great for single skills. But what happens when a workflow needs three?"
2. **0:10–0:30** — Live demo: Type a 3-skill chain query, point at the routing badges as they appear.
3. **0:30–0:50** — Show the markdown skill registry. Open one file, point at frontmatter + system prompt.
4. **0:50–1:10** — Click a role chip, show Sensei surfacing the relevant skills.
5. **1:10–1:30** — Close: "This is one prototype. The bigger bet — markdown-as-skill-format, composability as the next bottleneck, the product as the enablement — is what I'd want to work on with you."

**Steps**
1. Draft `MEMO.md` (longest single task — budget 2 hours)
2. Build flow diagram (1 hour)
3. Write Loom script (~30 minutes)
4. **You record the Loom separately** after the build's done

---

## Sequencing

| Order | Task | Est. time | Why this order |
|---|---|---|---|
| 1 | §1 Skill format migration | 2–3h | Foundational; everything else builds on top |
| 2 | §2 Agent prompts → markdown | 1–2h | Mirrors §1 mechanically, easy follow-up |
| 3 | §3 Sensei role strip | 1–2h | UI-only, doesn't depend on §1 or §2 but flows naturally |
| 4 | §4 Feedback layer | 1–2h | UI-only, independent |
| 5 | §5a Memo | 2h | Last — best written when the full product is real |
| 6 | §5b Diagram | 1h | Last — captures final architecture |
| 7 | §5c Loom outline | 30m | Last — scripts the final flow |

**Total: ~10–12 focused hours.** Compressible to one long day or two evening sessions.

---

## Open questions (decide at implementation time)

1. **Client/server skill split** — if `skills.ts` import from a client component breaks under filesystem reads, do we (a) split into `.server.ts` + `.client.ts` or (b) bake a JSON snapshot at build time? Decide when we hit the error.
2. **Role list** — the 5 roles in §3 are a first pass. Worth a sanity check that they map to roles a Ramp reviewer would recognize as plausible. May tune to: `Founder`, `Controller`, `AP`, `Procurement`, `FP&A`. (Drop `Founder / GM` if it feels off.)
3. **Stats pill placement** — header or footer? Footer is cleaner but less prominent. **Default: footer, with a possible hover-expand.**
4. **Diagram tool** — Excalidraw (hand-drawn vibe) vs. Mermaid (code-versioned) vs. Figma. Probably Excalidraw exported to PNG. Confirm at execution time.
5. **Whether to demote the existing CLAUDE.md `claude-sonnet-4-5` note** to a less prominent spot once the migration's done. Currently lives under *Important Notes*. Leave it for now.

---

## What this upgrade is NOT

- Memory system (too much scope, derivative)
- Scheduled automations / cron skills (infra-heavy)
- Slack assistant (infra-heavy)
- Auth, multi-user (distraction)
- More skills (six is plenty — quality > quantity)
- A real backend / DB (the project is intentionally code-defined; staying that way)
- A CLI subagent integration via `.claude/agents/` (rejected in scoping — adds confusion vs signal)
