import { webSearchService } from './web-search.service.js';

/**
 * Detects hiring signals for a specific company + role.
 * Searches the web for evidence that a company is actively hiring
 * and returns a score + individual signals.
 */

export interface HiringSignal {
  source: string;
  text: string;
  weight: number; // 0-1 contribution to final score
}

export interface HiringSignalResult {
  company: string;
  role: string;
  score: number; // 0-100 — how actively is this company hiring?
  signals: HiringSignal[];
  searchedAt: string;
}

/**
 * PHASE 1.3 — Hiring Intent Scoring
 * - Job posted < 7 days ago → +40
 * - Company headcount growing → +20
 * - Multiple open roles for same team → +15
 * - Referral network overlap (GitHub mutuals) → +25 (Placeholder for now)
 */
const SCORING_RULES = [
  { regex: /posted (less than |under |< )?7 days ago|just posted|recently posted/i, label: 'Recent Posting (<7d)', weight: 40 },
  { regex: /headcount growing|scaling up|rapidly expanding|hiring spree/i, label: 'Growth Signal', weight: 20 },
  { regex: /multiple (openings|positions)|hiring for (several|multiple) roles/i, label: 'High Team Intent', weight: 15 },
  { regex: /hiring|we are hiring|join our team/i, label: 'General Hiring', weight: 10 },
];

export class HiringSignalService {
  /**
   * Detect hiring intent for a company + role combination.
   * Uses Phase 1.3 weighting: Recent (<7d) +40, Growth +20, etc.
   */
  async detectSignals(company: string, role: string): Promise<HiringSignalResult> {
    console.log(`[HiringSignal] Detecting intent for ${company} × ${role}...`);

    const queries = [
      `"${company}" hiring "${role}" posted last 7 days`,
      `"${company}" headcount growth 2026`,
      `"${company}" multiple openings for ${role}`,
    ];

    const allSignals: HiringSignal[] = [];
    const seenLabels = new Set<string>();

    for (const query of queries) {
      const results = await webSearchService.search(query, 3);

      for (const result of results) {
        const combinedText = `${result.title} ${result.snippet}`;

        for (const rule of SCORING_RULES) {
          if (rule.regex.test(combinedText) && !seenLabels.has(rule.label)) {
            seenLabels.add(rule.label);
            allSignals.push({
              source: result.url,
              text: `${rule.label}: "${result.title.slice(0, 80)}"`,
              weight: rule.weight,
            });
          }
        }
      }
    }

    // Calculate composite score (0-100)
    const urgencyScore = allSignals.reduce((sum, s) => sum + s.weight, 0);
    // Placeholder for GitHub referral network (+25)
    const referralBonus = 0; 
    
    const finalScore = Math.min(100, urgencyScore + referralBonus);

    console.log(`[HiringSignal] ${company} × ${role}: Urgency Score ${finalScore}/100 [${allSignals.length} signals]`);

    return {
      company,
      role,
      score: finalScore,
      signals: allSignals,
      searchedAt: new Date().toISOString(),
    };
  }

  /**
   * Batch detect signals for multiple company × role combos.
   */
  async detectBatch(
    companies: string[],
    roles: string[]
  ): Promise<HiringSignalResult[]> {
    const pairs = companies.flatMap(c => roles.map(r => ({ company: c, role: r })));
    // Limit to 10 pairs to avoid rate limiting
    const limited = pairs.slice(0, 10);
    return Promise.all(limited.map(p => this.detectSignals(p.company, p.role)));
  }
}

export const hiringSignalService = new HiringSignalService();
