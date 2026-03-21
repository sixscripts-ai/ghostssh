# ghostssh — Gemini Agent Instructions

@./superpowers/skills/using-superpowers/SKILL.md
@./superpowers/skills/using-superpowers/references/gemini-tools.md

---

## What this project is

**ghostssh** is an AI-powered job-hunting agent. It:

1. Reads a developer's GitHub profile and LinkedIn text
2. Fetches live AI/ML job listings from Greenhouse, Lever, and Remotive
3. Uses an LLM (default: **Minimax M2.5**) to score and rank jobs against the profile
4. Generates a recruiter pitch + cover letter for the top matches
5. Exposes everything via a single Fastify REST API endpoint

The long-term goal is full autonomous job hunting — ranking → drafting → auto-applying via Playwright, with Postgres persistence and a dashboard UI.

---

## Repo layout

```
ghostssh/
├── apps/api/               ← Fastify TypeScript API (the core agent)
│   ├── src/
│   │   ├── providers/      ← LLM providers: Minimax (primary), OpenAI, Anthropic, Gemini, OpenRouter
│   │   ├── services/       ← GitHub scraper, job fetchers, ranker, cover letter generator
│   │   ├── prompts/        ← System prompts for each LLM task
│   │   └── routes/         ← POST /jobs/search  GET /health
│   └── .env.example        ← Copy to .env and fill in MINIMAX_API_KEY
├── skills/                 ← 37 agent skills (see below)
├── superpowers/            ← Superpowers framework (TDD, planning, debugging workflows)
├── CLAUDE.md               ← Instructions for Claude Code
├── GEMINI.md               ← This file (instructions for Gemini CLI)
└── .github/workflows/      ← CI (type-check + test) and GitHub Pages
```

---

## Primary LLM provider: Minimax M2.5

All LLM calls default to **Minimax M2.5** (`MiniMax-M2.5`).
Fallback is **Anthropic Claude** if Minimax fails.
Provider can be overridden per-request via the `provider` field.

API endpoint: `https://api.minimaxi.chat/v1/text/chatcompletion_v2`

---

## How to run locally

```bash
cd apps/api
cp .env.example .env
# Add MINIMAX_API_KEY (and optionally ANTHROPIC_API_KEY as fallback)
npm install
npm run dev
# → ghostssh listening on :8080 [provider: minimax]
```

Test it:
```bash
curl -X POST http://localhost:8080/jobs/search \
  -H "Content-Type: application/json" \
  -d '{
    "githubUsername": "sixscripts",
    "linkedinText": "paste LinkedIn profile here",
    "manualTargetTitles": ["AI Engineer", "ML Engineer"],
    "manualLocations": ["Remote"],
    "provider": "minimax",
    "topK": 10
  }'
```

---

## Superpowers — what it is and how to use it

Superpowers is a skills framework that enforces disciplined development workflows.
It is already installed in `superpowers/` and `skills/`.

### How skills work in Gemini CLI

- At session start, Gemini loads skill metadata automatically via this GEMINI.md file
- When a skill applies, call `activate_skill` with the skill name to load its full content
- Then follow it

### Tool name mapping (Claude Code → Gemini CLI)

| Skill says       | You use                  |
|------------------|--------------------------|
| `Read`           | `read_file`              |
| `Write`          | `write_file`             |
| `Edit`           | `replace`                |
| `Bash`           | `run_shell_command`      |
| `Grep`           | `grep_search`            |
| `Glob`           | `glob`                   |
| `TodoWrite`      | `write_todos`            |
| `Skill`          | `activate_skill`         |
| `WebSearch`      | `google_web_search`      |
| `WebFetch`       | `web_fetch`              |
| `Task`/subagents | ⚠️ Not supported — fall back to `executing-plans` |

### Mandatory workflow (always follow this order)

1. **Before any new feature** → activate `brainstorming` skill
2. **After design approved** → activate `writing-plans` skill
3. **During implementation** → activate `test-driven-development` skill
4. **When fixing a bug** → activate `systematic-debugging` skill
5. **Before finishing a branch** → activate `finishing-a-development-branch` skill

Do not skip these. Do not write code before brainstorming. Do not fix bugs without systematic debugging.

### Available skills (in `skills/`)

**Core workflow (Superpowers)**
- `brainstorming` — design before code
- `writing-plans` — implementation planning
- `executing-plans` — step-by-step execution
- `test-driven-development` — RED→GREEN→REFACTOR
- `systematic-debugging` — 4-phase root cause process
- `verification-before-completion` — verify before declaring done
- `requesting-code-review` / `receiving-code-review`
- `finishing-a-development-branch` — merge/PR workflow
- `using-git-worktrees` — parallel branch development

**Domain skills**
- `ai-engineer` — LLM application patterns
- `backend-architect` — API and service design
- `database-architect` — schema and query design
- `rag-engineer` / `rag-implementation` — retrieval-augmented generation
- `vector-database-engineer` — embeddings and vector search
- `agent-memory-systems` / `memory-systems` — agent memory architecture
- `autonomous-agents` / `autonomous-agent-patterns` — agent loop design
- `computer-use-agents` — browser/desktop automation
- `computer-vision-expert` — CV and visual AI
- `ai-agents-architect` — multi-agent system design
- `ssh-mac-dev` — SSH tunnel + remote Mac development
- `pentest-commands` / `scanning-tools` / `sql-injection-testing` / `sqlmap-database-pentesting` — security

---

## Roadmap (what to build next)

In priority order:

1. **Playwright auto-apply worker** — automate job applications
2. **Postgres + pgvector** — persist jobs, dedup, semantic search
3. **LinkedIn export parser** — ingest LinkedIn data export ZIP
4. **Resume PDF parser** — extract skills from uploaded resume
5. **Recruiter email drafter** — cold outreach generation
6. **Next.js dashboard** — visualize ranked jobs and manage applications
7. **Cron scheduling** — run job scans every 6 hours automatically

When working on any of these, start with `brainstorming` skill, then `writing-plans`, then `test-driven-development`.

---

## Environment variables (apps/api/.env)

| Variable             | Purpose                          | Required |
|----------------------|----------------------------------|----------|
| `MINIMAX_API_KEY`    | Primary LLM provider             | ✅ Yes   |
| `MINIMAX_MODEL`      | Default: `MiniMax-M2.5`          | No       |
| `ANTHROPIC_API_KEY`  | Fallback LLM provider            | Recommended |
| `OPENAI_API_KEY`     | Optional fallback                | No       |
| `GEMINI_API_KEY`     | Optional fallback                | No       |
| `OPENROUTER_API_KEY` | Optional multi-model router      | No       |
| `GITHUB_TOKEN`       | GitHub API auth (avoids rate limits) | Recommended |
| `PORT`               | API port (default: 8080)         | No       |

---

## GitHub Actions secrets required

Add these at `github.com/sixscripts-ai/ghostssh/settings/secrets/actions`:

- `MINIMAX_API_KEY`
- `ANTHROPIC_API_KEY`
- `GH_PAT` (GitHub personal access token)

---

## Key rule

**Never start coding without first activating the `brainstorming` skill.**
User intent → design → plan → tests → code. Always in that order.
