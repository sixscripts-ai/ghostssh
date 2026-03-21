import { buildApp } from "./app.js";
import { env } from "./config/env.js";
const app=await buildApp();
try { await app.listen({port:env.PORT,host:"0.0.0.0"}); app.log.info(`ghostssh listening on :${env.PORT} [provider: ${env.DEFAULT_PROVIDER}]`); }
catch(e){ app.log.error(e); process.exit(1); }
