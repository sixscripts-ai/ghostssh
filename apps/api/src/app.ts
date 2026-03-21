import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { logger } from "./lib/logger.js";
import { healthRoutes } from "./routes/health.js";
import { jobRoutes } from "./routes/jobs.js";
export async function buildApp() {
  const app=Fastify({logger});
  await app.register(cors,{origin:true}); await app.register(helmet); await app.register(rateLimit,{max:100,timeWindow:"1 minute"});
  app.setErrorHandler((err,_req,rep)=>{app.log.error(err);rep.status(500).send({error:"INTERNAL_SERVER_ERROR",message:err.message});});
  await app.register(healthRoutes); await app.register(jobRoutes);
  return app;
}
