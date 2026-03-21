# ghostssh — Production Agent Infrastructure & Monetization Plan

## The North Star

ghostssh is not a job board. It's a **multi-agent employment engine** that works 
24/7 on behalf of developers. The infrastructure must support 10,000 users running 
concurrent agent loops without one broken agent bringing down the whole system.

Every agent has one job. Every agent fails gracefully. The system degrades, never crashes.

---

## The 6 Revenue Agents (what we're building toward)

| Agent | Does | Charges for |
|-------|------|-------------|
| **Scout** | Finds jobs + hiring signals autonomously | Pro tier — always-on discovery |
| **Ranker** | Scores fit × urgency × network overlap | Pro tier — opinion engine picks |
| **Memory** | Learns preferences, gets smarter over time | Retention driver — users can't leave |
| **Outreach** | Drafts cold emails with recruiter names | Outreach add-on — $10/mo |
| **Applier** | Auto-applies via Playwright | Applier add-on — $15/mo |
| **Referral Router** | Routes inbound business leads to partners | Revenue share — 10-20% per deal |

---

## Infrastructure Rules (before adding ANY new agent)

These rules exist because multiple agents on shared infra will destroy each other 
without them. Non-negotiable.

### Rule 1 — Every agent is isolated
Each agent runs in its own async context. One agent's failure NEVER propagates.
Pattern: `Promise.allSettled()` — never `Promise.all()` for agent calls.

### Rule 2 — Every agent has a cost ceiling
Before any LLM call: check estimated token count. If > 8000 tokens, truncate input.
Each user search: hard cap $0.10 in LLM costs. If exceeded, switch to cheapest fallback.

### Rule 3 — Every agent has a timeout
All external calls: 15s timeout via `AbortSignal.timeout(15_000)`.
Full agent loop: 120s max. If exceeded, return partial results + "agent_timeout" flag.

### Rule 4 — Every agent logs to a structured event bus
Every agent action emits a structured event to Appwrite `agent_events` collection:
```json
{ "userId": "sixscripts", "agent": "scout", "action": "fetch_jobs", 
  "duration_ms": 1240, "status": "success", "result_count": 47 }
```
This feeds the activity feed, billing, and debugging.

### Rule 5 — Rate limiting per user
Free tier: 3 agent runs/day, 5 jobs max
Pro tier: unlimited runs, 25 jobs max per search
Each run is tracked in Appwrite `usage` collection.

### Rule 6 — Memory isolation
Every Mem0 call includes `user_id`. Never query without a user_id filter.
Never write a memory without source tag: `{ source: "ghostssh", agent: "scout" }`.

---

## What to Code — Phase by Phase

### PHASE 1 — Make the existing agents production-safe
*No new features. Harden what exists so it doesn't explode under load.*

#### 1A. Agent event bus
Create `apps/api/src/lib/event-bus.ts`:
```typescript
export async function emitAgentEvent(event: AgentEvent): Promise<void>
// Writes to Appwrite agent_events collection
// Never throws — fire and forget
// Schema: { userId, agent, action, duration_ms, status, metadata, timestamp }
```
Wire into: orchestrator, memory service, jina scraper, ranking service.

#### 1B. Cost guard middleware
Create `apps/api/src/lib/cost-guard.ts`:
```typescript
export function estimateTokens(text: string): number
export function guardTokenLimit(input: string, maxTokens: number): string
// Truncates input if over limit, logs the truncation as an agent event
```
Wire into: all LLM provider calls in `providers/base.ts`.

#### 1C. User rate limiter
Create `apps/api/src/lib/usage-tracker.ts`:
```typescript
export async function checkAndIncrementUsage(userId: string, tier: "free"|"pro"): Promise<boolean>
// Returns false if user has hit their daily limit
// Writes to Appwrite usage collection
```
Wire into: `POST /jobs/search` before the agent runs.

#### 1D. Add Appwrite schema for new collections
Add to `setup-appwrite-schema.ts`:
- `agent_events` — { userId, agent, action, duration_ms, status, metadata, timestamp }
- `usage` — { userId, date, run_count, tier }
- `outreach_drafts` — { userId, company, contactName, contactRole, subject, body, status }
- `referral_leads` — { sourceUserId, targetCompany, serviceType, status, value }

---

### PHASE 2 — The Scout Agent (existing, needs hardening)
*Jobs + hiring signals. The core value prop.*

#### 2A. Hiring signal service — wire it in
`hiring-signal.service.ts` exists but isn't called. Wire it into `fetch_jobs_tool`:
```typescript
// For each job in top 20:
const signal = await hiringSignalService.score(job.company, job.title);
job.score = (job.score * 0.6) + (signal.urgencyScore * 0.4);
job.tags.push(...signal.signals); // ["posted_3_days_ago", "team_growing"]
```

Hiring signal scoring:
- Job posted < 3 days → +40
- Job posted < 7 days → +25
- Company has 3+ open roles on same team → +20
- Web search returns "we're hiring" / "team growing" in last 30 days → +25
- LinkedIn company headcount grew > 10% last 6 months → +15

#### 2B. Network overlap detection
In `github.service.ts`, add:
```typescript
async getNetworkOverlap(username: string, company: string): Promise<string[]>
// Searches followers/following for users with company in bio/location
// Returns list of mutual connections at that company
// Cache results in Appwrite for 7 days
```
Add `networkConnections: string[]` to RankedJob type.
Show "🤝 2 connections" badge on JobCard.

#### 2C. Batch ranking (audit fix)
In `ranking.service.ts`:
```typescript
// Split jobs into batches of 25
// Run batches in parallel (max 3 concurrent)
// Merge results, re-sort by score
// Never send > 25 jobs in one LLM call
```

---

### PHASE 3 — The Memory Agent (upgrade)
*Gets smarter with every search. The retention weapon.*

#### 3A. Preference synthesis
After every 5 searches, run synthesis:
```typescript
async synthesizePreferences(userId: string): Promise<PreferenceSummary>
// Reads all mem0 memories for user
// Asks LLM: "extract structured preferences from these memories"
// Returns: { preferredRoles[], preferredCompanies[], dealbreakers[], 
//            salaryMin, remote: true/false, preferredStack[] }
// Saves back to mem0 as type: "preference_summary"
```

#### 3B. Preference injection
In `ranking.service.ts`, before every LLM call:
```typescript
const prefs = await memoryService.getPreferenceSummary(userId);
// Inject into system prompt:
// "User preferences: prefers remote, targets Series B startups,
//  dealbreakers: no equity, no Java roles, salary min $150k"
```

#### 3C. Feedback loop from Kanban
When user moves a card in Kanban, write to mem0:
- → "Not Interested": `addMemory("User rejected [company] [role] — not interested")`
- → "Applied": `addMemory("Applied to [role] at [company] on [date]")`
- → "Interviewing": `addMemory("Progressing at [company] for [role] — in interviews")`
- → "Offer": trigger full preference synthesis

---

### PHASE 4 — The Outreach Agent (NEW — revenue add-on)
*Drafts cold emails to companies before a role even exists.*

#### 4A. Trigger conditions
Outreach candidates when:
- Company score > 75 but no open role perfectly matching profile
- Company has "we're growing" signal but no relevant listing
- Network overlap detected at company with no open role

#### 4B. Contact discovery
```typescript
async findBestContact(company: string, candidateLevel: string): Promise<Contact>
// Strategy 1: Jina scrape LinkedIn people search for "{company} engineering manager"
// Strategy 2: Web search "{company} CTO email" / "{company} VP Engineering"
// Strategy 3: guess pattern from known emails (first.last@company.com)
// Returns: { name, role, email?, linkedinUrl?, confidence }
```

#### 4C. Email generation
```typescript
async generateOutreach(profile: CandidateProfile, company: string, contact: Contact): Promise<OutreachDraft>
// System prompt: direct, technical, 2 paragraphs max, no fluff, no em dashes
// Returns: { subject: string[3 variants], body: string, followUpDate: Date }
// Saves to Appwrite outreach_drafts with status: "draft"
```

#### 4D. Dashboard queue
New tab in dashboard: "Outreach" 
- Lists all drafts awaiting approval
- Edit button → user can modify before sending
- Approve button → marks as "approved" (sending is manual for now, auto-send in v2)
- Follow-up reminders at 7 days

---

### PHASE 5 — The Applier Agent (NEW — flagship Pro feature)
*Applies to pre-approved jobs automatically.*

#### 5A. User approval gate
User sets rules in dashboard settings:
```json
{
  "autoApply": true,
  "minScore": 85,
  "requireApproval": false,
  "approvedCompanies": ["Anthropic", "OpenAI"],
  "excludedCompanies": ["Amazon"],
  "maxApplicationsPerDay": 5
}
```

#### 5B. Playwright worker hardening
In `workers/playwright.worker.ts`:
```typescript
// Before applying:
// 1. Screenshot the job page
// 2. Send to Claude Vision: "Is this an active job listing? Is Easy Apply available?"
// 3. Only proceed if Vision confirms active listing

// During form fill:
// - Random delays 800-2000ms between field fills (human-like)
// - Detect fields by: label text, placeholder, name attr, aria-label
// - Fill: name, email, phone, LinkedIn URL, resume (upload from Appwrite Storage)
// - For text areas: use cover letter from ApplicationKit

// After submit:
// - Screenshot confirmation page
// - Save screenshot to Appwrite Storage
// - Update job status to "applied" in Appwrite
// - Write to Mem0: "Applied to [role] at [company]"
// - Emit agent_event: { agent: "applier", action: "applied", company, role }
```

#### 5C. Anti-bot evasion
```typescript
// Randomize viewport: 1280-1920 width, 800-1080 height
// Set realistic user agent rotating from pool of 10 real browser strings
// Add natural mouse movement before each click
// Never fill more than 3 forms in the same session
// Rotate IP via proxy if available
```

---

### PHASE 6 — The Referral Router Agent (NEW — passive income)
*Routes inbound business leads to partner network.*

#### 6A. Inbound email parser (future — needs email integration)
Connect Gmail via Appwrite Messaging or direct OAuth.
When email received at `ask@[yourdomain]`:
```typescript
// Classify email with LLM:
// { type: "referral_opportunity"|"spam"|"other",
//   serviceRequested: "bookkeeping"|"tax"|"compliance"|...,
//   companyName: string,
//   contactName: string,
//   estimatedValue: number }
```

#### 6B. Partner network matching
Maintain `partners` collection in Appwrite:
```typescript
// { name, company, services[], location, revenueShare: 0.15, email }
```
Match inbound request to best partner by service + location.

#### 6C. Routing + tracking
```typescript
// 1. Send intro email connecting requester with partner
// 2. Log to referral_leads collection: { status: "introduced", estimatedValue }
// 3. Follow up in 14 days: did deal close?
// 4. If closed: invoice partner for referral fee
```

---

## Infrastructure Stack (production-ready)

```
COMPUTE
├── Vercel (serverless)     — API + Dashboard (auto-scales, zero config)
└── Appwrite Functions      — Cron agents (isolated, scheduled)

STORAGE
├── Appwrite Database       — Structured: jobs, profiles, applications, events, usage
├── Appwrite Storage        — Files: screenshots, resumes, exports
└── Mem0 Cloud              — Semantic: preferences, history, learned rules

AI PROVIDERS (in fallback order)
├── Minimax M2.7            — Primary (best tool use + agents)
├── Anthropic Claude        — Reasoning + Vision
├── OpenAI GPT-4o           — Reliability fallback
└── Gemini 2.5 Pro          — Bulk/cheap fallback

SCRAPING
├── Jina Reader (r.jina.ai) — URL → markdown (free, no key)
└── Jina Search (s.jina.ai) — Web search (free, no key)

OBSERVABILITY
└── Appwrite agent_events   — Structured log of every agent action
```

---

## Pricing Model

```
FREE TIER (no credit card)
- 3 job searches per day
- 5 jobs per search, no memory, no auto-apply
- Memory disabled (can't learn preferences)
- Manual apply only

PRO — $19/month
- Unlimited searches, 25 jobs per search
- Full Mem0 memory (agent learns and improves)
- Opinion engine (apply_today / watch_this / cold_outreach)
- Cron agent runs every 6 hours automatically
- Job history + Kanban board

PRO + OUTREACH — $29/month
- Everything in Pro
- Outreach agent drafts cold emails
- Contact discovery (recruiter names + emails)
- Follow-up reminders

PRO + APPLIER — $34/month  
- Everything in Pro
- Auto-apply up to 10 jobs/day
- Screenshot proof of every application
- Application status tracking

ALL-IN — $49/month
- Everything above
- Referral routing (passive income on inbound leads)
- Priority LLM (always Minimax M2.7, no fallback to cheaper models)
- White-label option available on request
```

---

## What VS Code Copilot needs to build next (in order)

### Sprint 1 — Infrastructure (2-3 days)
1. `event-bus.ts` — agent event logging to Appwrite
2. `cost-guard.ts` — token counting + cost ceiling
3. `usage-tracker.ts` — per-user rate limiting
4. Appwrite schema additions: agent_events, usage, outreach_drafts, referral_leads
5. Wire event bus into all existing agents

### Sprint 2 — Scout hardening (1-2 days)
6. Wire `hiring-signal.service.ts` into ranking pipeline
7. `getNetworkOverlap()` in github.service.ts
8. Batch ranking in ranking.service.ts (25 jobs per batch)
9. Opinion engine enhancement (recruiter name, subject line, confidence score)

### Sprint 3 — Memory upgrade (1 day)
10. `synthesizePreferences()` — runs after every 5 searches
11. Preference injection into ranking system prompt
12. Kanban → Mem0 feedback loop (PATCH /jobs/applications/:id writes to memory)

### Sprint 4 — Outreach agent (2 days)
13. `findBestContact()` in new outreach.service.ts
14. `generateOutreach()` with 3 subject variants
15. Outreach drafts saved to Appwrite
16. Dashboard "Outreach" tab

### Sprint 5 — Applier agent (3 days)
17. Claude Vision verification before applying
18. Playwright form fill with human-like delays
19. Screenshot proof to Appwrite Storage
20. Auto-apply settings UI in dashboard

### Sprint 6 — Monetization layer (2 days)
21. Stripe integration — subscription plans
22. Usage-gated API routes (check tier before running agents)
23. Landing page with pricing
24. User auth via Appwrite Auth

---

## The Pitch (one sentence)

ghostssh is the AI employee that hunts, applies, and learns — 
so developers spend their time interviewing, not searching.
