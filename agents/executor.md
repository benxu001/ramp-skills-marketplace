---
name: Executor
role: dispatcher
model: per-skill (each step uses its own skill's systemPrompt)
maxTokens: 2000
description: Runs each step of the ExecutionPlan in order, feeding prior skill outputs forward as "Prior Analysis" context.
inputs: ExecutionPlan + original user message + skill registry
outputs: Ordered list of `SkillResult` (`{ skillId, skillName, output }`)
promptType: user-template
templatePlaceholders: ["{{PRIOR_BLOCK}}", "{{USER_MESSAGE}}"]
---

The Executor does not have a system prompt of its own — at each step it invokes the matching skill's `systemPrompt`. Its job is to construct the *user message* for that call so that, on chained steps, prior skill output is presented as authoritative context.

The template below is used **only when at least one prior step has run**. For the first step in a chain (or for any single-skill plan), the user message is the original query verbatim — no wrapper.

`{{PRIOR_BLOCK}}` is built by the Executor in code: each prior result joined as `[<SkillName>] produced:\n<output>`, separated by blank lines.
`{{USER_MESSAGE}}` is the original user query.

## User-message template (chained step)

The first fenced block below is loaded by `src/lib/executor.ts` at module init. Edit it to change how prior context is presented to downstream skills.

```text
--- Prior Analysis ---
{{PRIOR_BLOCK}}
---

Now, given the above context and the user's original request below, perform your analysis.

User request: {{USER_MESSAGE}}
```
