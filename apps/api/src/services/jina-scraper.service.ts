import { emitAgentEvent } from '../lib/event-bus.js';

/**
 * Resilient URL scraper using Jina AI Reader with retry + raw fetch fallback.
 * Never throws — always returns partial results with inline warnings.
 */

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const PER_URL_TIMEOUT_MS = 15_000;

interface ScrapeResult {
  url: string;
  content: string;
  success: boolean;
  method: 'jina' | 'raw-fetch' | 'failed';
  retries: number;
}

export class JinaScraperService {
  /**
   * Scrape multiple URLs concurrently with resilience.
   * Returns concatenated markdown. Individual failures produce inline warnings.
   */
  public async scrapeUrls(urls: string[]): Promise<string> {
    const start = Date.now();
    try {
      if (!urls || urls.length === 0) return '';
      console.log(`[JinaScraper] Scraping ${urls.length} URLs with retry + fallback...`);

      const results = await Promise.all(urls.map(url => this.scrapeWithResilience(url)));

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`[JinaScraper] Done: ${succeeded} succeeded, ${failed} failed`);

      await emitAgentEvent({ userId: "system", agent: "scout", action: "scrape_urls", status: "success", duration_ms: Date.now() - start, result_count: urls.length });

      return results
        .map(r => r.success
          ? `\n\n--- Content from ${r.url} (via ${r.method}) ---\n\n${r.content}\n\n`
          : `\n\n--- ⚠️ Failed to scrape ${r.url} after ${r.retries} retries ---\n\n`)
        .join('\n');
    } catch(e: any) {
      await emitAgentEvent({ userId: "system", agent: "scout", action: "scrape_urls", status: "error", duration_ms: Date.now() - start, error_message: e.message });
      throw e;
    }
  }

  /**
   * Scrape a single URL: Jina with retries → raw fetch fallback.
   */
  public async scrapeWithResilience(url: string): Promise<ScrapeResult> {
    // Attempt 1: Jina AI Reader with retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const content = await this.jinaFetch(url);
        if (content && content.length > 50) {
          return { url, content, success: true, method: 'jina', retries: attempt };
        }
      } catch (err: any) {
        console.warn(`[JinaScraper] Jina attempt ${attempt}/${MAX_RETRIES} failed for ${url}: ${err.message}`);
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
    }

    // Attempt 2: Raw fetch + HTML strip fallback
    try {
      console.log(`[JinaScraper] Falling back to raw fetch for ${url}`);
      const content = await this.rawFetch(url);
      if (content && content.length > 30) {
        return { url, content, success: true, method: 'raw-fetch', retries: MAX_RETRIES };
      }
    } catch (err: any) {
      console.warn(`[JinaScraper] Raw fallback also failed for ${url}: ${err.message}`);
    }

    emitAgentEvent({ userId: "system", agent: "scout", action: "scrape_url_failed", status: "error", duration_ms: 0, error_message: `Failed all attempts for ${url}` }).catch(() => {});

    return { url, content: '', success: false, method: 'failed', retries: MAX_RETRIES };
  }

  /** Fetch via Jina Reader API */
  private async jinaFetch(url: string): Promise<string> {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'X-Return-Format': 'markdown', Accept: 'text/plain' },
      signal: AbortSignal.timeout(PER_URL_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Jina ${response.status}: ${response.statusText}`);
    return response.text();
  }

  /** Direct fetch + strip HTML tags as last resort */
  private async rawFetch(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ghostssh/1.0 (job-search-agent)', Accept: 'text/html,text/plain' },
      signal: AbortSignal.timeout(PER_URL_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!response.ok) throw new Error(`Raw ${response.status}: ${response.statusText}`);
    const html = await response.text();
    return stripHtml(html);
  }
}

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50_000); // Cap to avoid blowing context
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const jinaScraperService = new JinaScraperService();
