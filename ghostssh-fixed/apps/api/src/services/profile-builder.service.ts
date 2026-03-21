import { z } from "zod";
import { withFallback } from "../providers/index.js";
import type { ProviderName } from "../types/provider.js";
import type { CandidateProfile, ProfileSkill } from "../types/profile.js";
import { GitHubService } from "./github.service.js";
import { LinkedInService } from "./linkedin.service.js";
import { profileNormalizePrompt } from "../prompts/profile-normalize.js";

const Schema = z.object({ summary:z.string(), skills:z.array(z.object({name:z.string(),confidence:z.number().min(0).max(1)})), targetTitles:z.array(z.string()), targetLocations:z.array(z.string()), highlights:z.array(z.string()) });
export type BuildProfileInput = { githubUsername?:string; linkedinText?:string; manualTargetTitles?:string[]; manualLocations?:string[]; provider?:ProviderName };

export class ProfileBuilderService {
  private gh=new GitHubService(); private li=new LinkedInService();
  async build(input: BuildProfileInput): Promise<CandidateProfile> {
    const repos = input.githubUsername ? await this.gh.getRepos(input.githubUsername) : [];
    const linkedinText = this.li.normalize(input.linkedinText);
    const raw = await withFallback(p=>p.generate({ system:profileNormalizePrompt.system, json:true, user:JSON.stringify({githubRepos:repos,linkedinText,manualTargetTitles:input.manualTargetTitles??[],manualLocations:input.manualLocations??[]},null,2) }), input.provider);
    const parsed = Schema.parse(JSON.parse(raw));
    const repoSkills: ProfileSkill[] = repos.map(r=>r.language).filter((v):v is string=>Boolean(v)).map(name=>({name,confidence:0.7,source:"github" as const}));
    const llmSkills: ProfileSkill[] = parsed.skills.map(s=>({...s,source:"manual" as const}));
    return { githubUsername:input.githubUsername, linkedinText, targetTitles:uniq([...(input.manualTargetTitles??[]),...parsed.targetTitles]), targetLocations:uniq([...(input.manualLocations??[]),...parsed.targetLocations]), skills:mergeSkills([...repoSkills,...llmSkills]), summary:parsed.summary, repos, highlights:parsed.highlights };
  }
}
function uniq(a:string[]){return[...new Set(a.filter(Boolean).map(v=>v.trim()))]}
function mergeSkills(skills:ProfileSkill[]){const m=new Map<string,ProfileSkill>();for(const s of skills){const k=s.name.toLowerCase();const e=m.get(k);if(!e||s.confidence>e.confidence)m.set(k,s);}return[...m.values()].sort((a,b)=>b.confidence-a.confidence);}
