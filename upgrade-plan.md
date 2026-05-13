# Upgrade Plan

## Status

- ✅ **§1 Skill format migration** — done (2026-05-13)
- ✅ **§2 Agent prompts → markdown + `AGENTS.md`** — done (2026-05-13)
- ✅ **§3 Sensei-style role recommendation** — done (2026-05-13)
- ✅ **§4 Feedback + measurement layer** — done (2026-05-13)
- ⬜ §5 Submission bundle (memo + diagram + Loom outline)

## Why

The current build is a strong technical demo (3-agent pipeline, NDJSON streaming, finance-themed skills, Dojo/Sensei naming) but under-indexes on the axes Ramp actually weighs heaviest for the *AI Product Operator* role: **enablement, distribution, and measurement**. This upgrade closes those gaps with four code changes and one submission bundle.

Mapping to gap analysis:


| udGap                                                                                                                       | Upgrade                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Skills are TS objects, not user-contributable markdown (mismatch with Ramp's 350+ git-backed Dojo skills)                   | §1 Skill format migration                            |
| Three agents live as inline TS strings — not legible to non-engineers reading the repo                                      | §2 Agent prompts → markdown                          |
| "Sensei" is reactive routing, not proactive surfacing (mismatch with JD: *"surfaces the right skills to the right people"*) | §3 Sensei-style role recommendations                 |
| No measurement / feedback (mismatch with JD: *"measure impact via (AI-built!) dashboards"*)                                 | §4 Feedback + measurement layer                      |
| Vercel link alone underdelivers vs. application ask of *"2–3 AI artifacts"*                                                 | §5 Submission bundle (memo + diagram + Loom outline) |


## Starting line (what's already there)

- Next.js 14 App Router + TS strict + Tailwind
- 6 finance skills in `src/lib/skills.ts` (TS objects)
- 3-agent pipeline in `src/lib/{orchestrator,executor,synthesizer}.ts` (inline system prompts)
- NDJSON streaming `POST /api/chat` with `plan` → `step_start`/`step_done` → `synth_start` → `final` events
- Marketplace + chat UI, mobile tabs, retry on error, example chips
- Verified end-to-end against the live API

---

## §1 — Skill format migration (TS objects → markdown) ✅ DONE

**Outcome:** All 6 skills are now markdown files under `skills/`. SystemPrompts loaded byte-for-byte unchanged. `npm run build` and `npm run lint` pass.

**What shipped:**

- `skills/<id>.md` × 6 — extended frontmatter (all 8 fields) + body = systemPrompt with `CHAINING_NOTE` inlined
- `src/lib/skills.ts` — rewritten as a server-only loader (`'server-only'` import) that reads `skills/*.md` via `gray-matter` at module init. Same `Skill[]` shape, same `getSkillById()` export → zero downstream changes in `route.ts` / `orchestrator.ts` / `executor.ts`.
- `src/lib/skill-metadata.ts` — **auto-generated** client-safe metadata snapshot (no `systemPrompt`). Imported by `SkillBadge`, `SkillMarketplace`, `SkillCard`.
- `scripts/build-skill-metadata.mjs` — codegen script. Reads `skills/*.md`, emits the metadata TS file.
- `package.json` — `gray-matter` + `server-only` added; `predev` / `prebuild` / `prelint` hooks regenerate the client metadata.
- `src/lib/types.ts` — added `SkillMeta = Omit<Skill, 'systemPrompt'>`.

**Resolution of the §1 open risk (client/server split):** Went with option (a) from the original plan — a generated TS snapshot for the client. The server loads markdown at runtime; the client imports a build-time artifact. Adding a 7th skill is still one markdown file with zero hand-edits (the script regenerates the snapshot via the npm pre-hooks).

### §1 original plan (kept for reference)

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

## §2 — Agent prompts → markdown + `AGENTS.md` ✅ DONE

**Outcome:** All 3 agents load behavior-identical prompts from markdown. `npm run build` and `npm run lint` pass.

**What shipped:**

- `agents/orchestrator.md`, `agents/synthesizer.md`, `agents/executor.md` — frontmatter + body.
- `src/lib/agents.ts` — synchronous loader at module init. Exports `ORCHESTRATOR_SYSTEM_PROMPT`, `SYNTHESIZER_SYSTEM_PROMPT`, `EXECUTOR_USER_TEMPLATE`.
- `AGENTS.md` at repo root — one-page pipeline doc.
- `next.config.mjs` — added `experimental.outputFileTracingIncludes` so `agents/**/*.md` ships with the `/api/chat` Vercel bundle. (Must stay nested under `experimental` until we upgrade to Next 15. §1 chose codegen instead, so this only covers `agents/`; folding agents into the codegen pattern is a possible v2 cleanup.)
- Project `CLAUDE.md` architecture section updated to point at the new layout.

**Deviations from the original plan:**

- **No `gray-matter` dependency for agents.** Agent frontmatter is flat key:value, so a 10-line `stripFrontmatter()` helper in `src/lib/agents.ts` covers it. (`gray-matter` is now in the project anyway via §1, so a future cleanup could switch to it for consistency.)
- **Executor markdown is mostly documentation.** The executor has no traditional system prompt — it dispatches to each skill's `systemPrompt`. So `agents/executor.md`'s body is prose, and the runtime user-message template (with `{{PRIOR_BLOCK}}` / `{{USER_MESSAGE}}` placeholders) lives in the *first fenced code block* of the body. The loader extracts that block via regex. This convention should be reused if other agents grow into the same shape.

### §2 original plan (kept for reference)

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

## §3 — Sensei-style proactive role recommendation ✅ DONE

**Outcome:** Role chip strip ships above the marketplace grid. Clicking a chip

reorders cards so the role's top-3 surface first, each tagged with a *Recommended*

*for {role}* badge. `npm run lint` and `npm run build` pass.

**What shipped:**

- `src/lib/roleRecommendations.ts` — `ROLE_RECOMMENDATIONS` array (5 roles: AP Specialist, Procurement, Controller, FP&amp;A, Founder / GM) + `getRoleById()` helper. Each role has an ordered `skillIds` list; first id is the most prominent.
- `src/components/RoleStrip.tsx` — controlled chip strip; clicking the active chip toggles it off, and an explicit *Clear* button appears once a role is selected.
- `src/components/SkillCard.tsx` — accepts optional `recommendedFor?: string`. When set, the card gets a violet ring + a *Recommended for {role}* pill above the icon row.
- `src/components/SkillMarketplace.tsx` — accepts `selectedRoleId` + `onRoleChange`. Reorders the skill list by the role's `skillIds` rank (others slot in behind via `Number.POSITIVE_INFINITY`), and forwards `recommendedFor` per card.
- `src/app/page.tsx` — owns `selectedRoleId` state, threads it to the marketplace.

**Deviations from the original plan:**

- The strip lives *inside* the marketplace component, not in `page.tsx`. Page only owns the role state; layout/order logic stays colocated with the cards. Keeps mobile (single skills tab) working without extra plumbing.
- No separate "highlightedSkillIds" prop — the marketplace derives ordering + badge state from `selectedRoleId` directly via `getRoleById()`. Saves one prop and the duplicate source-of-truth.

### §3 original plan (kept for reference)

**Decision recap:** Hardcoded role → top-3 skills mapping, surfaced as a strip above the marketplace.

**Files affected**

- New: `src/lib/roleRecommendations.ts` — the mapping
- New: `src/components/RoleStrip.tsx` — the chip strip
- Modified: `src/components/SkillMarketplace.tsx` — accepts a `highlightedSkillIds` prop, reorders/badges accordingly
- Modified: `src/app/page.tsx` — owns the selected role state

**Role list** (initial proposal — easy to tune)


| Role          | Top-3 skills                                                         |
| ------------- | -------------------------------------------------------------------- |
| AP Specialist | Invoice Extractor, Policy Compliance, Spend Anomaly Detector         |
| Procurement   | Vendor Risk Flagger, Policy Compliance, Invoice Extractor            |
| Controller    | Spend Anomaly Detector, Expense Categorizer, Policy Compliance       |
| FP&amp;A      | Meeting Cost Calculator, Spend Anomaly Detector, Expense Categorizer |
| Founder / GM  | Meeting Cost Calculator, Vendor Risk Flagger, Spend Anomaly Detector |


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

## §4 — Feedback + measurement layer ✅ DONE

**Outcome:** 👍/👎 buttons render under every real assistant message; ratings persist to `localStorage` and survive reload. A compact `SessionStats` pill sits in the footer and updates live as the session progresses. `npm run lint` and `npm run build` pass.

**What shipped:**

- `src/lib/feedback.ts` — SSR-safe localStorage layer keyed at `skill-router:feedback`. Exports `loadFeedback()`, `recordFeedback(map, entry)`, `removeFeedback(map, id)`, and a `FeedbackMap` type. All mutators are pure-functional (return a new map) so they compose cleanly with React's `setState`.
- `src/lib/types.ts` — added `FeedbackEntry { messageId, skillIds, rating, timestamp, prompt }`.
- `src/components/MessageBubble.tsx` — accepts optional `rating` + `onFeedback(id, rating)`. Renders thumbs in the timestamp row only when the message is a non-error assistant message *with* an `executionPlan` (so the hardcoded welcome bubble and error bubbles don't get thumbs). Active rating gets a colored ring; clicking the same thumb again toggles it off.
- `src/components/SessionStats.tsx` — derives the pill from `messages` + `feedback` map. Format: `N queries · M chains · X% avg confidence · Y fallbacks · 👍 a / 👎 b`. Hides confidence / fallbacks / thumbs segments when their value is zero or unknown. Returns `null` when there are no queries yet, so the footer stays clean on first paint.
- `src/components/ChatPanel.tsx` — threads `feedback` + `onFeedback` through to `MessageBubble` per message; resolves the rating via `feedback?.[m.id]?.rating ?? null`.
- `src/app/page.tsx` — holds `feedback` state, hydrates from `localStorage` in a mount-only `useEffect` (avoids SSR/hydration mismatch), and exposes `handleFeedback(id, rating)` that looks up the matching message + immediately-prior user prompt, then records or removes the entry. Footer now stacks `<SessionStats />` above the attribution line.

**Deviations from the original plan:**

- **No `clearFeedback()` utility for bulk reset.** Per-message toggle covers the demo flow; bulk reset would need its own UI affordance, which isn't worth the surface area for a portfolio piece. Users can clear via devtools / "Clear site data" if needed.
- **`prompt` is resolved at feedback-click time, not stored on the message.** The plan implicitly assumed we'd thread the user prompt onto the assistant `ChatMessage`. Instead `handleFeedback` walks backward through `messages` to find the most recent `role: 'user'` entry. Keeps `ChatMessage` unchanged and works correctly because user messages are always pushed before their assistant response.
- **Thumb visibility gate is `executionPlan` presence, not just `!isError`.** This cleanly excludes the welcome bubble (no plan) without needing to hardcode-check `id === 'welcome'`. Empty-plan fallbacks (orchestrator returns no steps) also won't get thumbs, which is the right behavior — there's nothing meaningful to rate there.
- **No `/stats` modal.** The "optional stretch" item from the original plan was skipped as flagged (gold-plating). The pill itself is sufficient evidence of the measurement layer.

### §4 original plan (kept for reference)

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


| Order | Task                        | Est. time | Status            | Why this order                                          |
| ----- | --------------------------- | --------- | ----------------- | ------------------------------------------------------- |
| 1     | §1 Skill format migration   | 2–3h      | ✅ done 2026-05-13 | Foundational; everything else builds on top             |
| 2     | §2 Agent prompts → markdown | 1–2h      | ✅ done 2026-05-13 | Mirrors §1 mechanically, easy follow-up                 |
| 3     | §3 Sensei role strip        | 1–2h      | ✅ done 2026-05-13 | UI-only, doesn't depend on §1 or §2 but flows naturally |
| 4     | §4 Feedback layer           | 1–2h      | ✅ done 2026-05-13 | UI-only, independent                                    |
| 5     | §5a Memo                    | 2h        | ⬜                 | Last — best written when the full product is real       |
| 6     | §5b Diagram                 | 1h        | ⬜                 | Last — captures final architecture                      |
| 7     | §5c Loom outline            | 30m       | ⬜                 | Last — scripts the final flow                           |


**Total: ~10–12 focused hours.** Compressible to one long day or two evening sessions.

**Sequencing note (post-§2):** §2 was implemented before §1, even though the plan recommended §1 first. The order swap was harmless because the two are independent (agents and skills are different files), but it means §1 now needs to mirror the loader pattern already established by §2 — see `src/lib/agents.ts` for the shape and pick `gray-matter` for the skill frontmatter parsing since skills have array-typed fields.

---

## Open questions (decide at implementation time)

1. ~~**Client/server skill split**~~ — **Resolved in §1.** Server reads markdown at runtime (`src/lib/skills.ts`, `'server-only'`); client imports a generated TS snapshot (`src/lib/skill-metadata.ts`) produced by `scripts/build-skill-metadata.mjs` via `predev` / `prebuild` / `prelint`.
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
- More skills (six is plenty — quality &gt; quantity)
- A real backend / DB (the project is intentionally code-defined; staying that way)
- A CLI subagent integration via `.claude/agents/` (rejected in scoping — adds confusion vs signal)

