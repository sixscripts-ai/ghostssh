import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
export async function healthRoutes(app: FastifyInstance) { app.get("/health", async()=>({ok:true,provider:env.DEFAULT_PROVIDER})); }
