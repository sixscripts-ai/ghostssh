import type { ProviderName } from "../types/provider.js";
import type { ApplicationKit, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import { ApplicationKitService } from "./application-kit.service.js";
import { JobAggregatorService } from "./jobs/aggregator.service.js";
import { ProfileBuilderService, type BuildProfileInput } from "./profile-builder.service.js";
import { RankingService } from "./ranking.service.js";
import { agentMemoryService } from "../agent/memory.service.js";

export type AgentSearchInput = BuildProfileInput & { topK?:number };
export type AgentSearchResult = { profile:CandidateProfile; jobs:RankedJob[]; kits:ApplicationKit[]; opinions: import("../types/job.js").OpinionPick[]; providerUsed?:ProviderName };

/**
 * PHASE 3.1 — Passive Learning
 * Records every user action (view, dismiss, apply) to Mem0.
 */
export class UserActionService {
  async recordView(userId: string, company: string, role: string) {
    await agentMemoryService.addMemory(userId, `User viewed "${role}" at ${company}. Interest signal.`, 'preference');
  }

  async recordDismiss(userId: string, company: string, role: string, reason?: string) {
    await agentMemoryService.addMemory(userId, `User dismissed "${role}" at ${company}${reason ? ` - reason: ${reason}` : ''}. Negative preference.`, 'preference');
  }

  async recordApplication(userId: string, company: string, role: string, url: string) {
    await agentMemoryService.recordApplication(userId, company, role, url);
  }
}

export const userActionService = new UserActionService();

import { ID } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';

export class AgentService {
  private profiles=new ProfileBuilderService(); private jobs=new JobAggregatorService();
  private ranking=new RankingService(); private kits=new ApplicationKitService();
  async search(input:AgentSearchInput): Promise<AgentSearchResult> {
    const profile=await this.profiles.build(input);
    const jobs=await this.jobs.fetchAll();
    const ranked=await this.ranking.rank(profile,jobs,input.provider);
    const top=ranked.slice(0,input.topK??10);
    const kits=await Promise.all(top.slice(0,5).map(j=>this.kits.create(profile,j,input.provider)));
    
    // Generate intelligent opinions from the top results
    const { opinionService } = await import("./opinion.service.js");
    const opinions = await opinionService.generate(profile, ranked, input.provider);
    
    // Save to Appwrite Database
    console.log(`Saving ${top.length} jobs to Appwrite...`);
    await Promise.allSettled(top.map(job => 
      databases.createDocument(DATABASE_ID, JOBS_COLLECTION_ID, ID.unique(), {
        title: String(job.title).slice(0, 255),
        company: String(job.company).slice(0, 255),
        url: String(job.url).slice(0, 1000),
        status: 'saved',
        matchScore: typeof job.score === 'number' ? (job.score <= 1 ? Math.round(job.score * 100) : Math.round(job.score)) : 0,
        location: String(job.location || '').slice(0, 255),
        rationale: JSON.stringify({
          text: job.rationale,
          missing: job.missingRequirements,
          matching: job.matchingSkills
        }).slice(0, 5000)
      }).catch(err => console.error(`Failed to save job ${job.url} to Appwrite:`, err))
    ));

    return {profile,jobs:top,kits,opinions,providerUsed:input.provider};
  }

  /**
   * PHASE 6 — Auto-Apply coordination
   */
  async autoApply(input: { jobUrl: string; githubUsername: string; coverLetter?: string; provider?: ProviderName }) {
    const profile = await this.profiles.build({ githubUsername: input.githubUsername });
    const { applyService } = await import("./apply.service.js");
    
    let coverLetter = input.coverLetter;
    if (!coverLetter) {
        // Find the job details first to generate a good kit
        const jobs = await this.jobs.fetchAll();
        const target = jobs.find(j => j.url === input.jobUrl);
        if (target) {
            // We need a RankedJob to create a kit, so let's mock the ranking score
            const ranked: RankedJob = { ...target, score: 90, rationale: "Manual apply trigger", missingRequirements: [], matchingSkills: [] };
            const kit = await this.kits.create(profile, ranked, input.provider);
            coverLetter = kit.coverLetter;
        } else {
            coverLetter = "Professional application for the role at your company.";
        }
    }

    return await applyService.apply(profile, input.jobUrl, coverLetter);
  }
}
