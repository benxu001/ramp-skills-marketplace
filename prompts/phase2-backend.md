# PHASE 2: Backend — 3-Agent Pipeline (Orchestrator → Executor → Synthesizer)

Read CLAUDE.md first. Then build the backend:

## 1. Create `src/lib/orchestrator.ts` (Agent 1: The Planner)

This agent reads the user's query and the skill registry, then outputs an execution plan.

**How it works:**
- Takes the user's message + the full skill registry
- Makes a Claude API call with a system prompt:

```
You are an execution planner for a finance AI skills marketplace.

Given a user query and a registry of available skills, create an execution plan.

RULES:
- If the query maps to a single skill, return a plan with 1 step.
- If the query requires multiple skills in sequence, return a plan with 2-3 steps in the correct order.
- Each step has a skillId and a reason explaining why that skill is needed.
- If no skills match, return an empty steps array.
- Maximum 3 steps per plan.
- Only chain skills when the query genuinely requires multiple analyses. Don't chain just because you can.

CHAINING LOGIC:
- Skill outputs flow forward: step 1's output becomes context for step 2, etc.
- Common chains:
  - "extract and check compliance" → invoice-extractor → policy-compliance
  - "categorize and find anomalies" → expense-categorizer → anomaly-detector
  - "extract, categorize, and check compliance" → invoice-extractor → expense-categorizer → policy-compliance

Return ONLY valid JSON:
{
  "steps": [{ "skillId": "...", "reason": "..." }],
  "confidence": 0.0-1.0,
  "reasoning": "One sentence explaining the plan"
}
```

- The user message includes the query AND a summary of each skill (id, name, description, chainableAfter, exampleInputs)
- Parse the JSON response and return a typed `ExecutionPlan`

**Important:**
- Use `@anthropic-ai/sdk`, model: `claude-sonnet-4-20250514`
- `max_tokens: 500`
- If confidence < 0.3 or steps is empty, return `steps: []`
- Handle errors gracefully — return empty plan on failure

## 2. Create `src/lib/executor.ts` (Agent 2: The Runner)

This agent runs each skill in the plan sequentially, passing outputs forward.

**How it works:**

```ts
async function executeSkills(
  plan: ExecutionPlan,
  userMessage: string,
  skills: Skill[]
): Promise<SkillResult[]>
```

- Iterates through `plan.steps` in order
- For step 1: runs the skill with just the user's message
- For steps 2+: runs the skill with the user's message AND all prior skill outputs as context
- The context injection format for chained calls:

```
--- Prior Analysis ---
[Expense Categorizer] produced:
<prior output here>
---

Now, given the above context and the user's original request below, perform your analysis.

User request: <original user message>
```

- Collects and returns an array of `SkillResult` objects

**Important:**
- Model: `claude-sonnet-4-20250514`
- `max_tokens: 2000` per skill call
- If the plan has no steps (no match), return an empty array — the API route handles the fallback

## 3. Create `src/lib/synthesizer.ts` (Agent 3: The Combiner)

This agent only runs when 2+ skills were executed. It combines multiple outputs into one coherent response.

**How it works:**

```ts
async function synthesizeResults(
  userMessage: string,
  results: SkillResult[]
): Promise<string>
```

- If `results.length === 1`, **skip the Claude call entirely** — just return `results[0].output`
- If `results.length > 1`, make a Claude call with system prompt:

```
You are a synthesis agent. You've received outputs from multiple finance analysis skills that were run in sequence on a user's request. Combine them into one clear, unified response.

RULES:
- Preserve all data, tables, and specific findings from each skill
- Don't just concatenate — create a coherent narrative that flows naturally
- Use clear section headers to separate each skill's contribution
- End with a brief "Summary" section that ties the findings together
- Use markdown formatting (tables, bold, headers) for readability
```

- User message includes the original query + all skill outputs labeled by skill name

**Important:**
- Model: `claude-sonnet-4-20250514`
- `max_tokens: 3000` (synthesized output can be long)

## 4. Create `src/app/api/chat/route.ts`

POST endpoint that orchestrates the full pipeline:

```ts
// POST /api/chat
// Body: { message: string }
// Response: {
//   reply: string,
//   executionPlan: { steps: [{ skillId, skillName }], confidence } | null
// }
```

Flow:
1. Parse request body → get `message`
2. Call `orchestrator(message)` → get `ExecutionPlan`
3. If plan has steps:
   a. Call `executeSkills(plan, message)` → get `SkillResult[]`
   b. Call `synthesizeResults(message, results)` → get final response
   c. Return response + plan metadata
4. If plan has no steps (no match):
   Generate a fallback: "I don't have a specific skill for that. Here are the skills I can help with: [list]. Try asking something like: [examples]"
5. Return JSON

**Important:**
- Use `NextResponse` for responses
- Return 400 for missing/empty message
- Return 500 for unexpected errors (don't leak API internals)

## 5. Test

After building, test all three patterns:

```bash
# SINGLE SKILL — should plan 1 step
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Categorize these expenses: Uber $45, lunch at Nobu $180, AWS bill $2400"}'
# Expected: executionPlan.steps = [expense-categorizer]

# TWO-SKILL CHAIN — should plan 2 steps
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Extract this invoice and check if it complies with our policy: Invoice #4821 from CloudHost Inc, dated May 1 2026. Web hosting services $3,200/month. Net 30 terms."}'
# Expected: executionPlan.steps = [invoice-extractor, policy-compliance]

# THREE-SKILL CHAIN — should plan 3 steps
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Extract the data from this invoice, categorize each line item, and flag anything non-compliant: Invoice from TechVend Corp #9912. Items: Figma Enterprise $4800, Team offsite catering $6200, CEO laptop $3900. Due in 15 days."}'
# Expected: executionPlan.steps = [invoice-extractor, expense-categorizer, policy-compliance]

# NO MATCH — should return fallback
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the weather today?"}'
# Expected: executionPlan = null, reply lists available skills
```

Verify all 4 cases work. For the chain tests, confirm the synthesized output references data from both/all skills. Then move to Phase 3.
