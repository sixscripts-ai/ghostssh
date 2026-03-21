import { z } from "zod";
import type { ApplicationKit, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { coverLetterPrompt } from "../prompts/cover-letter.js";
import { safeParseJson } from "../lib/safe-parse-json.js";

const Schema=z.object({fitSummary:z.string(),recruiterPitch:z.string(),coverLetter:z.string()});
export class ApplicationKitService {
  async create(profile:CandidateProfile,job:RankedJob,provider?:ProviderName): Promise<ApplicationKit> {
    const raw=await withFallback(llm=>llm.generate({system:coverLetterPrompt.system,json:true,maxOutputTokens:1500,user:JSON.stringify({profile,job},null,2)}),provider);
    return {title:job.title,company:job.company,url:job.url,...Schema.parse(safeParseJson(raw))};
  }
}
