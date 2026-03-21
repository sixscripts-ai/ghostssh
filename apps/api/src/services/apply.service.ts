import { chromium, type Browser, type Page } from "playwright";
import { withFallback } from "../providers/index.js";
import type { CandidateProfile } from "../types/profile.js";
import { agentMemoryService } from "../agent/memory.service.js";

export type ApplicationResult = {
  success: boolean;
  screenshotPath?: string;
  error?: string;
  message: string;
};

/**
 * PHASE 6 — Playwright Auto-Apply
 * Automates job applications using a Perception-Reasoning-Action loop.
 */
export class ApplyService {
  /**
   * Attempts to apply for a job automatically.
   */
  async apply(profile: CandidateProfile, jobUrl: string, coverLetter: string): Promise<ApplicationResult> {
    console.log(`[ApplyService] 🤖 Starting auto-apply for: ${jobUrl}`);
    
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(jobUrl, { waitUntil: 'networkidle' });
      
      // Step 1: Perception — Analyze the page
      const pageContent = await page.content();
      const screenshot = await page.screenshot({ fullPage: false });
      
      // Step 2: Reasoning — Ask LLM for form selectors
      const selectors = await this.identifyFormSelectors(pageContent, profile);
      
      if (!selectors) {
        throw new Error("Could not identify form fields on this page.");
      }

      // Step 3: Action — Fill the form
      await this.fillForm(page, profile, selectors, coverLetter);
      
      // Step 4: Submission
      // Check for a submit button and click it
      // For now, let's just log and take a final "proof" screenshot
      const proofScreenshot = await page.screenshot({ fullPage: true });
      const proofPath = `/tmp/apply-proof-${Date.now()}.png`;
      // In a real scenario, we'd save this to a persistent store
      
      await agentMemoryService.addMemory(
        profile.githubUsername || "unknown",
        `AUTO-APPLY: Attempted application for ${jobUrl}. Success: true (Logged for manual verification).`,
        'application'
      );

      return {
        success: true,
        message: "Application fields identified and filled. Final submission pending user approval (Manual for now).",
        screenshotPath: proofPath
      };

    } catch (err: any) {
      console.error("[ApplyService] Application failed:", err.message);
      return { success: false, error: err.message, message: "Application failed." };
    } finally {
      await browser.close();
    }
  }

  private async identifyFormSelectors(html: string, profile: CandidateProfile) {
    // LLM logic to find selectors...
    // To be implemented with robust vision/DOM analysis
    return {
      name: "input[name*='name']",
      email: "input[name*='email']",
      resume: "input[type='file']",
      coverLetter: "textarea[name*='cover']"
    };
  }

  private async fillForm(page: Page, profile: CandidateProfile, selectors: any, coverLetter: string) {
    if (selectors.name) await page.fill(selectors.name, profile.githubUsername || "Candidate");
    if (selectors.email) await page.fill(selectors.email, "candidate@example.com");
    if (selectors.coverLetter) await page.fill(selectors.coverLetter, coverLetter);
    // Resume upload would go here
  }
}

export const applyService = new ApplyService();
