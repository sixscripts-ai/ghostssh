const fs = require('fs');
const file = 'apps/api/src/routes/jobs.ts';
let code = fs.readFileSync(file, 'utf8');

code = `import { Query } from 'node-appwrite';\nimport { databases, DATABASE_ID, JOBS_COLLECTION_ID, APPLICATIONS_COLLECTION_ID, PROFILES_COLLECTION_ID } from '../lib/appwrite.js';\nimport { agentMemoryService } from '../agent/memory.service.js';\n` + code;

const kanbanRoute = `
  const KanbanBody = z.object({
    status: z.enum(["applied", "interviewing", "offer", "rejected", "not_interested"]),
    company: z.string().optional(),
    role: z.string().optional(),
    userId: z.string().optional()
  });

  app.patch("/jobs/applications/:id", async (req, rep) => {
    try {
      const { id } = req.params as { id: string };
      const body = KanbanBody.parse(req.body);
      
      await databases.updateDocument(DATABASE_ID, APPLICATIONS_COLLECTION_ID, id, {
        status: body.status
      });

      const userId = body.userId || "anonymous";
      const company = body.company || "unknown company";
      const role = body.role || "unknown role";
      const date = new Date().toISOString().split("T")[0];

      const memoryMap: Record<string, string> = {
        applied: \`Applied to "\${role}" at \${company} on \${date}\`,
        interviewing: \`Currently interviewing at \${company} for "\${role}"\`,
        offer: \`Received offer from \${company} for "\${role}" on \${date}\`,
        rejected: \`Rejected by \${company} for "\${role}" — not a fit\`,
        not_interested: \`Not interested in "\${role}" at \${company} — user dismissed\`
      };

      void agentMemoryService.addMemory(userId, memoryMap[body.status], "application");

      rep.send({ success: true, id, status: body.status });
    } catch (e: any) {
      console.error("[Jobs:Kanban]", e.message);
      rep.status(500).send({ error: e.message });
    }
  });`;

const historyRoute = `
  const HistoryQuery = z.object({
    githubUsername: z.string().min(1)
  });

  app.get("/jobs/history", async (req, rep) => {
    try {
      const { githubUsername } = HistoryQuery.parse(req.query);
      
      const profiles = await databases.listDocuments(DATABASE_ID, PROFILES_COLLECTION_ID, [
        Query.equal("githubUsername", githubUsername),
        Query.limit(1)
      ]);

      if (profiles.documents.length === 0) {
        return rep.send({ profile: null, jobs: [], applications: [] });
      }

      const profile = profiles.documents[0];

      const jobs = await databases.listDocuments(DATABASE_ID, JOBS_COLLECTION_ID, [
        Query.equal("profileId", profile.$id),
        Query.orderDesc("matchScore"),
        Query.limit(50)
      ]);

      const applications = await databases.listDocuments(DATABASE_ID, APPLICATIONS_COLLECTION_ID, [
        Query.equal("profileId", profile.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(25)
      ]);

      return rep.send({ profile, jobs: jobs.documents, applications: applications.documents });
    } catch (e: any) {
      rep.status(500).send({ error: e.message });
    }
  });
`;

code = code.replace(/}\n*$/, kanbanRoute + "\n" + historyRoute + "\n}");

fs.writeFileSync(file, code);
