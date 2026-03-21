# ghostssh — Autonomous Job Hunting Agent
## Product Vision & Implementation Plan

---

## What we're building

Not a job search tool. An autonomous employee that hunts jobs 24/7, 
learns your preferences, pursues leads, and only interrupts you when 
something actually needs your attention.

You open the dashboard and jobs are already ranked, outreach is drafted, 
and the Kanban board has moved cards based on what happened overnight.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                        │
│  Runs every 6 hours via cron (Appwrite Functions)   │
│  Coordinates all agents, manages state              │
└──────────┬──────────┬──────────┬───────────┬────────┘
           │          │          │           │
    ┌──────▼──┐ ┌─────▼───┐ ┌───▼────┐ ┌───▼──────┐
    │DISCOVERY│ │RANKER   │ │MEMORY  │ │OUTREACH  │
    │ Agent   │ │ Agent   │ │ Agent  │ │ Agent    │
    └──────┬──┘ └─────┬───┘ └───┬────┘ └───┬──────┘
           │          │         │           │
    ┌──────▼──────────▼─────────▼───────────▼──────┐
    │              DATA LAYER                       │
    │  Appwrite (jobs, applications, kanban)        │
    │  Mem0 (preferences, history, learned rules)  │
    └───────────────────────────────────────────────┘
```

---

## Phase 1 — Autonomous Discovery Agent
**Goal:** Find jobs and hiring signals without any user input.

### 1.1 Always-on cron scheduler
- Appwrite Function triggered every 6 hours
- Reads user profiles from Appwrite
- Kicks off full discovery pipeline per user
- Deduplicates against already-seen jobs in Appwrite

### 1.2 Multi-source job harvesting
Sources in priority order:
1. Greenhouse / Lever / Remotive (existing — keep)
2. Company career pages scraped via Jina (`r.jina.ai/https://company.com/careers`)
3. LinkedIn job posts (Jina scrape of public job URLs)
4. GitHub Jobs signals — companies with active hiring repos
5. HN "Who's Hiring" monthly thread (Jina + parse)
6. Web search: `"[role] [location] site:jobs.lever.co OR site:boards.greenhouse.io"`

### 1.3 Hiring intent scoring (NEW)
For each company found, score hiring urgency 0-100:
- Job posted < 7 days ago → +40
- Company headcount growing (LinkedIn signals) → +20  
- Multiple open roles for same team → +15
- Referral network overlap (GitHub mutual follows) → +25
Final job score = profile_fit × 0.6 + hiring_urgency × 0.4

### 1.4 Profile auto-discovery
- GitHub: auto-fetched via API (working)
- LinkedIn: search `site:linkedin.com/in "[name]" "[company]"` via Jina
- No manual URL input required — user can add hints but agent finds itself

---

## Phase 2 — Intelligent Ranking Agent  
**Goal:** Return 3 "apply today" picks, not a list of 10.

### 2.1 Batched LLM ranking (fixes audit bug)
- Batch jobs in groups of 25 (fixes 360k token bomb)
- Run batches in parallel, merge + re-sort by score

### 2.2 Memory-augmented ranking
Before every ranking call, inject from mem0:
- "User has been rejected by [company]" → penalize -30
- "User prefers Series B startups" → boost matching companies
- "User ignores roles without equity" → filter out
- "User applied to [role] last week" → skip duplicates

### 2.3 Opinion engine (NEW)
After ranking, a second LLM pass generates:
- 1 "Apply today" pick with specific reasoning
- 1 "Watch this" pick (company growing, no perfect role yet)  
- 1 "Cold outreach" pick (great fit company, no open role)
This surfaces as a notification card in the dashboard.

---

## Phase 3 — Memory Agent
**Goal:** Get smarter with every interaction.

### 3.1 Passive learning (automatic)
Every action writes to mem0:
- Job viewed → preference signal
- Job dismissed → negative signal  
- Application submitted → strong positive
- Interview booked → very strong positive
- Offer → extract company/role/stack as "ideal match" template

### 3.2 Active preference extraction (NEW)
After 5+ interactions, the memory agent runs a synthesis:
- Reads all mem0 memories for user
- Asks LLM: "What are this user's 5 strongest job preferences?"
- Writes structured preference summary back to mem0
- This summary is injected into EVERY future ranking prompt

### 3.3 Feedback loop
Kanban card moves feed back into mem0:
- Moved to "Not Interested" → addMemory("User rejected [company] — reason: [stage]")
- Moved to "Interviewing" → addMemory("User progressing at [company] for [role]")
- Moved to "Offer" → full preference extraction triggered

---

## Phase 4 — Outreach Agent (NEW)
**Goal:** Draft cold emails for "watch" companies before a role is even posted.

### 4.1 Trigger conditions
Agent identifies outreach candidates when:
- Company score > 75 but no open role matching profile
- Company posted a "we're growing" blog post or LinkedIn update
- User has GitHub connections who work there

### 4.2 What it generates
For each outreach candidate:
- Personalized cold email (2 paragraphs max)
- Subject line options (3 variants)  
- Best contact to reach (CTO/VP Eng for small, recruiter for large)
- Queued in dashboard as "Drafts" — user approves before send

### 4.3 Follow-up tracking
If outreach is sent:
- Appwrite stores sent date + contact
- Memory agent sets reminder: "Follow up with [company] in 7 days"
- Dashboard surfaces reminder card on day 7

---

## Phase 5 — Kanban as Control Center
**Goal:** The dashboard is where you manage exceptions, not where you do work.

### 5.1 Board columns
```
Discovered → Reviewing → Applied → Interviewing → Offer → Archived
```

### 5.2 Autonomous card movement
Agent moves cards automatically based on:
- New job found → `Discovered`
- User clicks "Apply" (or Playwright auto-applies) → `Applied`
- Email parsing detects "interview invite" → `Interviewing` (future)
- User marks manually → any column

### 5.3 Dashboard notifications (NEW)
Top of dashboard shows agent activity feed:
- "Found 12 new jobs overnight — 3 match your preferences"
- "Anthropic posted a new ML role — 94% match. Apply today?"
- "It's been 7 days since you applied to OpenAI — no response. Archive?"

### 5.4 Stats panel
- Total jobs discovered this week
- Application rate (applied / discovered)
- Response rate (responses / applied)
- Top companies by match score
- mem0 memory count (shows agent is learning)

---

## Phase 6 — Playwright Auto-Apply Worker
**Goal:** Apply to pre-approved jobs without touching a browser.

### 6.1 User sets auto-apply rules
```json
{
  "autoApply": true,
  "minScore": 85,
  "companies": ["Anthropic", "OpenAI", "Perplexity"],
  "excludeCompanies": ["Meta", "Amazon"],
  "requireRemote": true
}
```

### 6.2 Worker flow
1. Job score > threshold → queue for auto-apply
2. Playwright opens job URL in headless browser
3. Fills form using profile data from Appwrite
4. Submits + takes screenshot as proof
5. Updates Kanban card to "Applied" with timestamp + screenshot
6. Fires mem0 write: "Applied to [role] at [company]"

### 6.3 Fallback
If form is too complex for Playwright:
- Marks card as "Needs Manual Apply"
- Surfaces in dashboard with "Apply now" deep link

---

## Implementation Order

| Priority | Phase | Est. Effort | Impact |
|----------|-------|-------------|--------|
| 1 | Cron scheduler (Appwrite Functions) | 1 day | Unlocks autonomy |
| 2 | Batched ranking fix | 2 hours | Fixes crash bug |
| 3 | Opinion engine ("Apply today" pick) | 1 day | Core UX value |
| 4 | Kanban auto-movement + activity feed | 2 days | Makes it feel alive |
| 5 | Outreach agent | 2 days | Competitive edge |
| 6 | Active preference learning | 1 day | Gets smarter over time |
| 7 | Playwright auto-apply | 3 days | Full autonomy |

---

## Gemini Agent Instructions

Start with Phase 1 (cron) + Phase 2 (batched ranking + opinion engine).
Use skills: autonomous-agents, ai-engineer, agent-memory-systems, backend-architect.
Follow brainstorming → writing-plans → TDD workflow from GEMINI.md.
Do not write code until a plan is approved.
Every feature needs a test. No exceptions.
