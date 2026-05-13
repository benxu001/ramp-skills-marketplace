# Loom outline — Skill Router (90s)

**Goal:** A reviewer should leave with three things — (1) chaining works automatically, (2) skills + agents are markdown an operator can edit, (3) the Insights tab closes a feedback loop with a Claude analyst.

**Target length:** 90 seconds. Tight. If a beat runs over, the *Insights* beat is the one I'd protect — it's the JD bullet.

---

## Pre-flight (before you hit record)

1. **Browser windows open and laid out:**
   - Tab 1: `localhost:3000` — the app on the Chat view, fresh page load.
   - Tab 2: VS Code (or Cursor) with `skills/invoice-extractor.md` open.
   - Tab 3: `localhost:3000` again, but in a separate window already on the **Insights** tab with demo data loaded (so the dashboard is populated when you switch to it — no waiting on the seed).
2. **Clipboard primed** with the 3-skill chain query:
   > *Extract this invoice, categorize the line items, and flag anything non-compliant: Invoice #4421 from Globex Logistics for freight Apr 1–30, $4,200 net 30.*
3. **Mic check, no notifications, dock auto-hidden, terminal closed.**
4. **Run `npm run dev` once and click through one full chain query** so the API key is warm and the first real chain renders fast on tape.

---

## Beat 1 · 0:00–0:10 · Hook

- **Show:** The app on the Chat view, marketplace visible on the right.
- **Say:**
  > *"Ramp's Dojo is great for single skills. But what happens when a real workflow needs three of them — extract, categorize, check policy — in the right order? That's the gap this prototype closes."*
- **Note:** No mouse movement yet. Let the chrome breathe so the eye picks up the marketplace cards.

---

## Beat 2 · 0:10–0:30 · The 3-skill chain (the money shot)

- **Show:** Click into the chat input. Paste the 3-skill query from the clipboard. Hit enter.
- **Say** (over the streaming response):
  > *"I'm asking for three things in one prompt. The planner agent reads the registry, returns an execution plan — invoice extractor, then expense categorizer, then policy compliance — and the UI streams each step as it runs."*
- **Watch for:** The badge row with arrows above the response (`Invoice → Categorize → Compliance · 85%`). Pause briefly so the viewer sees the chain.
- **Say** (as it lands):
  > *"No user wiring. The synthesizer merges three outputs into one narrative. That's the bet — composition becomes the next bottleneck, not coverage."*

---

## Beat 3 · 0:30–0:45 · Markdown skills (the operator surface)

- **Show:** Switch to VS Code tab. `skills/invoice-extractor.md` is open. Scroll briefly through frontmatter + body.
- **Say:**
  > *"Every skill is a markdown file. Frontmatter is metadata; the body is the system prompt. Adding a seventh skill is one new file — no code change. Same pattern for the four agents under `agents/`. An operator can iterate on prompts without involving an engineer."*
- **Note:** Don't dwell on individual lines. The point is the *shape* of the file, not its contents.

---

## Beat 4 · 0:45–1:00 · Sensei surfacing (proactive routing)

- **Show:** Back to Tab 1 (the chat app). Click the **"AP Specialist"** role chip above the marketplace.
- **Say:**
  > *"Sensei isn't just reactive routing. Pick a role — AP, Procurement, FP&A — and the marketplace reorders. The top-three skills for that role surface first, with a Recommended badge. Same pattern Ramp could push to new users on day one."*
- **Note:** Click one more chip (Procurement) to show the reorder is dynamic, then clear the selection.

---

## Beat 5 · 1:00–1:20 · Insights — the AI-built feedback loop

- **Show:** Switch to Tab 3 (Insights tab, demo data pre-loaded). Routing Health score visible at top.
- **Say:**
  > *"This tab is the JD bullet — AI-built dashboards, QA checks, iterate on feedback. Per-skill thumbs-up rates, a confidence histogram aligned to the orchestrator's own rubric, deterministic QA flags that fire when a skill or chain drops below 50% approval."*
- **Scroll** to the QA flags section. Pause briefly so the viewer sees the warnings.
- **Click** *"Diagnose with Claude"*. Wait for the markdown report to render.
- **Say** (over the loading and reveal):
  > *"And here's the punchline — a fourth Claude agent reads its own product's telemetry and proposes prompt-level fixes, citing specific skill files to edit. Claude built the dashboard, and Claude is the analyst inside it. The feedback loop closes inside the product."*

---

## Beat 6 · 1:20–1:30 · Close

- **Show:** Briefly cut back to the architecture diagram in `docs/architecture.md` (or hold on the Diagnostician report).
- **Say:**
  > *"One prototype, ~3 days of build. The bigger bet — markdown as skill format, composition as the next bottleneck, the product as the enablement surface — is what I'd want to work on with you."*
- **Note:** End on the screen, not on the face. Let the diagram or the report be the last visual.

---

## Recording tips

- **Pace.** This is dense. Don't read fast — read *clearly*. If you sound rushed, the demo looks rushed.
- **Pauses.** Build in a half-second pause after every beat transition. The viewer needs a moment to register the shift.
- **Mistakes.** If you fumble in Beat 2 (the chain), restart the take. Beat 2 is the demo. The rest can have small stumbles.
- **One take.** Aim for one continuous take. Cut breaths in post if needed, but don't stitch together multiple recordings — it shows.
- **Title card.** Loom auto-generates one; rename it to *"Skill Router — 3-agent skill chaining + AI-built feedback loop (90s)"* before sharing.

---

## After recording

1. Watch it back once. If a beat is unclear, re-record. Don't ship something that needs explaining.
2. Paste the Loom URL into the submission email and into `MEMO.md` (the header `Live demo` line currently points at Vercel; add a `Demo recording` line).
3. Confirm captions/transcript look right — Loom auto-generates these; they're often the entry point for a skim-reader.
