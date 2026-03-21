import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";
import { jobRoutes } from "./routes/jobs.js";
import { profileRoutes } from "./routes/profile.js";
import { memoryRoutes } from "./routes/memory.js";

export async function buildApp() {
  const app=Fastify({logger:{ level: env.NODE_ENV==="production"?"info":"debug", transport: env.NODE_ENV==="production"?undefined:{target:"pino-pretty",options:{colorize:true,ignore:"pid,hostname"}} }});
  await app.register(cors,{origin:true}); await app.register(helmet); await app.register(rateLimit,{max:100,timeWindow:"1 minute"});
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  app.setErrorHandler((err: any,_req,rep)=>{app.log.error(err);rep.status(500).send({error:"INTERNAL_SERVER_ERROR",message:err.message});});
  await app.register(healthRoutes); await app.register(jobRoutes); await app.register(profileRoutes); await app.register(memoryRoutes);
  return app;
}
