---
name: ghostssh-internal-comms
description: >
  THIS IS THE MASTER REFERENCE. Read this before doing ANYTHING in the ghostssh
  codebase. This skill defines who owns what, the sprint system, commit rules,
  the handoff protocol between Claude and VS Code Copilot, and what never to
  touch. If you are confused about what to build next, read this first.
  Trigger on: any new task, any confusion about ownership, any conflict between
  agents, before any commit, before starting any sprint.
---

# ghostssh Internal Communications System

## The Single Source of Truth

This document governs ALL development on ghostssh.
Every agent (Claude, VS Code Copilot, Gemini) reads this before acting.
No agent overrides this. No agent makes architectural decisions without this.

---

## Who Does What

### Claude (this chat)
- Writes architecture plans and sprint prompts
- Reviews code output — approves or rejects before next sprint starts
- Debugs TypeScript errors pasted by the user
- Writes complex service files when Copilot gets stuck
- NEVER commits directly — outputs zips or inline code for human to apply

### VS Code Copilot
- Executes sprints written by Claude
- Runs `npm run typecheck` after every task
- Commits after every completed + passing task
- Reports blockers immediately — does not try to fix architecture problems alone
- NEVER starts Sprint N+1 without Claude approval of Sprint N

### Gemini (Antigravity)
- Frontend/dashboard work
- Appwrite console configuration
- Handles browser-based tasks (Vercel dashboard, GitHub settings)
- NEVER touches apps/api/ unless Claude has reviewed the plan first

### The User
- Carries information between agents (pastes output here, gives prompts to Copilot)
- Makes final decisions on product direction
- Fills in .env files — agents never see real API keys
- Uploads zips here when Claude needs to review Copilot's work

---

## Sprint System

### Current Sprint Status
Check `docs/superpowers/plans/` for the latest sprint plan.
The filename tells you where we are: `2026-03-21-sprint-1-infrastructure.md`

### Sprint Rules
1. One sprint at a time. No parallel sprints.
2. Each sprint has numbered tasks. Do them in order.
3. After each task: `npm run typecheck` must pass.
4. After each task: git commit with format `feat(scope): description`
5. After full sprint: report all commit hashes to user → user pastes here → Claude reviews
6. Claude signs off → next sprint begins

### Sprint Order
- Sprint 1: Infrastructure (event-bus, cost-guard, usage-tracker, schema) ← IN PROGRESS
- Sprint 2: Scout hardening (hiring signals, network overlap, batch ranking)
- Sprint 3: Memory upgrade (preference synthesis, feedback loop)
- Sprint 4: Outreach agent (contact discovery, email generation)
- Sprint 5: Applier agent (Playwright, Vision verification)
- Sprint 6: Monetization (Stripe, auth, landing page)

---

## Commit Message Format

```
feat(infra): agent event bus          ← new infrastructure
feat(scout): hiring signal scoring    ← Scout agent feature  
feat(memory): preference synthesis    ← Memory agent feature
feat(outreach): contact discovery     ← Outreach agent feature
feat(applier): playwright form fill   ← Applier agent feature
feat(dashboard): opinion cards        ← Dashboard feature
fix(api): batch ranking token bomb    ← Bug fix
chore(deps): add node-appwrite        ← Dependencies
test(infra): event bus unit tests     ← Tests
```

---

## File Ownership (who writes what)

### Claude writes
- All `apps/api/src/lib/*.ts` — core infrastructure
- All `apps/api/src/services/*.ts` — business logic
- All `apps/api/src/agent/*.ts` — agent orchestration
- All sprint plans in `docs/superpowers/plans/`
- `CLAUDE.md`, `GEMINI.md`, this file

### VS Code Copilot writes
- Wires things together — imports, route registrations, test files
- Runs setup scripts, schema migrations
- Small bugfixes on files Claude wrote

### Gemini writes
- All `apps/dashboard/src/**` — frontend
- `appwrite.json` — Appwrite deployment config
- Vercel project settings

### NO ONE touches without team agreement
- `apps/api/src/providers/` — provider abstractions
- `apps/api/src/config/env.ts` — env schema
- `.github/workflows/` — CI/CD
- `package.json` files — dependency changes need discussion

---

## What Never Gets Committed

```
# ABSOLUTE RULES — violation = immediate rotation of all keys
apps/api/.env           ← NEVER
apps/dashboard/.env.local ← NEVER  
Any file containing:    sk-ant, sk-api, m0-, ghp_, standard_ (64+ chars)
```

---

## The Handoff Protocol

```
Step 1 — Claude writes sprint prompt
Step 2 — User gives sprint prompt to VS Code Copilot
Step 3 — Copilot executes tasks 1-by-1, reports after each
Step 4 — User pastes Copilot's final output here
Step 5 — Claude reviews: ✅ clean → write next sprint | ❌ broken → write fix
Step 6 — Repeat
```

If something is broken and Copilot can't fix it in 2 attempts:
→ User uploads zip → Claude reads the actual files → Claude writes the fix

---

## Architecture Decisions (locked — do not change without Claude approval)

| Decision | Rationale |
|----------|-----------|
| Minimax M2.7 as primary LLM | Best agentic tool use performance |
| Anthropic as fallback | Best reasoning + vision |
| Mem0 for semantic memory | Cloud-hosted, multi-user safe |
| Appwrite for structured data | Replaces Supabase, all-in-one |
| Jina for scraping | Free, no API key, resilient |
| Vercel for API | Serverless, auto-scales |
| Promise.allSettled() for agent calls | Isolation — one failure can't cascade |
| Zod for all input validation | TypeScript-first, catches bugs at compile time |

---

## Current Known Issues (update this list)

- [ ] API needs its own Vercel project (dashboard deployed, API is not)
- [ ] Appwrite schema not set up (run setup-appwrite-schema.ts)
- [ ] Sprint 1 in progress — tasks 1-5 being executed by Copilot
- [ ] Mem0 key needs rotation (was exposed in chat)
- [ ] Appwrite key needs rotation (was exposed in chat)

---

## Quick Reference — Key Files

```
apps/api/src/
  agent/orchestrator.ts     ← The brain — 7-tool agentic loop
  agent/memory.service.ts   ← Mem0 + Appwrite hybrid memory
  services/opinion.service.ts ← "Apply today" picks
  services/ranking.service.ts ← Batch job scoring
  services/jina-scraper.service.ts ← Resilient URL scraper
  lib/event-bus.ts          ← [SPRINT 1] Agent action logger
  lib/cost-guard.ts         ← [SPRINT 1] Token ceilings
  lib/usage-tracker.ts      ← [SPRINT 1] Rate limiting

apps/dashboard/src/
  app/page.tsx              ← Main search UI
  app/board/page.tsx        ← Kanban board

functions/cron-scanner/     ← 6-hour autonomous trigger
docs/superpowers/plans/     ← Sprint plans (source of truth)
GHOSTSSH_MASTER_PLAN.md     ← Full monetization + infra plan
VSCODE_BLUEPRINT.md         ← VS Code Copilot briefing doc
```
