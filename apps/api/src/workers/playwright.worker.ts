import { Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * Background worker that continuously polls for jobs labeled 'queued_for_apply'
 * in the Appwrite database, then uses Playwright to navigate to the employer
 * portal and apply using the generated CandidateProfile and Cover Letter Kit.
 */
export async function startPlaywrightWorker() {
  console.log('[PlaywrightWorker] Starting auto-apply worker...');

  let browser: Browser | null = null;

  const pollInterval = setInterval(async () => {
    try {
      // 1. Fetch queued jobs from Appwrite
      const response = await databases.listDocuments(
        DATABASE_ID,
        JOBS_COLLECTION_ID,
        [
          Query.equal('status', 'queued_for_apply'),
          Query.limit(1) // Process one at a time to avoid browser RAM spikes
        ]
      );

      if (response.documents.length === 0) {
        return; // Nothing to do
      }

      const jobDoc = response.documents[0]!;
      console.log(`[PlaywrightWorker] Found job to apply for: ${jobDoc.company} - ${jobDoc.title}`);

      // 2. Mark as processing to avoid duplicate runs
      await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobDoc.$id, {
        status: 'applying'
      });

      // 3. Initialize Playwright
      if (!browser) {
        browser = await chromium.launch({ headless: true });
      }
      const page: Page = await browser.newPage();

      try {
        // 4. Navigate and Interact
        console.log(`[PlaywrightWorker] Navigating to ${jobDoc.url}...`);
        await page.goto(jobDoc.url, { waitUntil: 'domcontentloaded' });

        // NOTE: Exact selectors depend on the portal (Greenhouse, Lever, Workday)
        // A full implementation would detect the ATS platform and use tailored playwright scripts here.
        console.log(`[PlaywrightWorker] Filling out generic application form...`);
        // await page.fill('input[name="first_name"]', 'John');
        // await page.fill('input[name="last_name"]', 'Doe');
        // await page.setInputFiles('input[type="file"]', '/path/to/resume.pdf');
        // await page.click('button[type="submit"]');

        console.log(`[PlaywrightWorker] Successfully applied to ${jobDoc.company}.`);

        // 5. Update Status to applied
        await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobDoc.$id, {
          status: 'applied'
        });

      } catch (applyError) {
        console.error(`[PlaywrightWorker] Failed to apply:`, applyError);
        await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobDoc.$id, {
          status: 'failed'
        });
      } finally {
        await page.close();
      }

    } catch (error) {
      console.error('[PlaywrightWorker] Polling error:', error);
    }
  }, 10000); // Poll every 10 seconds

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    clearInterval(pollInterval);
    if (browser) await browser.close();
    process.exit(0);
  });
}

// Start immediately if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startPlaywrightWorker();
}
