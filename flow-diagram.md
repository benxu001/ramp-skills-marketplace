# Pipeline architecture

A user query flows through three agents — **orchestrator** (plans), **executor** (runs), **synthesizer** (merges) — over a markdown-defined skill registry. Responses stream to the UI as NDJSON. Each response writes telemetry + thumb-feedback to `localStorage`; a fourth analyst agent (the **Diagnostician**) reads that telemetry on demand and proposes prompt-level fixes that edit the skill files. That dotted arrow at the bottom of the diagram is the bet: the feedback loop closes inside the product.

```mermaid
flowchart TD
    U([User query])

    O[Orchestrator<br/>agents/orchestrator.md<br/><i>plans the chain</i>]
    E[Executor<br/>agents/executor.md<br/><i>runs skills in order</i>]
    S[Synthesizer<br/>agents/synthesizer.md<br/><i>merges multi-skill outputs</i>]
    R([Streamed response<br/>+ execution-plan badges])

    SK[(Skill registry<br/>skills/*.md<br/>6 markdown skills)]

    LS[(localStorage<br/>stats + 👍/👎)]
    I[Insights tab<br/>recharts + QA flags]
    D[Diagnostician<br/>agents/diagnostician.md<br/><i>proposes prompt-level fixes</i>]

    U --> O
    SK -.->|registry lookup| O
    O -->|ExecutionPlan<br/>steps + confidence| E
    E -->|N outputs| S
    E -.->|1 step<br/>synth skipped| R
    S --> R
    R -.->|stats + ratings| LS
    LS --> I
    I -->|Diagnose with Claude| D
    D -.->|edit suggestions| SK

    classDef agent fill:#a78bfa20,stroke:#a78bfa,stroke-width:2px,color:#1f2937
    classDef data fill:#34d39920,stroke:#34d399,stroke-width:1px,color:#1f2937
    classDef io fill:#fbbf2420,stroke:#fbbf24,stroke-width:1px,color:#1f2937

    class O,E,S,D agent
    class SK,LS data
    class U,R,I io
```

## How chaining works inside the executor

Each skill's output is prepended to the next skill's user message as a `## Prior Analysis` block. No shared state, no orchestration framework — just context injection. The chain `Invoice Extractor → Policy Compliance Checker` means the compliance checker receives the user's original query *and* the extractor's structured output, with one fenced block telling it what came before.

Max chain length is 3 to cap latency. The orchestrator returns `{ steps: [{skillId, reason}], confidence, reasoning }`; the synthesizer is **conditional** — single-skill plans skip it (the executor output is returned directly), multi-skill plans merge into one narrative.

## Mapping to Ramp internals

| Ramp internal           | This repo                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Dojo** (skill registry)        | `skills/*.md` — 6 markdown skills, gray-matter frontmatter + system-prompt body. Add a skill = one new file. |
| **Sensei** (reactive routing)    | `agents/orchestrator.md` + `src/lib/orchestrator.ts` — Claude-powered planner returning an `ExecutionPlan`. |
| **Sensei** (proactive surfacing) | `src/lib/roleRecommendations.ts` + `src/components/RoleStrip.tsx` — role chips reorder the marketplace by role-top-3. |
| **Glass / Claude Code**          | Every prompt in this repo is a markdown file an operator can edit (skills, all 4 agents). No prompt is buried in TS. |
| **AI-built dashboards**          | `src/components/InsightsPanel.tsx` (Claude wrote the dashboard) + `agents/diagnostician.md` (Claude is the analyst inside it). |

## The bet (what Dojo doesn't do today)

Single-skill routing leaves compound workflows on the table once the registry passes ~50 skills. This demo shows **automatic chaining**: a query like *"Extract this invoice, categorize the line items, and flag anything non-compliant"* returns a 3-step plan with no user wiring. The orchestrator reads each skill's `chainableAfter` hint from its frontmatter and composes. Composition becomes the next bottleneck, not coverage.
