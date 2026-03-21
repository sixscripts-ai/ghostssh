import { withFallback } from '../providers/index.js';
import type { CandidateProfile } from './linkedin-parser.service.js';
import type { ProviderName } from '../types/provider.js';

export class LinkedInCondensationService {
  /**
   * Sends the parsed CandidateProfile JSON to the LLM to condense it into a cohesive narrative text.
   * @param profile Parsed JSON Profile from the ZIP extract
   * @param providerName The Provider to use (defaults to minimax)
   * @returns A condensed, professional string representation of the LinkedIn profile
   */
  async condense(profile: CandidateProfile, providerName?: ProviderName): Promise<string> {
    const system = `You are an expert executive resume writer and career coach.
Your job is to take the raw JSON parsed from a user's LinkedIn Data Export and condense it into a highly readable, dense, professional first-person narrative string. 

Focus on:
1. Highlighting their most impressive metrics and achievements from their Positions.
2. Integrating their Skills organically into the summary.
3. Condensing their Education gracefully.
4. Making it sound like an organic, highly impressive "About Me" blurb that a recruiter would love to read.

Return ONLY the generated narrative text, without any markdown formatting, headers, or JSON wrappers. Keep it between 300 to 500 words.`;

    const user = `Here is my raw parsed LinkedIn Profile Export JSON:\n\n${JSON.stringify(profile, null, 2)}`;

    console.log(`Condensing LinkedIn profile...`);
    
    const raw = await withFallback(
      (llm) => llm.generate({ system, user, maxOutputTokens: 1500, json: false, temperature: 0.3 }),
      providerName
    );

    return raw.trim();
  }
}

export const linkedInCondensationService = new LinkedInCondensationService();
