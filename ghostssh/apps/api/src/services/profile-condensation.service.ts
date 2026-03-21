import { withFallback } from '../providers/index.js';

export class ProfileCondensationService {
  /**
   * Accepts raw scraped text markup (extracted from URLs via Jina AI)
   * and uses the primary LLM to unify it into a clean, structured master profile narrative.
   */
  public async condense(rawMarkdown: string): Promise<string> {
    const systemPrompt = `You are an expert technical recruiter and resume writer.
Your job is to read raw web-scraped Markdown profiles (like LinkedIn, GitHub, or Personal Portfolios) and condense the chaos into a single, perfectly structured master Candidate Profile.
Focus heavily on core engineering skills, project achievements, title progression, and tenure. Extract and clean up any noisy scraping artifacts. Format your response entirely in Markdown with clean headers (e.g. ## Core Skills, ## Experience Timeline, ## Education). Judge the profile fairly, emphasizing hard data over fluff. Do not output anything other than the final markdown profile.`;

    const userPrompt = `Condense the following scraped profile text into a highly structured, readable Markdown summary of the candidate.

RAW PROFILE DATA:
${rawMarkdown}`;

    try {
      const narrative = await withFallback(async (provider) => {
        return provider.generate({ system: systemPrompt, user: userPrompt });
      }, 'minimax');
      return narrative;
    } catch (err) {
      console.error('[ProfileCondensation] Exhausted all LLM fallbacks:', err);
      throw new Error('Failed to condense the candidate profile via LLM providers.');
    }
  }
}

export const profileCondensationService = new ProfileCondensationService();
