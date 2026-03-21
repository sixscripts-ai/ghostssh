import { AgentService } from "../services/agent.service.js";
const agent=new AgentService();
const result=await agent.search({ githubUsername:process.env["GITHUB_USERNAME"], linkedinText:process.env["LINKEDIN_TEXT"], manualTargetTitles:["AI Engineer","ML Engineer","LLM Engineer"], manualLocations:["Remote"], provider:"minimax", topK:5 });
console.log(JSON.stringify(result,null,2));
