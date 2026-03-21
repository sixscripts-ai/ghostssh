# ghostssh — VS Code Copilot Agent Blueprint

## What this project is

ghostssh is an **autonomous AI job-hunting agent**. It is not a search tool.
It is a background employee that runs every 6 hours, discovers job opportunities,
learns from every interaction, and surfaces only what matters — with opinions,
not lists.

The core idea: a developer gives it their GitHub username. The agent does the rest.
It finds jobs, ranks them against the developer's actual skills, remembers what it
already tried, drafts cover letters, and eventually applies automatically.

---

## The tech stack

```
apps/
├── api/          → Fastify + TypeScript (the brain — runs on Vercel)
└── dashboard/    → Next.js 16 (the face — deployed on Appwrite Sites + Vercel)

functions/
└── cron-scanner/ → Appwrite Function (the heartbeat — runs every 6 hours)
```

**LLM providers (all wired, Minimax M2.7 is primary):**
- Minimax M2.7 — primary (best agentic + tool use performance)
- Anthropic Claude Sonnet 4.5 — fallback for reasoning-heavy tasks
- OpenAI GPT-4o — optional fallback
- Google Gemini 2.5 Pro — optional fallback
- OpenRouter — meta-router fallback

**Persistence (two separate systems for two different jobs):**
- Appwrite — structured storage: jobs, profiles, application status, Kanban state
- Mem0 Cloud — semantic memory: preferences, applied companies, ranking history

**Scraping / Discovery:**
- Jina AI Reader (`r.jina.ai/`) — scrape any URL to markdown
- Jina Search (`s.jina.ai/`) — web search without API key
- GitHub API — pull repos, languages, stars, topics
- Greenhouse + Lever + Remotive APIs — job board feeds

---

## What the agent can do RIGHT NOW

### 7 tools available to the LLM in the agentic loop

1. **`discover_profile_tool`**
   - Input: GitHub username
   - What it does: searches the web for the user's LinkedIn profile, scrapes it
     via Jina, builds a full candidate profile from GitHub repos + LinkedIn text
   - Output: structured CandidateProfile with skills, titles, locations, highlights

2. **`web_search_tool`**
   - Input: search query string
   - What it does: searches via Jina Search API, returns title + URL + snippet
   - Used for: finding hiring signals, company career pages, "we're growing" posts
   - Output: array of WebSearchResult

3. **`scrape_url_tool`**
   - Input: any URL
   - What it does: fetches via Jina Reader with 3 retries + exponential backoff,
     falls back to raw HTML strip if Jina fails
   - Output: markdown content of the page, never throws

4. **`fetch_jobs_tool`**
   - Input: optional list of target companies
   - What it does: pulls live job listings from Greenhouse, Lever, Remotive,
     and optionally scrapes career pages of specific companies
   - Output: array of JobPosting with deduplication

5. **`query_memory_tool`**
   - Input: semantic query string + user ID
   - What it does: searches Mem0 Cloud for relevant past memories (preferences,
     applied companies, rejected roles, ranking history)
   - Output: array of memory strings injected into the ranking prompt context

6. **`rank_jobs_tool`**
   - Input: CandidateProfile + array of JobPosting
   - What it does: batches jobs in groups of 25, ranks each batch via LLM,
     merges and re-sorts by score, injects memory context before every call
   - Output: RankedJob[] sorted by score with rationale + matching/missing skills

7. **`queue_for_auto_apply_tool`**
   - Input: job URL + profile data
   - What it does: queues the job for Playwright auto-apply worker
   - Output: queued status (worker picks it up asynchronously)

### Memory loop (fully closed)

```
BEFORE ranking:
  → searchMemory(userId, "job preferences, applied companies, avoided roles")
  → inject results into ranking system prompt

AFTER ranking:
  → addMemory("Ranked N jobs. Top match: X at Y (score: Z)")

AFTER auto-apply:
  → addMemory("Applied to [role] at [company] on [date]")

ON user action (Kanban move):
  → addMemory based on column: "rejected", "interviewing", "offer"
```

### Opinion engine

After ranking, a second LLM pass produces exactly 3 strategic picks:
- **`apply_today`** — best immediate fit, apply now
- **`watch_this`** — strong company, role not perfect yet, monitor
- **`cold_outreach`** — great fit company, reach out directly before a role opens

These surface as notification cards at the top of the dashboard.

### Persistence to Appwrite

Every job search automatically saves to Appwrite:
- `profiles` collection — upserts by githubUsername
- `jobs` collection — deduped by jobId + profileId, with score + rationale
- `applications` collection — cover letter kits with status tracking

### API routes

```
POST /jobs/search          → full agent search pipeline
GET  /jobs/history         → load saved jobs + applications for a user
PATCH /jobs/applications/:id → update application status (applied/interviewing/offer)
POST /profile/scrape       → scrape URLs via Jina, condense to profile text
POST /profile/discover     → auto-discover LinkedIn from GitHub username
GET  /memory/:userId       → list all Mem0 memories for user
POST /memory/:userId/search → semantic search of memories
DELETE /memory/:memoryId   → delete a specific memory
GET  /health               → { ok: true, provider: "minimax" }
```

### Cron (every 6 hours)

The `functions/cron-scanner/` Appwrite Function:
1. Reads all profiles from Appwrite
2. Calls `POST /jobs/search` for each user with their saved preferences
3. New jobs are saved, memories updated
4. Agent runs completely without user interaction

---

## What the dashboard shows

```
/ (home)         → Job Search Agent form + results grid + opinion cards
/board           → Kanban: Discovered → Reviewing → Applied → Interviewing → Offer
```

**SearchForm** — GitHub username, target titles, locations, LLM provider selector, TopK
**UrlScraper** — add up to 5 URLs, scrape + condense to profile text via Jina
**JobCard** — score badge, company, title, location, remote tag, matching skills
**JobDetail** — full rationale, missing requirements, cover letter kit viewer
**KanbanBoard** — drag-drop application pipeline
**ProfileSummary** — shows extracted skills, target titles, highlights
**OpinionCards** — apply_today / watch_this / cold_outreach picks

---

## Current deployment state

| Service | URL | Status |
|---------|-----|--------|
| Dashboard (Next.js) | dashboard-tau-three-30.vercel.app | ✅ READY |
| API (Fastify) | needs separate Vercel project | ⚠️ NOT DEPLOYED |
| Appwrite Sites | ghostssh.appwrite.network | ✅ READY |
| Cron Function | Appwrite Functions | ✅ SCHEDULED |
| Mem0 | app.mem0.ai → ghostssh project | ✅ CONNECTED |
| Appwrite DB | sfo.cloud.appwrite.io | ⚠️ SCHEMA NEEDS SETUP |

---

## Immediate tasks for VS Code Copilot

### Task 1 — Deploy the Fastify API to Vercel

The dashboard is live but `API_URL` points nowhere. The API needs its own deployment.

**Steps:**
1. Go to vercel.com → New Project → Import `sixscripts-ai/ghostssh`
2. Set **Root Directory** to `apps/api`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Set **Framework** to `Other`
6. Add ALL environment variables from `apps/api/.env.example` with real values
7. Deploy — note the production URL (e.g. `https://ghostssh-api.vercel.app`)

Then update the dashboard project env var:
- `API_URL` = `https://ghostssh-api.vercel.app` (the URL from step 7)

Redeploy dashboard after setting `API_URL`.

### Task 2 — Set up Appwrite schema

The database collections don't exist yet. Run:

```bash
cd apps/api
cp .env.example .env
# Fill in APPWRITE_PROJECT_ID, APPWRITE_API_KEY, MINIMAX_API_KEY
npm install
npx tsx src/scripts/setup-appwrite-schema.ts
```

Expected output: `✅ Appwrite setup complete!`
If it says collections already exist, that's fine — it skips them.

### Task 3 — Verify Mem0 is writing

Start the API locally and run a test search:

```bash
# Terminal 1
cd apps/api && npm run dev

# Terminal 2 — test job search
curl -X POST http://localhost:8080/jobs/search \
  -H "Content-Type: application/json" \
  -d '{"githubUsername":"sixscripts","provider":"minimax","topK":3}'

# Terminal 3 — check memories were written
curl http://localhost:8080/memory/sixscripts
```

Expected: memories endpoint returns `{ total: 2, memories: [...] }` after the search.

Check Appwrite console — `ghostssh` database → `jobs` collection should have 3 new documents.

### Task 4 — Wire Vercel env vars for dashboard

Go to: vercel.com/sixscripts-ais-projects/dashboard/settings/environment-variables

Add:
```
NEXT_PUBLIC_APPWRITE_ENDPOINT  = https://sfo.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID = sfo-69be176f00077d92699d
NEXT_PUBLIC_APPWRITE_DATABASE_ID = ghostssh
API_URL = https://ghostssh-api.vercel.app   ← update after Task 1
```

### Task 5 — Add GitHub secrets for CI/CD

Go to: github.com/sixscripts-ai/ghostssh/settings/secrets/actions

Add:
```
MINIMAX_API_KEY
ANTHROPIC_API_KEY
MEM0_API_KEY
APPWRITE_PROJECT_ID = sfo-69be176f00077d92699d
APPWRITE_API_KEY
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID   ← for the API project
API_URL             ← production API URL
```

---

## What to build next (in priority order)

1. **Cron scheduler validation** — trigger the Appwrite Function manually once,
   confirm it reads profiles and calls /jobs/search for each user

2. **`/jobs/history` route** — it's implemented in persistence.service.ts but
   not registered as a route. Add `GET /jobs/history?githubUsername=xxx`

3. **Application status PATCH route** — implement
   `PATCH /jobs/applications/:id` with `{ status: "applied"|"interviewing"|"offer"|"rejected" }`
   This feeds back to Mem0 memory and moves Kanban cards

4. **Opinion cards on dashboard** — `opinionService` generates picks but the
   dashboard doesn't render them yet. Add OpinionCard component to page.tsx

5. **Activity feed** — show agent activity log on dashboard:
   "Found 12 new jobs overnight", "Applied to Anthropic", "3 new memories saved"

6. **Hiring signal detection** — `hiring-signal.service.ts` exists but isn't
   called in the main pipeline. Wire it into fetch_jobs_tool to boost scores
   for companies with active hiring signals

---

## Key files to know

```
apps/api/src/agent/orchestrator.ts     ← the full agentic loop with 7 tools
apps/api/src/agent/memory.service.ts   ← Mem0 + Appwrite hybrid memory
apps/api/src/services/opinion.service.ts ← opinion engine (apply_today etc)
apps/api/src/services/jina-scraper.service.ts ← resilient URL scraper
apps/api/src/services/web-search.service.ts   ← Jina Search wrapper
apps/api/src/agent/prompts/model.rules.ts     ← system prompt for the agent
apps/dashboard/src/app/page.tsx        ← main search UI
apps/dashboard/src/app/board/page.tsx  ← Kanban board
functions/cron-scanner/src/main.ts     ← 6-hour autonomous trigger
```

---

## Rules for development

1. Never hardcode API keys or project IDs — use env vars only
2. All LLM calls go through `withFallback()` from `providers/index.ts`
3. Jina scraper never throws — it returns partial results with warnings
4. Appwrite writes are wrapped in `Promise.allSettled()` — never block the response
5. Mem0 writes are fire-and-forget — memory failure must not crash the search
6. TypeScript strict mode — `npm run typecheck` must pass before any commit
7. Follow brainstorming → writing-plans → TDD from CLAUDE.md before new features
