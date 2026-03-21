# ghostssh — Claude Code Instructions

This project uses the **Superpowers** agentic skills framework.

## Skills location
- `superpowers/skills/` — Superpowers core skills (TDD, planning, debugging, etc.)
- `skills/` — Domain skills (AI engineering, RAG, backend, security, etc.)

## Mandatory workflow
Before writing any code, check superpowers/skills/ for relevant skills and follow them.
Key skills to always use:
- `brainstorming` — before any feature work
- `writing-plans` — before implementation
- `test-driven-development` — during all implementation
- `systematic-debugging` — when fixing bugs

## Provider
Default provider is **Minimax M2.7**. Set MINIMAX_API_KEY in apps/api/.env.

## Dev
```bash
cd apps/api && npm install && npm run dev
```
