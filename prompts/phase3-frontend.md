# PHASE 3: Frontend — Chat UI + Skills Marketplace

Read CLAUDE.md first. Then build the frontend:

## Layout

Two-panel layout on desktop, tabbed on mobile:
- **Left panel (60%)**: Chat interface
- **Right panel (40%)**: Skills marketplace grid

Use a dark theme. Color palette:
- Background: `#0a0a0b` (near-black)
- Surface/cards: `#141417`
- Border: `#1e1e24`
- Text primary: `#e4e4e7`
- Text secondary: `#71717a`
- Accent: each skill gets its own color (emerald, amber, sky, rose, violet, orange)

Font: Use `"JetBrains Mono"` for the header/logo and a clean sans-serif (Geist or system) for body text. Import from Google Fonts.

## Components

### `ChatPanel.tsx`
- Chat message list with auto-scroll to bottom
- Input bar at bottom with send button
- Loading state: show a pulsing dot animation while waiting for response
- When a response comes back with a skill match, show an `ExecutionPlan` component above the response showing which skills ran (and in what order for chains)
- Pre-populate with a welcome message: "Welcome to Skill Router. I can help with expense categorization, vendor risk assessment, invoice extraction, policy compliance, spend anomaly detection, and meeting cost calculation. Try typing a request!"

### `MessageBubble.tsx`
- User messages: right-aligned, subtle background
- Assistant messages: left-aligned, render markdown content (use `react-markdown` with `remark-gfm` for tables)
- Show timestamp below each message

### `SkillBadge.tsx`
- Small pill that shows: skill icon + skill name
- Colored border matching the skill's accent color
- Used inside ExecutionPlan to show each step

### `ExecutionPlan.tsx`
- Visual display of the orchestrator's plan, shown above the assistant response
- For single-skill queries: shows one SkillBadge + confidence percentage
  - Example: `🏷️ Expense Categorizer · 94%`
- For multi-skill chains: shows a horizontal flow with arrows between badges
  - Example: `📄 Invoice Extractor → 🏷️ Expense Categorizer → ✅ Policy Compliance · 91%`
- Use a subtle connecting line or arrow (→) between badges
- Slightly muted/secondary styling — it's metadata, not the main content

### `SkillCard.tsx`
- Card showing: icon, name, category, description, 2-3 example queries
- Clicking an example query sends it to the chat input
- Subtle hover effect

### `SkillMarketplace.tsx`
- Header: "Skills Marketplace" with a count badge (e.g., "6 skills")
- 2-column grid of SkillCards
- Optional: category filter tabs at top

### `page.tsx`
- Manages all state: messages array, loading state, active tab (for mobile)
- Handles sending messages to `/api/chat` and appending responses
- Response shape from API is `{ reply, executionPlan: { steps: [{skillId, skillName}], confidence } | null }`
- Store the executionPlan on the ChatMessage so ExecutionPlan component can render it
- Passes skill data to the marketplace

## Install Dependencies

```bash
npm install react-markdown remark-gfm
```

## Important Details

- Make the chat input auto-focus on page load
- Disable the send button while loading
- Handle Enter key to send (Shift+Enter for newline)
- The marketplace should show all 6 skills from `src/lib/skills.ts` (import them directly)
- Mobile breakpoint at 768px: switch to tabs ("Chat" | "Skills")
- Add a small "Built for Ramp · AI Product Operator Application" footer text
- No authentication, no persistence — everything is in React state

## Don't Forget

- Install `react-markdown` and `remark-gfm` before building
- Test that clicking example queries in skill cards sends them to chat
- Test the full flow: type a query → see loading → see skill badge → see formatted response
- Make sure markdown tables render properly in chat responses
