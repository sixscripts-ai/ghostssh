import { AgentService } from "../services/agent.service.js";

async function run() {
  const agent = new AgentService();
  const result = await agent.search({
    linkedinText: "Experienced Software Engineer focusing on AI and LLMs. I love building multi-agent systems and React Next.js frontends.",
    manualTargetTitles: ["AI Engineer", "Software Engineer"],
    manualLocations: ["Remote"],
    provider: "openrouter",
    topK: 2
  });
  console.log("TEST SUCCESSFUL! Found jobs:", result.jobs.length);
  console.log("Provider used:", result.providerUsed);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
