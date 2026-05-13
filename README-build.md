# How to Build This Project

## Prerequisites
- Node.js 18+
- Anthropic API key (from console.anthropic.com)
- Claude Code installed (`npm install -g @anthropic-ai/claude-code`)

## Setup

```bash
cd skill-router
claude   # opens Claude Code in this directory — it will read CLAUDE.md automatically
```

## Build Order

Run each phase as a single prompt in Claude Code. Wait for each phase to complete and verify before moving on.

### Phase 1: Scaffolding
```
Read prompts/phase1-setup.md and execute everything in it.
```
**Verify:** `npm run dev` works, types compile, skills.ts has 6 skills defined.

### Phase 2: Backend
```
Read prompts/phase2-backend.md and execute everything in it.
```
**Verify:** Run the 3 curl commands. All should return valid JSON with correct routing.

### Phase 3: Frontend
```
Read prompts/phase3-frontend.md and execute everything in it.
```
**Verify:** Open localhost:3000. Chat works end-to-end. Skills marketplace shows 6 cards. Clicking examples sends them to chat.

### Phase 4: Polish + Deploy
```
Read prompts/phase4-polish.md and execute everything in it.
```
**Verify:** Deploy to Vercel. Full flow works on the live URL.

## Tips
- If Claude Code hits a wall on any phase, you can paste specific sections of the prompt instead of the whole file
- Keep the terminal output visible — if there are TypeScript errors, let Claude Code fix them before moving on
- The CLAUDE.md file gives Claude Code persistent context about the project — don't delete it
