import { z } from "zod";
import type { JobPosting, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { jobRankPrompt } from "../prompts/job-rank.js";

const Schema = z.object({ ranked:z.array(z.object({jobId:z.string(),score:z.number().min(0).max(100),rationale:z.string(),matchingSkills:z.array(z.string()),missingRequirements:z.array(z.string())})) });

export class RankingService {
  async rank(profile:CandidateProfile,jobs:JobPosting[],provider?:ProviderName): Promise<RankedJob[]> {
    const filtered=jobs.filter(j=>/(ai|ml|machine.learning|llm|agent|python|backend|platform|infra|data|research)/i.test(`${j.title} ${j.description} ${j.tags.join(" ")}`));
    const raw=await withFallback(llm=>llm.generate({system:jobRankPrompt.system,json:true,maxOutputTokens:4000,user:JSON.stringify({profile,jobs:filtered.slice(0,120).map(j=>({id:j.id,company:j.company,title:j.title,location:j.location,remote:j.remote,tags:j.tags,description:j.description.slice(0,3000)}))},null,2)}),provider);
    const parsed=Schema.parse(JSON.parse(raw));
    const map=new Map(parsed.ranked.map(r=>[r.jobId,r]));
    return filtered.map<RankedJob|null>(j=>{const r=map.get(j.id);return r?{...j,...r}:null;}).filter((j):j is RankedJob=>Boolean(j)).sort((a,b)=>b.score-a.score);
  }
}
