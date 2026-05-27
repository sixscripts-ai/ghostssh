import { AgentService } from "./apps/api/src/services/agent.service.js";

async function run() {
  const agent = new AgentService();
  const result = await agent.search({
    githubUsername: "sixscripts-ai",
    manualTargetTitles: ["AI Engineer"],
    manualLocations: ["Remote"],
    provider: "openrouter",
    topK: 2
  });
  console.log("TEST SUCCESSFUL! Found jobs:", result.jobs.length);
  console.log("Provider used:", result.providerUsed);
}
run().catch(console.error);
