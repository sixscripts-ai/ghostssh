import { chromium } from 'playwright';
import { Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';

// Hardcoded for MVP Worker
const MY_INFO = {
  firstName: 'Six',
  lastName: 'Scripts',
  email: 'sixscripts@example.com',
  github: 'https://github.com/sixscripts',
  linkedin: 'https://linkedin.com/in/sixscripts'
};

async function runWorker() {
  console.log('🤖 Starting Playwright Auto-Apply Worker...');
  
  // 1. Fetch pending jobs
  const response = await databases.listDocuments(DATABASE_ID, JOBS_COLLECTION_ID, [
    Query.equal('status', 'saved'),
    Query.limit(5)
  ]);
  
  const jobs = response.documents;
  console.log(`Found ${jobs.length} saved jobs to process.`);
  
  if (jobs.length === 0) return;

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  for (const job of jobs) {
    console.log(`\n📄 Attempting to apply for: ${job.title} at ${job.company}`);
    const page = await context.newPage();
    
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Generic simple form filler (Note: real world requires highly adaptive locators or LLM vision)
      // Try to find apply buttons
      const applyBtn = page.locator('a:has-text("Apply"), button:has-text("Apply")').first();
      if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Clicking Apply button...');
        await applyBtn.click();
        await page.waitForLoadState('domcontentloaded');
      }

      // Helper to try filling fields by Label or Placeholder
      const fillField = async (selector: RegExp, value: string) => {
        const input = page.getByLabel(selector).first();
        if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
          await input.fill(value);
          return true;
        } else {
          const inputPlaceholder = page.getByPlaceholder(selector).first();
          if (await inputPlaceholder.isVisible({ timeout: 1000 }).catch(() => false)) {
            await inputPlaceholder.fill(value);
            return true;
          }
        }
        return false;
      };

      await fillField(/First Name/i, MY_INFO.firstName);
      await fillField(/Last Name/i, MY_INFO.lastName);
      await fillField(/^Name|Full Name/i, `${MY_INFO.firstName} ${MY_INFO.lastName}`);
      await fillField(/Email/i, MY_INFO.email);
      await fillField(/GitHub/i, MY_INFO.github);
      await fillField(/LinkedIn/i, MY_INFO.linkedin);

      console.log(`✅ Filled available fields for ${job.company}`);
      await page.waitForTimeout(2000); // Wait a bit to observe
      
      // Update status in Appwrite
      await databases.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, job.$id, {
        status: 'applied'
      });
      console.log(`✅ Marked ${job.title} as applied in database.`);
      
    } catch (err) {
      console.error(`❌ Failed to apply for ${job.company}:`, (err as Error).message);
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  console.log('\n🏁 Worker finished processing batch.');
}

runWorker().catch(console.error);
