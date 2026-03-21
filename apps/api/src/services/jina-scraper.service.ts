/**
 * Service to scrape text content from arbitrary URLs using Jina AI's Reader API.
 */
export class JinaScraperService {
  /**
   * Scrapes an array of URLs concurrently and concatenates the resulting markdown.
   * Tolerates individual failures so a single broken link doesn't crash the pipeline.
   */
  public async scrapeUrls(urls: string[]): Promise<string> {
    if (!urls || urls.length === 0) return '';

    console.log(`[JinaScraper] Scraping ${urls.length} URLs...`);

    const promises = urls.map(async (url) => {
      try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const response = await fetch(jinaUrl, {
          headers: {
            'X-Return-Format': 'markdown'
          }
        });

        if (!response.ok) {
          console.warn(`[JinaScraper] Failed to scrape ${url}: ${response.status} ${response.statusText}`);
          return `\n\n--- Failed to scrape ${url} ---\n\n`;
        }

        const markdown = await response.text();
        return `\n\n--- Content from ${url} ---\n\n${markdown}\n\n`;
      } catch (err: any) {
        console.error(`[JinaScraper] Network error for ${url}:`, err.message);
        return `\n\n--- Network error for ${url} ---\n\n`;
      }
    });

    const results = await Promise.all(promises);
    return results.join('\n');
  }
}

export const jinaScraperService = new JinaScraperService();
