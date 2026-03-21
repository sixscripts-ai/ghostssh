import type { ProviderName } from "../types/provider.js";
import type { JobPosting } from "../types/job.js";
import Anthropic from "@anthropic-ai/sdk";
import { ProfileBuilderService } from "../services/profile-builder.service.js";
import { JobAggregatorService } from "../services/jobs/aggregator.service.js";
import { RankingService } from "../services/ranking.service.js";
import { AgentMemoryService } from "./memory.service.js";
import { buildAgentRulesForModel } from "./prompts/model.rules.js";
import { webSearchService } from "../services/web-search.service.js";
import { jinaScraperService } from "../services/jina-scraper.service.js";
import { linkedInService } from "../services/linkedin.service.js";
import { hiringSignalService } from "../services/hiring-signal.service.js";

/**
 * Orchestrator: The autonomous Agentic Loop.
 * 
 * 7 tools available to the LLM:
 * - discover_profile_tool — auto-discover LinkedIn + web presence
 * - web_search_tool — search the web for hiring signals, career pages
 * - scrape_url_tool — scrape any URL via Jina with retry + fallback
 * - fetch_jobs_tool — fetch from job boards + optional targeted companies
 * - query_memory_tool — semantic search of agent memory
 * - rank_jobs_tool — score and rank jobs against candidate profile
 * - queue_for_auto_apply_tool — send job to auto-apply worker
 * 
 * Memory is integrated at every decision point:
 *   - BEFORE ranking: retrieve semantic preferences & past applications
 *   - AFTER ranking: persist ranking results to memory
 *   - AFTER auto-apply: persist application events
 */
export class AutonomousAgentOrchestrator {
  private profiles = new ProfileBuilderService();
  private jobs = new JobAggregatorService();
  private ranking = new RankingService();
  private memory = new AgentMemoryService();

  // Session state
  private sessionJobs: JobPosting[] = [];

  // ─── Tool Definitions ──────────────────────────────────────────────
  public readonly tools: Anthropic.Tool[] = [
    {
      name: "discover_profile_tool",
      description: "Auto-discover the user's LinkedIn profile and web presence from their GitHub username. Returns scraped LinkedIn text and profile data. Use this FIRST before any job search.",
      input_schema: {
        type: "object",
        properties: {
          githubUsername: { type: "string", description: "GitHub username to discover profile for" }
        },
        required: ["githubUsername"]
      }
    },
    {
      name: "web_search_tool",
      description: "Search the web for information. Use to find: companies hiring for specific roles, career pages, hiring announcements, blog posts about team growth, LinkedIn company pages. Returns URLs and snippets.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Web search query" },
          maxResults: { type: "number", description: "Max results to return (default 5)" }
        },
        required: ["query"]
      }
    },
    {
      name: "scrape_url_tool",
      description: "Scrape any URL to extract its content as markdown. Use for career pages, job listings, blog posts, company pages. Has built-in retry + fallback.",
      input_schema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to scrape" }
        },
        required: ["url"]
      }
    },
    {
      name: "fetch_jobs_tool",
      description: "Fetch job listings from board APIs (Greenhouse, Lever, Remotive) and optionally targeted company career pages. Use after discovering which companies to target.",
      input_schema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max number of jobs to fetch" },
          targetCompanies: { type: "array", items: { type: "string" }, description: "Optional: specific companies to also search career pages for" },
          targetRoles: { type: "array", items: { type: "string" }, description: "Optional: specific role titles to target" }
        }
      }
    },
    {
      name: "query_memory_tool",
      description: "Search agent memory for past context: applied jobs, user preferences, previous rankings, companies already explored. Use BEFORE making decisions.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Semantic query to search memory" }
        },
        required: ["query"]
      }
    },
    {
      name: "rank_jobs_tool",
      description: "Score and rank jobs against the candidate profile. Considers profile fit, skill match, and hiring signals. Returns ranked list with scores and rationale.",
      input_schema: {
        type: "object",
        properties: {
          jobIds: { type: "array", items: { type: "string" }, description: "Job IDs to rank (from fetch_jobs_tool results)" },
          candidateProfileId: { type: "string" }
        },
        required: ["jobIds", "candidateProfileId"]
      }
    },
    {
      name: "queue_for_auto_apply_tool",
      description: "Queue a highly-ranked job for the auto-apply worker. Only use for jobs scoring 70+ that the user hasn't applied to before.",
      input_schema: {
        type: "object",
        properties: {
          jobUrl: { type: "string", description: "URL of the job application page" },
          coverLetterRationale: { type: "string", description: "Custom cover letter or pitch" }
        },
        required: ["jobUrl", "coverLetterRationale"]
      }
    }
  ];

  constructor(private defaultProvider: ProviderName = 'minimax') {}

  // ─── Main ReAct Loop ───────────────────────────────────────────────
  public async executeTask(userIntent: string, githubUsername: string) {
    console.log(`[AgentOrchestrator] Starting task for ${githubUsername}: "${userIntent}"`);

    // 1. Long-term Memory: Get candidate profile context and episodic/semantic activity
    const profile = await this.profiles.build({ githubUsername, linkedinText: "" });
    const history = await this.memory.getHistoricalContext(githubUsername, userIntent);
    
    // Generate memory-injected rules tailored to the current LLM Provider
    const modelRules = buildAgentRulesForModel(this.defaultProvider, history.semanticPreferences);
    console.log(`\n[AgentOrchestrator] Applying System Prompt Rules:\n${modelRules}\n`);
    
    // 2. Short-term Memory: Record the current intent to Mem0
    await this.memory.recordSearchQuery(githubUsername, userIntent);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: `My GitHub username is "${githubUsername}". My intent is: ${userIntent}.

You are an intelligent job-hunting agent. Follow this workflow:
1. First, discover my profile — use discover_profile_tool to find my LinkedIn and web presence
2. Check my memory — use query_memory_tool to see what companies I've applied to and my preferences
3. Search the web for hiring signals — use web_search_tool to find companies actively hiring for my target roles
4. Fetch jobs from boards AND targeted companies — use fetch_jobs_tool with targetCompanies based on your research
5. Rank the jobs against my profile — use rank_jobs_tool
6. Queue top matches for auto-apply if score > 70

Be proactive. Don't just use job boards — actively search for hiring signals and career pages. Show your reasoning at each step.` }
    ];

    let isTaskComplete = false;
    let stepCount = 0;
    
    while (!isTaskComplete && stepCount < 20) {
      stepCount++;
      console.log(`\n[AgentOrchestrator] Reasoning Step ${stepCount}...`);
      
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        system: modelRules,
        tools: this.tools,
        messages
      });

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "tool_use") {
        const toolUse = response.content.find(c => c.type === "tool_use") as Anthropic.ToolUseBlock;
        console.log(`[AgentOrchestrator] Tool: ${toolUse.name}`);

        let toolResultContent = "";
        
        try {
          toolResultContent = await this.executeTool(toolUse, githubUsername, history, profile);
        } catch (err: any) {
          console.error(`[AgentOrchestrator] Error in ${toolUse.name}:`, err.message);
          toolResultContent = `Error executing tool: ${err.message}. Try an alternative approach.`;
        }

        messages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolUse.id, content: toolResultContent }]
        });
      } else {
        const finalReply = response.content.map(c => c.type === 'text' ? c.text : '').join('\n');
        console.log(`[AgentOrchestrator] Task complete:\n${finalReply}`);
        isTaskComplete = true;
      }
    }

    return { success: true, message: "Autonomous task concluded." };
  }

  // ─── Tool Execution ────────────────────────────────────────────────
  private async executeTool(
    toolUse: Anthropic.ToolUseBlock,
    githubUsername: string,
    history: Awaited<ReturnType<AgentMemoryService['getHistoricalContext']>>,
    profile: any
  ): Promise<string> {

    // ── discover_profile_tool ──
    if (toolUse.name === "discover_profile_tool") {
      const args = toolUse.input as { githubUsername: string };
      const username = args.githubUsername || githubUsername;

      const linkedinText = await linkedInService.discover(username);
      
      if (linkedinText) {
        return `LinkedIn profile discovered and scraped (${linkedinText.length} chars). Key info:\n${linkedinText.slice(0, 1500)}`;
      }
      return `No LinkedIn profile found for ${username}. Proceeding with GitHub profile data only (${profile.repos?.length || 0} repos, skills: ${profile.skills?.slice(0, 5).map((s: any) => s.name).join(', ')}).`;
    }

    // ── web_search_tool ──
    if (toolUse.name === "web_search_tool") {
      const args = toolUse.input as { query: string; maxResults?: number };
      const results = await webSearchService.search(args.query, args.maxResults || 5);
      
      if (results.length === 0) return "No search results found. Try a different query.";
      return `Found ${results.length} results:\n${results.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n')}`;
    }

    // ── scrape_url_tool ──
    if (toolUse.name === "scrape_url_tool") {
      const args = toolUse.input as { url: string };
      const result = await jinaScraperService.scrapeWithResilience(args.url);
      
      if (result.success) {
        const truncated = result.content.slice(0, 3000);
        return `Scraped ${result.url} via ${result.method} (${result.content.length} chars):\n${truncated}`;
      }
      return `Failed to scrape ${args.url} after ${result.retries} retries. The URL may be blocked or down.`;
    }

    // ── fetch_jobs_tool ──
    if (toolUse.name === "fetch_jobs_tool") {
      const args = toolUse.input as { limit?: number; targetCompanies?: string[]; targetRoles?: string[] };

      let newJobs: JobPosting[];
      if (args.targetCompanies && args.targetCompanies.length > 0) {
        newJobs = await this.jobs.fetchTargeted(args.targetCompanies, args.targetRoles);
      } else {
        newJobs = await this.jobs.fetchAll();
      }

      // Deduplicate against applied jobs from memory
      const unseenJobs = newJobs.filter(j => !history.appliedJobUrls.includes(j.url));
      this.sessionJobs = unseenJobs;
      
      const preview = unseenJobs.slice(0, 8).map(j => ({
        id: j.id, company: j.company, title: j.title,
        location: j.location, source: j.source,
      }));

      return `Found ${newJobs.length} total jobs, ${unseenJobs.length} unseen (filtered ${newJobs.length - unseenJobs.length} already-applied). Sources: boards + ${args.targetCompanies?.length || 0} career pages.\n\nPreview:\n${JSON.stringify(preview, null, 2)}`;
    }

    // ── query_memory_tool ──
    if (toolUse.name === "query_memory_tool") {
      const args = toolUse.input as { query: string };
      const memories = await this.memory.searchMemory(githubUsername, args.query);
      
      if (memories.length > 0) {
        return `Found ${memories.length} relevant memories:\n${memories.map(m => `- ${m.memory}`).join('\n')}`;
      }
      return `No matching memories found. User has ${history.appliedJobUrls.length} previously tracked jobs.`;
    }

    // ── rank_jobs_tool ──
    if (toolUse.name === "rank_jobs_tool") {
      const args = toolUse.input as { jobIds: string[]; candidateProfileId: string };
      const jobsToRank = this.sessionJobs.filter(j => args.jobIds.includes(j.id));
      
      const ranked = await this.ranking.rank(
        profile,
        jobsToRank.length > 0 ? jobsToRank : this.sessionJobs.slice(0, 5),
        this.defaultProvider
      );
      
      // Persist top result to memory
      const topMatch = ranked[0];
      if (topMatch) {
        await this.memory.recordRankingResult(
          githubUsername, topMatch.title, topMatch.company, topMatch.score, ranked.length
        );
      }
      
      return `Ranked ${ranked.length} jobs. Top matches:\n${ranked.slice(0, 5).map((j, i) => `${i + 1}. ${j.title} @ ${j.company} — Score: ${j.score}/100\n   ${j.rationale}`).join('\n\n')}`;
    }

    // ── queue_for_auto_apply_tool ──
    if (toolUse.name === "queue_for_auto_apply_tool") {
      const args = toolUse.input as { jobUrl: string; coverLetterRationale: string };
      await this.queueJobForApplication(args.jobUrl, args.coverLetterRationale);
      
      await this.memory.recordApplication(githubUsername, 'Unknown Company', 'Applied Role', args.jobUrl);
      
      return `Successfully queued ${args.jobUrl} for auto-apply.`;
    }

    return `Error: Unknown tool '${toolUse.name}'`;
  }

  private async queueJobForApplication(jobUrl: string, intentData: string) {
    console.log(`Queued for auto-apply: ${jobUrl}`);
  }
}
