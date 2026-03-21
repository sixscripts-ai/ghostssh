import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AgentService } from "../services/agent.service.js";
import { checkUsage, incrementUsage } from "../lib/usage-tracker.js";

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
}
