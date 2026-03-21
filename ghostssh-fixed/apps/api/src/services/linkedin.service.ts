import { webSearchService } from './web-search.service.js';
import { jinaScraperService } from './jina-scraper.service.js';

/**
 * LinkedIn service with auto-discovery.
 * Given a GitHub username, searches the web for the user's LinkedIn profile
 * and scrapes it via Jina to extract profile text.
 */
export class LinkedInService {
  /**
   * Auto-discover a user's LinkedIn profile from their GitHub username.
   * Returns scraped LinkedIn markdown text, or empty string if not found.
   */
  async discover(githubUsername: string): Promise<string> {
    console.log(`[LinkedIn] Auto-discovering LinkedIn for ${githubUsername}...`);

    // Search strategies: try multiple queries
    const queries = [
      `${githubUsername} site:linkedin.com/in`,
      `"${githubUsername}" linkedin`,
      `${githubUsername} software engineer linkedin`,
    ];

    for (const query of queries) {
      const results = await webSearchService.search(query, 3);
      const linkedinResult = results.find(r =>
        r.url.includes('linkedin.com/in/') && !r.url.includes('/posts/')
      );

      if (linkedinResult) {
        console.log(`[LinkedIn] Found profile: ${linkedinResult.url}`);
        const scraped = await jinaScraperService.scrapeWithResilience(linkedinResult.url);
        if (scraped.success && scraped.content.length > 100) {
          console.log(`[LinkedIn] Scraped ${scraped.content.length} chars from ${linkedinResult.url}`);
          return scraped.content;
        }
        console.warn(`[LinkedIn] Found URL but scrape yielded too little content`);
      }
    }

    console.log(`[LinkedIn] No LinkedIn profile found for ${githubUsername}`);
    return '';
  }

  /** Normalize manually pasted LinkedIn text (legacy compat) */
  normalize(raw?: string): string {
    return raw ? raw.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim() : '';
  }
}

export const linkedInService = new LinkedInService();
