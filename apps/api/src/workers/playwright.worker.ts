import { chromium, type Browser, type Page } from 'playwright';
import { env } from '../config/env.js';
import { emitAgentEvent } from '../lib/event-bus.js';

export class PlaywrightWorker {
  
  public async humanDelay(min = 300, max = 1200): Promise<void> {
    await new Promise(r => setTimeout(r, Math.random() * (max - min) + min));
  }

  public async verifyJobListing(page: Page): Promise<boolean> {
    try {
      const buf = await page.screenshot();
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 10,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: buf.toString('base64')
                }
              },
              {
                type: 'text',
                text: 'Is this an active job listing page? Answer only: YES or NO'
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      return text.includes('YES');
    } catch (e) {
      console.error('[Vision] Verification failed:', e);
      return true; // fail open
    }
  }

  public async saveScreenshotProof(page: Page, jobUrl: string): Promise<string> {
    const filename = `/tmp/apply-proof-${Date.now()}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    return filename;
  }

  public async apply(jobUrl: string, profile: any, userId = 'anonymous'): Promise<any> {
    let browser: Browser | null = null;
    const startObj = Date.now();
    let screenshotPath = '';

    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        viewport: {
          width: Math.floor(Math.random() * (1920 - 1280) + 1280),
          height: Math.floor(Math.random() * (1080 - 800) + 800)
        },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
      const page = await context.newPage();

      await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
      await this.humanDelay(1000, 2000);

      const isActive = await this.verifyJobListing(page);
      if (!isActive) {
        return { success: false, reason: "vision_check_failed" };
      }

      await this.humanDelay();

      const fieldMap: Record<string, string[]> = {
        name: ['[name*="name"]', '[placeholder*="name"]', '[aria-label*="name"]'],
        email: ['[name*="email"]', '[type="email"]', '[placeholder*="email"]'],
        phone: ['[name*="phone"]', '[type="tel"]', '[placeholder*="phone"]'],
        linkedin: ['[name*="linkedin"]', '[placeholder*="linkedin"]']
      };

      for (const [field, selectors] of Object.entries(fieldMap)) {
        for (const selector of selectors) {
          const el = await page.$(selector);
          if (el) {
            await page.click(selector);
            await this.humanDelay();
            await page.fill(selector, profile[field] || 'test');
            await this.humanDelay();
            break;
          }
        }
      }

      screenshotPath = await this.saveScreenshotProof(page, jobUrl);

      void emitAgentEvent({
        userId,
        agent: "applier",
        action: "job_application",
        status: "success",
        duration_ms: Date.now() - startObj,
        metadata: { jobUrl, screenshotPath }
      });

      return { success: true, screenshotPath };

    } catch (e: any) {
      console.error(`[PlaywrightWorker] Failed to apply:`, e);

      void emitAgentEvent({
        userId,
        agent: "applier",
        action: "job_application",
        status: "error",
        duration_ms: Date.now() - startObj,
        metadata: { jobUrl, screenshotPath }
      });

      return { success: false, error: e.message };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

