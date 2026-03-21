import { z } from "zod";
import type { RankedJob, OpinionPick } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { safeParseJson } from "../lib/safe-parse-json.js";

const Schema = z.object({
  opinions: z.array(z.object({
    type: z.enum(["apply_today", "watch_this", "cold_outreach"]),
    company: z.string(),
    role: z.string(),
    score: z.number().min(0).max(100),
    rationale: z.string(),
    url: z.string().optional(),
    recruiterNote: z.string().optional(),
    bestTimeToApply: z.string().optional(),
    confidenceScore: z.number().min(0).max(100).optional()
  }))
});

export class OpinionService {
  /**
   * Acts as an intelligent agent reviewing the top 20 ranked jobs to provide 3 distinct picks.
   */
  async generate(profile: CandidateProfile, rankedJobs: RankedJob[], provider?: ProviderName): Promise<OpinionPick[]> {
    if (rankedJobs.length === 0) return [];
    
    // Only send the top 20 jobs to save tokens, as picks should come from the best matches
    const topJobs = rankedJobs.slice(0, 20);

    const system = `You are an expert career strategist reviewing automated job matches.
Your job is to look at a list of ranked jobs and provide exactly 3 strategic picks:

1. "apply_today": The absolute best fit to apply to immediately. Must have a high score and be an active role.
2. "watch_this": A strong company growing fast, but maybe the specific role isn't a 100% perfect fit. Suggest waiting or watching.
3. "cold_outreach": A great fit company where the user should reach out directly even if the role isn't perfectly aligned, or to get ahead of the curve.

Return JSON matching: { "opinions": [{ "type": "apply_today|watch_this|cold_outreach", "company": "...", "role": "...", "score": 95, "rationale": "2 sentences explaining why.", "url": "...", "recruiterNote": "one sentence on how to approach — direct apply, cold email, referral", "bestTimeToApply": "specific timing advice", "confidenceScore": 90 }] }
Do not return more than 3 picks. Make sure the type matches exactly.`;

    const user = JSON.stringify({
      profile: {
        skills: profile.skills.slice(0, 15),
        summary: profile.summary,
        targetTitles: profile.targetTitles
      },
      jobs: topJobs.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        score: j.score,
        rationale: j.rationale,
        url: j.url
      }))
    }, null, 2);

    try {
      const raw = await withFallback(llm => llm.generate({
        system,
        json: true,
        maxOutputTokens: 1000,
        user
      }), provider);

      const parsed = Schema.parse(safeParseJson(raw));
      return parsed.opinions;
    } catch (err: any) {
      console.error("[OpinionEngine] Failed to generate opinions:", err.message);
      return [];
    }
  }
}

export const opinionService = new OpinionService();
