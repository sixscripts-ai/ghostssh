import { Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID, APPLICATIONS_COLLECTION_ID, PROFILES_COLLECTION_ID } from '../lib/appwrite.js';
import { agentMemoryService } from '../agent/memory.service.js';
import { outreachService } from '../services/outreach.service.js';
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AgentService } from "../services/agent.service.js";
import { checkUsage, incrementUsage } from "../lib/usage-tracker.js";

import { env } from '../config/env.js';
import { PlaywrightWorker } from '../workers/playwright.worker.js';

const Body=z.object({ githubUsername:z.string().min(1).optional(), linkedinText:z.string().optional(), manualTargetTitles:z.array(z.string()).optional(), manualLocations:z.array(z.string()).optional(), provider:z.enum(["minimax","openai","anthropic","gemini","openrouter"]).optional(), topK:z.number().int().min(1).max(25).optional() });

export async function jobRoutes(app: FastifyInstance) {
  const agent=new AgentService();
  app.post("/jobs/search", async(req,rep)=>{ 
    const r=Body.parse(req.body); 
    const userId = r.githubUsername || "anonymous";
    const usage = await checkUsage(userId);
    
    if (!usage.allowed) {
      return rep.status(429).send({ 
        error: "RATE_LIMITED", 
        message: `Free tier allows 3 searches/day. Upgrade to Pro for unlimited.`,
        runsToday: usage.runsToday
      });
    }
    
    r.topK = Math.min(r.topK ?? 10, usage.maxJobs);
    
    const result = await agent.search(r);
    incrementUsage(userId); // fire and forget, no await
    rep.send(result);
  });

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
        applied: `Applied to "${role}" at ${company} on ${date}`,
        interviewing: `Currently interviewing at ${company} for "${role}"`,
        offer: `Received offer from ${company} for "${role}" on ${date}`,
        rejected: `Rejected by ${company} for "${role}" — not a fit`,
        not_interested: `Not interested in "${role}" at ${company} — user dismissed`
      };

      void agentMemoryService.addMemory(userId, memoryMap[body.status] || "Status updated", "application");

      rep.send({ success: true, id, status: body.status });
    } catch (e: any) {
      console.error("[Jobs:Kanban]", e.message);
      rep.status(500).send({ error: e.message });
    }
  });

  app.get("/jobs/history", async (req, rep) => {
    try {
      const { githubUsername } = req.query as { githubUsername?: string };
      if (!githubUsername) {
        return rep.status(400).send({ error: "BAD_REQUEST", message: "githubUsername is required" });
      }
      const profiles = await databases.listDocuments(DATABASE_ID, "profiles", [
        Query.equal("githubUsername", githubUsername),
        Query.limit(1)
      ]);
      if (profiles.total === 0) {
        return rep.send({ profile: null, jobs: [], applications: [] });
      }
      const profile = profiles.documents[0] as any;
      const [jobs, applications] = await Promise.all([
        databases.listDocuments(DATABASE_ID, JOBS_COLLECTION_ID, [
          Query.equal("profileId", profile.$id),
          Query.orderDesc("matchScore"),
          Query.limit(50)
        ]),
        databases.listDocuments(DATABASE_ID, APPLICATIONS_COLLECTION_ID, [
          Query.equal("profileId", profile.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(25)
        ])
      ]);
      return rep.send({ profile, jobs: jobs.documents, applications: applications.documents });
    } catch (e: any) {
      return rep.status(500).send({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
  });

  const OutreachBody = z.object({
    userId: z.string().min(1),
    company: z.string().min(1),
    profileSummary: z.string().min(1)
  });

  app.post('/jobs/outreach', async (req, rep) => {
    try {
      const body = OutreachBody.parse(req.body);
      const draft = await outreachService.createOutreachForJob(
        body.userId, body.company, body.profileSummary
      );
      if (!draft) {
        return rep.status(404).send({
          error: "NO_CONTACT_FOUND",
          message: "Could not find a contact at this company"
        });
      }
      return rep.send(draft);
    } catch (e: any) {
      console.error("[Jobs:Outreach]", e.message);
      return rep.status(500).send({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
  });

  const ApplyBody = z.object({
    jobUrl: z.string().url(),
    userId: z.string().min(1),
    profile: z.record(z.string(), z.any())
  });

  app.post('/jobs/apply', async (req, rep) => {
    try {
      if (env.AUTO_APPLY_ENABLED !== "true") {
        return rep.status(403).send({
          error: "AUTO_APPLY_DISABLED",
          message: "Auto-apply is not enabled. Set AUTO_APPLY_ENABLED=true"
        });
      }

      const body = ApplyBody.parse(req.body);
      const worker = new PlaywrightWorker();
      const result = await worker.apply(body.jobUrl, body.profile, body.userId);
      return rep.send(result);
    } catch (e: any) {
      console.error("[Jobs:Apply]", e.message);
      return rep.status(500).send({ error: "INTERNAL_SERVER_ERROR", message: e.message });
    }
  });

}