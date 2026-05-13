# PHASE 1: Project Setup + Skill Definitions

Read CLAUDE.md first. Then do the following:

## 1. Scaffold the Next.js project

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
npm install @anthropic-ai/sdk
```

## 2. Create `src/lib/types.ts`

Define these types:

```ts
// A skill in the marketplace
interface Skill {
  id: string;
  name: string;
  description: string;        // Short description for the marketplace card
  icon: string;                // Emoji icon
  color: string;               // Tailwind color class for the accent
  category: string;            // e.g. "Expense Management", "Risk", "Operations"
  exampleInputs: string[];     // 2-3 example queries that would trigger this skill
  systemPrompt: string;        // The prompt template sent to Claude when this skill runs
  outputFormat: string;        // Description of expected output structure
  chainableAfter?: string[];   // Skill IDs whose output this skill can consume (helps orchestrator)
}

// A single step in an execution plan
interface ExecutionStep {
  skillId: string;
  reason: string;              // Why this skill is needed for this step
}

// Orchestrator response — the execution plan
interface ExecutionPlan {
  steps: ExecutionStep[];      // Ordered list of skills to run (1-3)
  confidence: number;          // 0-1
  reasoning: string;           // Why this plan was chosen
}

// Result of a single skill execution
interface SkillResult {
  skillId: string;
  skillName: string;
  output: string;              // The skill's response text
}

// Chat message
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  executionPlan?: {
    steps: { skillId: string; skillName: string }[];
    confidence: number;
  };
  timestamp: Date;
}
```

## 3. Create `src/lib/skills.ts`

Define 6 skills. Each skill needs a detailed `systemPrompt` that tells Claude how to handle the input and what format to return. Here are the 6 skills:

### Expense Categorizer
- Takes raw expense descriptions (e.g., "Uber to airport $45, team lunch at Sweetgreen $230")
- Returns structured categories with GL codes, amounts, and confidence
- Output: table with columns [Description, Category, GL Code, Amount, Confidence]

### Vendor Risk Flagger
- Takes a vendor name and optional context
- Returns risk assessment: risk level (low/medium/high), flags, and reasoning
- Checks for: new vendor, high-risk geography, unusual industry, missing info

### Invoice Data Extractor
- Takes raw invoice text (pasted)
- Extracts: vendor name, invoice number, date, line items, subtotal, tax, total, payment terms
- Returns clean structured data

### Policy Compliance Checker
- Takes an expense request (amount, category, purpose)
- Checks against a hardcoded company policy (define a reasonable one: meals <$100/person, software needs manager approval >$500, travel needs pre-approval >$2000, etc.)
- Returns: compliant/non-compliant, which policies triggered, suggested action

### Spend Anomaly Detector
- Takes a list of transactions (CSV-like text)
- Flags anomalies: duplicate charges, unusual amounts, weekend transactions, round-number patterns
- Returns flagged items with anomaly type and severity

### Meeting Cost Calculator
- Takes: number of attendees, duration, average salary level (junior/mid/senior/exec)
- Calculates estimated cost based on loaded hourly rates
- Returns: total cost, cost per minute, and a "was this meeting worth it?" assessment

Make each skill's systemPrompt detailed and specific. The prompt should instruct Claude to return its response in a clean, structured format (use markdown tables or clear sections — NOT raw JSON, since the output goes directly into the chat).

Each skill's systemPrompt should also include an instruction like: "If prior analysis from another skill is provided, use it as context for your work." This enables chaining.

Set `chainableAfter` for skills that naturally follow others:
- Policy Compliance Checker: `chainableAfter: ["invoice-extractor", "expense-categorizer"]`
- Spend Anomaly Detector: `chainableAfter: ["expense-categorizer"]`
- Expense Categorizer: `chainableAfter: ["invoice-extractor"]`
- Meeting Cost Calculator: `chainableAfter: ["vendor-risk-flagger"]`

## 4. Create `.env.local`

```
ANTHROPIC_API_KEY=your-key-here
```

Add `.env.local` to `.gitignore` if not already there.

## 5. Verify

Run `npm run dev` and confirm the app loads with no errors. The page can just show "Skill Router" as a heading for now.

Do NOT build the UI or API routes yet — that's Phase 2 and 3.
