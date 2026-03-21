import type { JobPosting } from '../../types/job.js';
import { webSearchService } from '../web-search.service.js';
import { jinaScraperService } from '../jina-scraper.service.js';
import { withFallback } from '../../providers/index.js';

/**
 * Discovers jobs from company career pages via web search + Jina scraping.
 * Unlike board APIs (Greenhouse/Lever), this source works for ANY company.
 */
export class CareerPageSource {
  /**
   * Discover jobs for a specific company + target roles.
   */
  async fetch(company: string, targetRoles: string[] = []): Promise<JobPosting[]> {
    console.log(`[CareerPage] Searching career page for ${company}...`);

    // Step 1: Find the careers page
    const query = targetRoles.length > 0
      ? `${company} careers ${targetRoles[0]} jobs 2026`
      : `${company} careers page jobs`;

    const searchResults = await webSearchService.search(query, 5);

    // Find the best career page URL
    const careerUrl = searchResults.find(r =>
      /careers|jobs|positions|openings|hiring/i.test(r.url) ||
      /careers|jobs|join/i.test(r.title)
    );

    if (!careerUrl) {
      console.log(`[CareerPage] No career page found for ${company}`);
      return [];
    }

    console.log(`[CareerPage] Found: ${careerUrl.url}`);

    // Step 2: Scrape the career page
    const scraped = await jinaScraperService.scrapeWithResilience(careerUrl.url);
    if (!scraped.success || scraped.content.length < 100) {
      console.warn(`[CareerPage] Failed to scrape ${careerUrl.url}`);
      return [];
    }

    // Step 3: Extract job listings via LLM
    try {
      const jobs = await this.extractJobsWithLLM(company, scraped.content, careerUrl.url, targetRoles);
      console.log(`[CareerPage] Extracted ${jobs.length} jobs from ${company}`);
      return jobs;
    } catch (err: any) {
      console.warn(`[CareerPage] LLM extraction failed for ${company}: ${err.message}`);
      return [];
    }
  }

  /**
   * Use LLM to extract structured job postings from career page content.
   */
  private async extractJobsWithLLM(
    company: string,
    pageContent: string,
    sourceUrl: string,
    targetRoles: string[]
  ): Promise<JobPosting[]> {
    const truncated = pageContent.slice(0, 8000); // Limit context size

    const prompt = `Extract job listings from this career page for ${company}.
${targetRoles.length > 0 ? `Focus on roles related to: ${targetRoles.join(', ')}` : 'Extract all tech/engineering/AI roles.'}

Return a JSON array of objects with these fields:
- title: job title
- location: location or "Remote"
- url: URL if visible, otherwise "${sourceUrl}"
- description: brief description (1-2 sentences)

Career page content:
${truncated}

Return ONLY a JSON array, no explanation.`;

    const raw = await withFallback(p => p.generate({
      system: 'You extract structured data from web pages. Return ONLY valid JSON arrays.',
      user: prompt,
      json: true,
    }));

    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? parsed : (parsed.jobs || parsed.listings || []);

    return items
      .filter((j: any) => j.title)
      .map((j: any, i: number): JobPosting => ({
        id: `cp-${company.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        source: 'career-page',
        company,
        title: j.title,
        location: j.location || 'Unknown',
        remote: /remote/i.test(j.location || ''),
        url: j.url || sourceUrl,
        description: j.description || '',
        tags: ['career-page', company],
      }));
  }
}

export const careerPageSource = new CareerPageSource();
