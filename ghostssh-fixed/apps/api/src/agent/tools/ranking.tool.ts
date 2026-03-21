import { z } from "zod";
import type { CandidateProfile } from "../../types/profile.js";
import type { RankedJob, JobPosting } from "../../types/job.js";
import { RankingService } from "../../services/ranking.service.js";

/**
 * Defines the Ranking Tool interface for the LLM.
 */
export const rankJobsToolDefinition = {
  name: "rank_jobs_tool",
  description: "Ranks a list of jobs against a specified candidate profile using AI analysis.",
  parameters: z.object({
    jobIds: z.array(z.string()).describe("List of job identifiers the tool should process"),
    candidateProfileId: z.string().describe("The ID of the candidate profile in the database")
  })
};

/**
 * Executes the Tool
 */
export async function executeRankJobsTool(
  args: z.infer<typeof rankJobsToolDefinition.parameters>,
  rankingService: RankingService,
  profile: CandidateProfile,
  jobs: JobPosting[]
) {
  console.log(`[Tools] Executing rank_jobs_tool for profile ${args.candidateProfileId}...`);
  // In a real DB-backed iteration, fetch jobs by ID, but using passed array here
  const ranked = await rankingService.rank(profile, jobs, 'minimax');
  return {
    success: true,
    rankedJobsCount: ranked.length,
    topMatch: ranked[0]
  };
}
