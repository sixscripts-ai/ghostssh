import type { ProviderName } from "../types/provider.js";
import type { ApplicationKit, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import { ApplicationKitService } from "./application-kit.service.js";
import { JobAggregatorService } from "./jobs/aggregator.service.js";
import { ProfileBuilderService, type BuildProfileInput } from "./profile-builder.service.js";
import { RankingService } from "./ranking.service.js";

export type AgentSearchInput = BuildProfileInput & { topK?:number };
export type AgentSearchResult = { profile:CandidateProfile; jobs:RankedJob[]; kits:ApplicationKit[]; providerUsed?:ProviderName };

export class AgentService {
  private profiles=new ProfileBuilderService(); private jobs=new JobAggregatorService();
  private ranking=new RankingService(); private kits=new ApplicationKitService();
  async search(input:AgentSearchInput): Promise<AgentSearchResult> {
    const profile=await this.profiles.build(input);
    const jobs=await this.jobs.fetchAll();
    const ranked=await this.ranking.rank(profile,jobs,input.provider);
    const top=ranked.slice(0,input.topK??10);
    const kits=await Promise.all(top.slice(0,5).map(j=>this.kits.create(profile,j,input.provider)));
    return {profile,jobs:top,kits,providerUsed:input.provider};
  }
}
