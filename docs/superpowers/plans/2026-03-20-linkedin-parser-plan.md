# LinkedIn Export Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete pipeline to upload a LinkedIn `.zip` export from the Next.js dashboard, proxy it to Fastify, extract/parse the internal CSVs, and use the LLM to condense it into a rich text profile.

**Architecture:** Fastify backend handles all multipart mapping, zip extraction (`adm-zip`), and CSV parsing (`csv-parse/sync`), returning a generated narrative string back to the Next.js proxy route, which feeds into the UI state smoothly without touching DB states.

**Tech Stack:** Fastify, `@fastify/multipart`, `adm-zip`, `csv-parse`, Next.js 15, React.

---
### Task 1: Backend Dependencies & Fastify Multipart Configuration
**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Install packages**
```bash
cd apps/api
npm install @fastify/multipart adm-zip csv-parse
npm install -D @types/adm-zip
```

- [ ] **Step 2: Register Multipart Plugin**
Modify `apps/api/src/app.ts` to import `@fastify/multipart` and register it with file size limits (50MB).
```typescript
import multipart from "@fastify/multipart";
// inside buildApp:
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
```

- [ ] **Step 3: Commit**
```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/src/app.ts
git commit -m "feat(api): install dependencies and configure fastify multipart"
```

---
### Task 2: Build the LinkedIn Parser Service
**Files:**
- Create: `apps/api/src/services/linkedin-parser.service.ts`
- Create: `apps/api/src/services/__tests__/linkedin-parser.test.ts`

- [ ] **Step 1: Write the service logic**
Create the service that accepts a `Buffer`, reads it with `adm-zip`, extracts `Profile.csv`, `Positions.csv`, `Skills.csv`, `Education.csv`, and uses `csv-parse/sync` to map to a `CandidateProfile` interface. Handle missing files gracefully (e.g., if a user has no `Education.csv` in the zip).

- [ ] **Step 2: Write tests for the service**
Create `apps/api/src/services/__tests__/linkedin-parser.test.ts`. Mock a zip buffer programmatically using `adm-zip` to test extraction and parsing.

- [ ] **Step 3: Run Tests**
```bash
cd apps/api && npm run test -- linkedin-parser.test.ts
```

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/services/linkedin-parser.service.ts apps/api/src/services/__tests__/linkedin-parser.test.ts
git commit -m "feat(api): build linkedin zip parser service"
```

---
### Task 3: Build the LinkedIn Condensation Service
**Files:**
- Create: `apps/api/src/services/linkedin-condensation.service.ts`

- [ ] **Step 1: Write Service Logic**
Inject the parsed `CandidateProfile` JSON to the Minimax API using the Anthropic SDK wrapper (similar to `agent.service.ts`), prompting it to generate a dense first-person resume narrative string.

- [ ] **Step 2: Commit**
```bash
git add apps/api/src/services/linkedin-condensation.service.ts
git commit -m "feat(api): add llm condensation service for linkedin profile"
```

---
### Task 4: Expose the Fastify Profile Upload Route
**Files:**
- Create: `apps/api/src/routes/profile.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write Route Logic**
Set up `POST /profile/upload`. Use `const data = await req.file()`. Pass `await data.toBuffer()` to the Parser, then pass the result to the Condensation service. Return `{ linkedinText: "..." }`. Handle bad formats safely.

- [ ] **Step 2: Register Route**
In `apps/api/src/app.ts`, register `profileRoutes`.

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/routes/profile.ts apps/api/src/app.ts
git commit -m "feat(api): expose /profile/upload route"
```

---
### Task 5: Next.js API Proxy Route
**Files:**
- Create: `apps/dashboard/src/app/api/profile/upload/route.ts`

- [ ] **Step 1: Write Proxy Logic**
Create a Next.js App Router POST route that reads `await request.formData()` and proxies the `fetch` to `http://localhost:8080/profile/upload` using the raw multipart payload, preventing JSON bloat on the proxy layer. Return the resulting JSON payload.

- [ ] **Step 2: Commit**
```bash
git add apps/dashboard/src/app/api/profile/upload/route.ts
git commit -m "feat(dashboard): create api proxy for profile upload"
```

---
### Task 6: Frontend UI - Drag and Drop Uploader
**Files:**
- Create: `apps/dashboard/src/components/ProfileUploader.tsx`
- Modify: `apps/dashboard/src/components/SearchForm.tsx`

- [ ] **Step 1: Write Uploader Component**
Create `<ProfileUploader onUploadComplete={(text: string) => void} />`. Build a visible drag-and-drop file target. Show an animated ghost loading spinner while the Fastify LLM parses.

- [ ] **Step 2: Integrate into Search Form**
In `SearchForm.tsx`, render the `<ProfileUploader />` directly below the "Target Titles" and above the "LinkedIn Context" textarea. When `onUploadComplete` fires, intelligently update the `linkedinText` React state with the returned LLM summary text so the user can verify it before clicking Search.

- [ ] **Step 3: Commit**
```bash
git add apps/dashboard/src/components/ProfileUploader.tsx apps/dashboard/src/components/SearchForm.tsx
git commit -m "feat(dashboard): implement linkedin zip drag-and-drop uploader"
```
