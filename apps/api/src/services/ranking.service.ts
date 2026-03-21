import { z } from "zod";
import type { JobPosting, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { jobRankPrompt } from "../prompts/job-rank.js";
import { safeParseJson } from "../lib/safe-parse-json.js";

import { agentMemoryService } from "../agent/memory.service.js";

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
   * Rank jobs against a candidate profile + mem0 memories.
   * Batches jobs in groups of 25 to avoid token bombs.
   */
  async rank(profile: CandidateProfile, jobs: JobPosting[], provider?: ProviderName): Promise<RankedJob[]> {
    const filtered = jobs.filter(j =>
      /(ai|ml|machine.learning|llm|agent|python|backend|platform|infra|data|research)/i
        .test(`${j.title} ${j.description} ${j.tags.join(" ")}`)
    );

    if (filtered.length === 0) return [];

    // PHASE 2.2 — Fetch memory-augmented context
    const userId = profile.githubUsername || "unknown";
    console.log(`[Ranking] Fetching mem0 context for ${userId}...`);
    const memContext = await agentMemoryService.getHistoricalContext(
      userId,
      `target titles: ${profile.targetTitles.join(", ")}`
    );

    console.log(`[Ranking] ${filtered.length} jobs → batching into groups of ${BATCH_SIZE}`);
    const batches = chunk(filtered, BATCH_SIZE);

    const batchResults = await Promise.all(
      batches.map((batch, i) => this.rankBatch(profile, batch, memContext.semanticPreferences, provider, i + 1, batches.length))
    );

    const merged = batchResults.flat().sort((a, b) => b.score - a.score);
    
    // PHASE 3.1 — Record summary to memory
    const topMatch = merged[0];
    if (topMatch && profile.githubUsername) {
      await agentMemoryService.recordRankingResult(
        profile.githubUsername,
        topMatch.title,
        topMatch.company,
        topMatch.score,
        merged.length
      );
    }

    return merged;
  }

  /**
   * Rank a single batch of jobs (max 25) with injected memories.
   */
  private async rankBatch(
    profile: CandidateProfile,
    batch: JobPosting[],
    memories: string,
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
          profile: {
            ...profile,
            learnedPreferences: memories // PHASE 2.2 — Inject memories
          },
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
