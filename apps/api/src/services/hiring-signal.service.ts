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

const SIGNAL_PATTERNS: Array<{ regex: RegExp; label: string; weight: number }> = [
  { regex: /hiring|we('re| are) hiring|join (our|the) team/i, label: 'Active hiring language', weight: 0.3 },
  { regex: /open (role|position)|apply now|job (opening|listing)/i, label: 'Open position mention', weight: 0.25 },
  { regex: /headcount|growing|expand(ing|ed)|scaling/i, label: 'Growth signal', weight: 0.2 },
  { regex: /202[5-6]/i, label: 'Recent date reference', weight: 0.15 },
  { regex: /remote|hybrid|on-?site/i, label: 'Work arrangement mentioned', weight: 0.1 },
];

export class HiringSignalService {
  /**
   * Detect hiring intent for a company + role combination.
   * Returns a 0-100 score based on web evidence.
   */
  async detectSignals(company: string, role: string): Promise<HiringSignalResult> {
    console.log(`[HiringSignal] Detecting signals for ${company} × ${role}...`);

    const queries = [
      `"${company}" hiring "${role}" 2026`,
      `"${company}" jobs ${role} open positions`,
      `"${company}" team growing engineers`,
    ];

    const allSignals: HiringSignal[] = [];
    const seenTexts = new Set<string>();

    for (const query of queries) {
      const results = await webSearchService.search(query, 3);

      for (const result of results) {
        const combinedText = `${result.title} ${result.snippet}`;

        for (const pattern of SIGNAL_PATTERNS) {
          if (pattern.regex.test(combinedText)) {
            const key = `${pattern.label}:${result.url}`;
            if (!seenTexts.has(key)) {
              seenTexts.add(key);
              allSignals.push({
                source: result.url,
                text: `${pattern.label}: "${result.title.slice(0, 80)}"`,
                weight: pattern.weight,
              });
            }
          }
        }
      }
    }

    // Calculate composite score (0-100)
    const rawScore = allSignals.reduce((sum, s) => sum + s.weight, 0);
    const normalizedScore = Math.min(100, Math.round(rawScore * 50)); // Scale so 2+ strong signals → 80+

    console.log(`[HiringSignal] ${company} × ${role}: score ${normalizedScore}/100, ${allSignals.length} signals`);

    return {
      company,
      role,
      score: normalizedScore,
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
