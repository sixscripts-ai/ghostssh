import { z } from "zod";
import type { JobPosting, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { jobRankPrompt } from "../prompts/job-rank.js";
import { safeParseJson } from "../lib/safe-parse-json.js";

const BATCH_SIZE = 25;

const Schema = z.object({
  ranked: z.array(z.object({
    jobId: z.string(),
    score: z.number().min(0).max(100),
    rationale: z.string(),
    matchingSkills: z.array(z.string()),
    missingRequirements: z.array(z.string()),
  }))
});

export class RankingService {
  /**
   * Rank jobs against a candidate profile.
   * Batches jobs in groups of 25 to avoid token bombs.
   * Runs batches in parallel, merges results, re-sorts by score.
   */
  async rank(profile: CandidateProfile, jobs: JobPosting[], provider?: ProviderName): Promise<RankedJob[]> {
    const filtered = jobs.filter(j =>
      /(ai|ml|machine.learning|llm|agent|python|backend|platform|infra|data|research)/i
        .test(`${j.title} ${j.description} ${j.tags.join(" ")}`)
    );

    if (filtered.length === 0) return [];

    console.log(`[Ranking] ${filtered.length} jobs after filter → batching into groups of ${BATCH_SIZE}`);

    // Batch into groups of 25
    const batches = chunk(filtered, BATCH_SIZE);
    console.log(`[Ranking] Running ${batches.length} batch(es) in parallel...`);

    // Rank each batch in parallel
    const batchResults = await Promise.all(
      batches.map((batch, i) => this.rankBatch(profile, batch, provider, i + 1, batches.length))
    );

    // Merge all results and re-sort by score
    const merged = batchResults.flat().sort((a, b) => b.score - a.score);
    console.log(`[Ranking] Merged ${merged.length} ranked jobs. Top: ${merged[0]?.title ?? 'none'} (${merged[0]?.score ?? 0})`);

    return merged;
  }

  /**
   * Rank a single batch of jobs (max 25).
   */
  private async rankBatch(
    profile: CandidateProfile,
    batch: JobPosting[],
    provider: ProviderName | undefined,
    batchNum: number,
    totalBatches: number
  ): Promise<RankedJob[]> {
    try {
      console.log(`[Ranking] Batch ${batchNum}/${totalBatches}: ${batch.length} jobs`);

      const raw = await withFallback(llm => llm.generate({
        system: jobRankPrompt.system,
        json: true,
        maxOutputTokens: 4000,
        user: JSON.stringify({
          profile,
          jobs: batch.map(j => ({
            id: j.id,
            company: j.company,
            title: j.title,
            location: j.location,
            remote: j.remote,
            tags: j.tags,
            description: j.description.slice(0, 3000),
          })),
        }, null, 2),
      }), provider);

      const parsed = Schema.parse(safeParseJson(raw));
      const map = new Map(parsed.ranked.map(r => [r.jobId, r]));

      return batch
        .map<RankedJob | null>(j => {
          const r = map.get(j.id);
          return r ? { ...j, ...r } : null;
        })
        .filter((j): j is RankedJob => Boolean(j));
    } catch (err: any) {
      console.error(`[Ranking] Batch ${batchNum} failed: ${err.message}`);
      return []; // Don't crash the whole ranking — skip failed batch
    }
  }
}

/** Split an array into chunks of a given size */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
