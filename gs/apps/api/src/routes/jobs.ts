import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AgentService } from "../services/agent.service.js";
const Body=z.object({ githubUsername:z.string().min(1).optional(), linkedinText:z.string().optional(), manualTargetTitles:z.array(z.string()).optional(), manualLocations:z.array(z.string()).optional(), provider:z.enum(["minimax","openai","anthropic","gemini","openrouter"]).optional(), topK:z.number().int().min(1).max(25).optional() });
export async function jobRoutes(app: FastifyInstance) {
  const agent=new AgentService();
  app.post("/jobs/search", async(req,rep)=>{ const r=Body.parse(req.body); rep.send(await agent.search(r)); });
}
