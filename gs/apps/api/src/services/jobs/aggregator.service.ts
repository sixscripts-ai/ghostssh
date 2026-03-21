import type { JobPosting } from "../../types/job.js";
import { GreenhouseSource } from "./greenhouse.source.js";
import { LeverSource } from "./lever.source.js";
import { RemotiveSource } from "./remotive.source.js";
import { CareerPageSource } from "./career-page.source.js";

export class JobAggregatorService {
  private g = new GreenhouseSource();
  private l = new LeverSource();
  private r = new RemotiveSource();
  private cp = new CareerPageSource();

  /**
   * Fetch from all board APIs (Greenhouse, Lever, Remotive).
   * Original behavior — broad sweep.
   */
  async fetchAll(): Promise<JobPosting[]> {
    const [a, b, c] = await Promise.all([this.g.fetch(), this.l.fetch(), this.r.fetch()]);
    return this.dedup([...a, ...b, ...c]);
  }

  /**
   * Targeted fetch: board APIs + career page scraping for specific companies.
   * Used when the agent knows which companies to investigate.
   */
  async fetchTargeted(targetCompanies: string[], targetRoles: string[] = []): Promise<JobPosting[]> {
    console.log(`[Aggregator] Targeted fetch for ${targetCompanies.length} companies + boards...`);

    // Run board APIs + targeted career page scraping in parallel
    const boardPromise = this.fetchAll();
    const careerPromises = targetCompanies.map(company =>
      this.cp.fetch(company, targetRoles).catch(() => [] as JobPosting[])
    );

    const [boardJobs, ...careerJobArrays] = await Promise.all([boardPromise, ...careerPromises]);
    const careerJobs = careerJobArrays.flat();

    console.log(`[Aggregator] Board: ${boardJobs.length} jobs, Career pages: ${careerJobs.length} jobs`);
    return this.dedup([...boardJobs, ...careerJobs]);
  }

  private dedup(jobs: JobPosting[]): JobPosting[] {
    const seen = new Set<string>();
    return jobs.filter(j => {
      const k = `${j.company}|${j.title}`.toLowerCase();
      return seen.has(k) ? false : (seen.add(k), true);
    });
  }
}
