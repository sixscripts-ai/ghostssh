# Job Board & Playwright Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Kanban-style job board in Next.js using Appwrite for real-time storage, update the Fastify API to save jobs to Appwrite, and create a Playwright worker that auto-applies to jobs.

**Architecture:** Option B (Direct SDK Access). Next.js uses the client SDK for real-time reads/updates. Fastify uses the server SDK to write new jobs. A standalone Node worker uses Playwright to auto-apply and updates the DB via the server SDK.

**Tech Stack:** Next.js 15, Fastify, Appwrite (node + web SDKs), Playwright, TypeScript.

---

### Task 1: Appwrite Schema & SDK Setup
**Files:**
- Create: `apps/api/src/lib/appwrite.ts`
- Create: `apps/dashboard/src/lib/appwrite.ts`
- Create: `scripts/setup-appwrite-schema.ts`

- [ ] **Step 1: Write setup script for Appwrite Schema**
  Write a Node.js script `scripts/setup-appwrite-schema.ts` to programmatically create the Database and the `jobs` collection with all required attributes (`string` title, `string` company, `string` url, `string` status, `integer` matchScore, etc.).
- [ ] **Step 2: Run script to initialize Appwrite**
  Execute `npx tsx scripts/setup-appwrite-schema.ts` to provision the database schema logic against the Appwrite cloud/local instance.
- [ ] **Step 3: Setup Server SDK and Web SDK**
  Export the initialized `Client` and `Databases` from `node-appwrite` in `apps/api/src/lib/appwrite.ts`, and the `@appwrite.io/web` client in `apps/dashboard/src/lib/appwrite.ts`.
- [ ] **Step 4: Commit**
  `git add . && git commit -m "feat: initialize appwrite SDKs and schema"`

### Task 2: Fastify API Integration
**Files:**
- Modify: `apps/api/src/services/agent.service.ts`
- Test: `apps/api/src/services/__tests__/agent.service.test.ts` (if exists)

- [ ] **Step 1: Write failing test / behavior**
  Add a unit test expecting `agent.service` to call `appwrite.createDocument` when the `/jobs/search` endpoint completes ranking.
- [ ] **Step 2: Run test to verify it fails**
  `npm run test` -> should fail as Appwrite integration isn't written.
- [ ] **Step 3: Write minimal implementation**
  Update the service to iterate through the top K jobs and insert them into the Appwrite `jobs` collection with a status of `saved`.
- [ ] **Step 4: Run test to verify passing**
  Verify the test passes and the data makes it to Appwrite successfully.
- [ ] **Step 5: Commit**
  `git commit -m "feat: save ranked jobs directly to Appwrite"`

### Task 3: Next.js Kanban Board UI
**Files:**
- Create: `apps/dashboard/src/app/board/page.tsx`
- Create: `apps/dashboard/src/components/KanbanBoard.tsx`

- [ ] **Step 1: Write component shell**
  Create the 4 main columns: Saved, Applied, Interviewing, Rejected.
- [ ] **Step 2: Implement Appwrite Web SDK fetching**
  Using standard React `useEffect`, fetch all jobs from the Appwrite `jobs` collection on mount and subscribe to realtime updates.
- [ ] **Step 3: Add drag-and-drop state updating**
  Implement DnD to move a job from one column to another, which triggers an `appwrite.updateDocument` call to change the `status` attribute.
- [ ] **Step 4: Commit**
  `git commit -m "feat: kanban board UI powered by appwrite"`

### Task 4: Playwright Auto-Apply Worker
**Files:**
- Create: `apps/worker/src/index.ts`
- Create: `apps/worker/package.json`

- [ ] **Step 1: Write polling / listener logic**
  Set up the worker to query Appwrite (or listen real-time) for new jobs that hit the `status: saved` state.
- [ ] **Step 2: Write Playwright navigation**
  For each job, launch a headless Chromium instance, navigate to the job `url`, and attempt to identify application form fields based on the candidate's profile.
- [ ] **Step 3: Update job status**
  If successful, use the Appwrite SDK to update the document's status to `applied`. If failed, `error` or leave as `saved` with notes.
- [ ] **Step 4: Commit**
  `git commit -m "feat: playwright auto-apply worker"`
