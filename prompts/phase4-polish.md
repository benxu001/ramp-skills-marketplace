# PHASE 4: Polish + Deploy

Read CLAUDE.md first. Final polish pass:

## 1. Add a Routing Visualization

When the orchestrator plans execution, show a brief "thinking" animation in the chat:
- Step 1: "Planning..." (0.3s)
- Step 2: "Executing: [Skill 1 Name]..." → "Executing: [Skill 2 Name]..." (for chains)
- Step 3: For chains only: "Synthesizing results..."
- Step 4: The ExecutionPlan component appears, followed by the response

This gives visual transparency into the agentic pipeline — key for the Ramp demo since it mirrors how Sensei routes and Dojo skills compose.

## 2. Add Example Scenarios

Add a "Try These" section above the chat input with 4 clickable example prompts — 2 single-skill and 2 chains:
- "Categorize: Uber $45, team dinner $320, Figma annual $180, AWS $12,400"
- "Is this vendor risky? NovaPay Solutions, incorporated 3 months ago in Delaware, no public financials"
- "Extract this invoice and check compliance: Invoice #7301 from DataSync Ltd. Cloud storage $4,200/month, API credits $1,800. Net 45 terms."
- "Categorize these expenses and flag anomalies: Marketing lunch $85, Marketing lunch $85, SaaS tool $49.99, Conference flight $8,000, Team snacks $500.00"

These should be subtle chips/pills that send the text to chat on click.

## 3. Error States

- If the API call fails, show a red error message in chat: "Something went wrong. Please try again."
- If the API key is missing, show a clear setup message on page load
- Add a retry button on failed messages

## 4. README.md

Create a README that covers:
- What this project is (1-2 sentences)
- How it maps to Ramp's Dojo + Sensei
- The 3-agent architecture (orchestrator → executor → synthesizer) with the ASCII flow diagram from CLAUDE.md
- Multi-skill chaining examples
- How to run locally
- Tech stack
- Screenshots section (placeholder — add after demo)

## 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables.

## 6. Pre-Deploy Checklist

- [ ] All 6 skills route correctly as single-skill queries
- [ ] 2-skill chains work (e.g., extract + compliance)
- [ ] 3-skill chains work (e.g., extract + categorize + compliance)
- [ ] Synthesizer produces coherent merged output for chains
- [ ] Synthesizer is skipped for single-skill queries (no wasted API call)
- [ ] Fallback works for unmatched queries
- [ ] ExecutionPlan component shows flow arrows for chains
- [ ] Markdown tables render in chat
- [ ] Mobile layout works (tabs)
- [ ] No API key exposed in client code
- [ ] Loading states show current execution step
- [ ] Example queries clickable (including chain examples)
- [ ] Error handling works
