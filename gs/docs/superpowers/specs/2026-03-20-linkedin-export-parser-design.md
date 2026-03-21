# LinkedIn Export ZIP Parser & Integration Specification

## 1. Objective and Intentions
The core goal is to fully automate the ingestion of a user's LinkedIn Data Export (.zip format) into the ghostssh job agent. Rather than requiring users to manually copy-paste their LinkedIn profiles as a wall of text, the system will programmatically extract, parse, and condense raw CSV networking data. This provides a deeply accurate profile schema that seamlessly integrates with our existing LLM-ranking system, paving the way for autonomous resume tuning.

## 2. Architecture

### A. Frontend (Next.js Dashboard - `apps/dashboard`)
1. **Component Updates (`SearchForm.tsx`)**:
   - Introduce a new drag-and-drop file upload zone specifically targeting `.zip` files.
   - When a `.zip` file is dropped, the UI displays a loading state (e.g., "Parsing LinkedIn Archive...").
2. **API Proxy Route (`apps/dashboard/src/app/api/profile/upload/route.ts`)**:
   - We will implement an API proxy route that forwards the raw `multipart/form-data` stream from the browser directly to the Fastify backend. This maintains a lightweight Next.js edge-friendly layer and avoids serverless payload limitations by streaming the data.
3. **State Management**:
   - On a successful response from the API, the generated profile string is automatically injected into the `linkedinText` text area, replacing or merging with existing user input.

### B. Backend (Fastify API - `apps/api`)
1. **New Dependencies**:
   - `@fastify/multipart`: To handle file uploads safely.
   - `adm-zip`: To decompress the `.zip` buffer synchronously in-memory.
   - `papaparse` (or `csv-parse`): To robustly parse the internal CSV files into JSON objects mapping headers to properties.
2. **Endpoint (`POST /profile/upload`)**:
   - Register `@fastify/multipart` globally in `src/app.ts` with strict file size limits (e.g., `limits: { fileSize: 50 * 1024 * 1024 }` / 50MB max).
   - Create a new router/group: `src/routes/profile.ts`.
3. **Extraction Service (`src/services/linkedin-parser.service.ts`)**:
   - The service accepts the `.zip` file buffer.
   - It iterates through the zip entries, strictly looking for standard LinkedIn Export files:
     - `Profile.csv` (Extracts: First Name, Last Name, Headline, Summary)
     - `Positions.csv` (Extracts: Company Name, Title, Description, Started On, Finished On)
     - `Skills.csv` (Extracts: Name)
     - `Education.csv` (Extracts: School Name, Degree Name, Field Of Study, Start Date, End Date)
4. **Data Aggregation**:
   - The service transforms the CSV rows into a unified TypeScript `CandidateProfile` interface.
5. **LLM Condensation (`src/services/linkedin-condensation.service.ts`)**:
   - *Intention*: The core ghostssh ranking algorithm relies on a highly dense narrative string (`linkedinText`). Injecting raw JSON directly into the search context window bloats tokens and confuses the ranking logic.
   - *Solution*: We will send the structured `CandidateProfile` JSON to the LLM (Minimax M2.5) with a specialized system prompt: *"You are an expert resume writer. Condense this structured LinkedIn export into a highly readable, dense, professional first-person narrative that highlights all key skills, roles, and achievements."*
   - Fastify returns this condensed markdown/string back to the client.

## 3. Error Handling, Reliability & Security
- **File Validation**: Reject any file that does not have an `application/zip` MIME type or `.zip` extension.
- **Malformed ZIPs**: Handle `adm-zip` errors gracefully, returning an HTTP `400 Bad Request` ("Invalid ZIP file or missing expected LinkedIn CSV contents").
- **Missing Data Fallbacks**: If a user's LinkedIn export doesn't contain `Education.csv` because they didn't add education, the parser must gracefully ignore the missing file rather than crashing the pipeline.
- **Size Constraints**: LinkedIn exports can vary; strict multipart constraints will prevent server memory exhaustion attacks.

## 4. Execution Plan (Step-by-Step)
1. **Setup**: Run `npm install` for `@fastify/multipart`, `adm-zip`, and `papaparse` on `apps/api`. Add `@types/*` where necessary.
2. **Fastify Configuration**: Register the multipart plugin in `app.ts`.
3. **Backend Logic**: Implemented the `linkedin-parser.service.ts` to unzip and parse.
4. **LLM Integration**: Implement the `linkedin-condensation.service.ts` to transform the structured JSON into narrative text.
5. **API Routing**: Expose the `POST /profile/upload` route calling those services.
6. **Frontend UI**: Create the drag-and-drop component and connect it to the proxy route.
7. **End-to-End Test**: Generate a dummy `.zip` LinkedIn export structure to test the full pipeline.
