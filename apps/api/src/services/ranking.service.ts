import { agentMemoryService } from '../agent/memory.service.js';
import { GitHubService } from "./github.service.js";
import { z } from "zod";
import type { JobPosting, RankedJob } from "../types/job.js";
import type { CandidateProfile } from "../types/profile.js";
import type { ProviderName } from "../types/provider.js";
import { withFallback } from "../providers/index.js";
import { jobRankPrompt } from "../prompts/job-rank.js";
import { safeParseJson } from "../lib/safe-parse-json.js";
import { emitAgentEvent } from "../lib/event-bus.js";
import { hiringSignalService } from "./hiring-signal.service.js";

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
    const start = Date.now();
    try {
      const prefSummary = await agentMemoryService.getPreferenceSummary(
        profile.githubUsername || "anonymous"
      ).catch(() => "");
      const filtered = jobs.filter(j =>
        /(ai|ml|machine.learning|llm|agent|python|backend|platform|infra|data|research)/i
          .test(`${j.title} ${j.description} ${j.tags.join(" ")}`)
      );

      if (filtered.length === 0) return [];

      console.log(`[Ranking] ${filtered.length} jobs after filter → batching into groups of ${BATCH_SIZE}`);

      // Batch into groups of 25
      const batches = chunk(filtered, BATCH_SIZE);
      console.log(`[Ranking] Running ${batches.length} batch(es) in parallel...`);

      // Rank each batch max 3 concurrently
      const batchResults: import("../types/job.js").RankedJob[][] = [];
      for (let i = 0; i < batches.length; i += 3) {
        const chunkBatches = batches.slice(i, i + 3);
        const results = await Promise.allSettled(chunkBatches.map((b, idx) => 
          this.rankBatch(profile, b, provider, i + idx + 1, batches.length)
        ));
        for (const res of results) {
          if (res.status === 'fulfilled') batchResults.push(res.value);
        }
      }

      // Merge all results and re-sort by score
            const merged = batchResults.flat().sort((a, b) => b.score - a.score);

      const enhanced = await Promise.allSettled(
        merged.slice(0, 20).map(async (job) => {
          const signal = await hiringSignalService.score(job.company, job.title)
            .catch(() => ({ urgencyScore: 0, signals: [] }));
          return {
            ...job,
            score: Math.round((job.score * 0.6) + (signal.urgencyScore * 0.4)),
            tags: [...job.tags, ...signal.signals]
          };
        })
      );

      const boosted = enhanced
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);
      
      const rest = merged.slice(20);
      const finalRanked = [...boosted, ...rest].sort((a, b) => b.score - a.score);

      const github = new GitHubService();
      if (profile.githubUsername) {
        for (let i = 0; i < Math.min(10, finalRanked.length); i++) {
          const job = finalRanked[i];
          const connections = await github.getNetworkOverlap(
            profile.githubUsername, job.company
          ).catch(() => []);
          job.networkConnections = connections;
          if (connections.length > 0) {
            job.score = Math.min(job.score + 15, 100);
            job.tags = [...job.tags, `network_overlap_${connections.length}`];
          }
        }
        // re-sort after score adjustments
        finalRanked.sort((a, b) => b.score - a.score);
      }

      console.log(`[Ranking] Merged ${finalRanked.length} ranked jobs. Top: ${finalRanked[0]?.title ?? 'none'} (${finalRanked[0]?.score ?? 0})`);
      await emitAgentEvent({ userId: "system", agent: "ranker", action: "rank_jobs", status: "success", duration_ms: Date.now() - start, result_count: finalRanked.length });

      return finalRanked;
    } catch(e: any) {
      await emitAgentEvent({ userId: "system", agent: "ranker", action: "rank_jobs", status: "error", duration_ms: Date.now() - start, error_message: e.message });
      throw e;
    }
  }

  /**
   * Rank a single batch of jobs (max 25).
   */
  private async rankBatch(
    profile: CandidateProfile,
    batch: JobPosting[],
    provider: ProviderName | undefined,
    batchNum: number,
    totalBatches: number,
    prefSummary: string = ""
  ): Promise<RankedJob[]> {
    try {
      console.log(`[Ranking] Batch ${batchNum}/${totalBatches}: ${batch.length} jobs`);

      const raw = await withFallback(llm => llm.generate({
        system: jobRankPrompt.system + (prefSummary ? "\n\nUser preference summary (inject into ranking decisions):\n" + prefSummary : ""),
        json: true,
        maxOutputTokens: 4000,
        user: JSON.stringify({
          profile: {
             ...profile,
             preferenceSummary: prefSummary || undefined
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
