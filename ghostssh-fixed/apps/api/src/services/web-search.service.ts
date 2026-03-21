/**
 * Web search service using Jina Search API (s.jina.ai/).
 * Free, no API key required, returns markdown results.
 */

const SEARCH_TIMEOUT_MS = 15_000;

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchService {
  /**
   * Search the web and return top results as structured data.
   */
  public async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    console.log(`[WebSearch] Searching: "${query}"`);
    try {
      const encoded = encodeURIComponent(query);
      const response = await fetch(`https://s.jina.ai/${encoded}`, {
        headers: {
          Accept: 'application/json',
          'X-Return-Format': 'json',
        },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.warn(`[WebSearch] Jina search returned ${response.status}, falling back to markdown parse`);
        return this.searchMarkdown(query, maxResults);
      }

      const data = await response.json() as any;

      // Jina returns { data: [{ title, url, description, content }] }
      const results: WebSearchResult[] = (data.data || [])
        .slice(0, maxResults)
        .map((item: any) => ({
          title: item.title || '',
          url: item.url || '',
          snippet: (item.description || item.content || '').slice(0, 300),
        }));

      console.log(`[WebSearch] Found ${results.length} results`);
      return results;
    } catch (err: any) {
      console.warn(`[WebSearch] JSON search failed: ${err.message}, trying markdown fallback`);
      return this.searchMarkdown(query, maxResults);
    }
  }

  /**
   * Fallback: get markdown search results and parse them manually.
   */
  private async searchMarkdown(query: string, maxResults: number): Promise<WebSearchResult[]> {
    try {
      const encoded = encodeURIComponent(query);
      const response = await fetch(`https://s.jina.ai/${encoded}`, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!response.ok) return [];

      const markdown = await response.text();
      return this.parseMarkdownResults(markdown, maxResults);
    } catch {
      return [];
    }
  }

  /**
   * Parse Jina markdown search output into structured results.
   * Format: "Title: ...\nURL: ...\nSnippet: ..." blocks
   */
  private parseMarkdownResults(markdown: string, maxResults: number): WebSearchResult[] {
    const results: WebSearchResult[] = [];
    // Split on URL patterns
    const urlRegex = /(?:URL|Source|Link):\s*(https?:\/\/[^\s\n]+)/gi;
    const titleRegex = /(?:Title|#)\s*:?\s*([^\n]+)/gi;

    const urls: string[] = [];
    const titles: string[] = [];

    let match;
    while ((match = urlRegex.exec(markdown)) !== null) { if (match[1]) urls.push(match[1]); }
    while ((match = titleRegex.exec(markdown)) !== null) { if (match[1]) titles.push(match[1].trim()); }

    for (let i = 0; i < Math.min(urls.length, maxResults); i++) {
      results.push({
        title: titles[i] || `Result ${i + 1}`,
        url: urls[i]!,
        snippet: '',
      });
    }

    return results;
  }

  /**
   * Convenience: search and scrape. Returns search results + scraped content of top URL.
   */
  public async searchAndScrape(query: string): Promise<{ results: WebSearchResult[]; topContent: string }> {
    const results = await this.search(query, 3);
    if (results.length === 0) return { results, topContent: '' };

    // Scrape the top result for detailed content
    const { jinaScraperService } = await import('./jina-scraper.service.js');
    const topUrl = results[0]?.url;
    if (!topUrl) return { results, topContent: '' };
    const scrapeResult = await jinaScraperService.scrapeWithResilience(topUrl);
    return { results, topContent: scrapeResult.success ? scrapeResult.content : '' };
  }
}

export const webSearchService = new WebSearchService();
