import { WebSearchService } from "./web-search.service.js";
import { JinaScraperService } from "./jina-scraper.service.js";
import { withFallback } from "../providers/index.js";
import type { CandidateProfile } from "../types/profile.js";

export type GrowthCompany = {
  name: string;
  reason: string;
  score: number;
  url: string;
  contactPerson?: string;
};

/**
 * PHASE 4 — Outreach Agent
 * Identifies high-growth companies without active roles and drafts cold outreach.
 */
export class OutreachService {
  private search = new WebSearchService();
  private scraper = new JinaScraperService();

  /**
   * Identifies "growth" companies based on news, blog posts, and recent events.
   */
  async discoverGrowthCompanies(profile: CandidateProfile): Promise<GrowthCompany[]> {
    console.log(`[Outreach] 🔍 Discovering growth companies for titles: ${profile.targetTitles.join(", ")}`);
    
    const query = `AI companies hiring "AI Engineer" or "ML Engineer" recent funding news or "we're growing" blog posts`;
    const searchResults = await this.search.search(query);
    
    const results: GrowthCompany[] = [];
    
    const prompt = `Identify companies from these search results that exhibit strong growth signals (funding, team expansion, new product launch) but might not have immediate job postings for: ${profile.targetTitles.join(", ")}.

SEARCH RESULTS:
${JSON.stringify(searchResults)}

Return a JSON array of objects:
{ "name": string, "reason": string, "score": number (0-100), "url": string, "contactPerson": string | null }`;

    try {
      const completion = await withFallback(llm => llm.generate({
        system: "You are a growth scout. Identify high-potential companies for cold outreach.",
        user: prompt,
        json: true
      }));

      const discovered = JSON.parse(completion);
      return discovered.map((d: any) => ({
        ...d,
        score: d.score || 70
      })).filter((d: any) => d.score > 75);
    } catch (err: any) {
      console.error("[Outreach] Discovery failed:", err.message);
      return [];
    }
  }

  /**
   * Drafts a cold outreach message (recruiter pitch) for a growth company.
   */
  async draftOutreach(profile: CandidateProfile, company: GrowthCompany): Promise<string> {
    const prompt = `Draft a compelling cold outreach email to ${company.name}.
Context: ${company.reason}.
Candidate Profile: ${profile.summary}.
Skills: ${profile.skills.map(s => s.name).join(", ")}.

Goal: Secure a quick chat about potential future roles. Keep it short, elite, and value-driven.`;

    try {
      return await withFallback(llm => llm.generate({
        system: "You are a top-tier executive recruiter drafting a high-conversion pitch.",
        user: prompt
      }));
    } catch (err: any) {
      console.error("[Outreach] Drafting failed:", err.message);
      return "Failed to draft outreach.";
    }
  }
}

export const outreachService = new OutreachService();
