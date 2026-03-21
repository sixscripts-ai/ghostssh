import { FastifyPluginAsync } from 'fastify';
import { jinaScraperService } from '../services/jina-scraper.service.js';
import { profileCondensationService } from '../services/profile-condensation.service.js';
import { linkedInService } from '../services/linkedin.service.js';
import { ProfileBuilderService } from '../services/profile-builder.service.js';

interface ScrapeBody {
  urls: string[];
}

interface DiscoverBody {
  githubUsername: string;
  hints?: string[]; // Optional extra URLs as context
}

export const profileRoutes: FastifyPluginAsync = async (app) => {
  const profileBuilder = new ProfileBuilderService();

  /**
   * POST /profile/discover — Auto-discovery mode (NEW)
   * Given a GitHub username, discovers LinkedIn + web presence automatically.
   */
  app.post<{ Body: DiscoverBody }>('/profile/discover', async (req, rep) => {
    try {
      const { githubUsername, hints } = req.body;

      if (!githubUsername) {
        return rep.status(400).send({ error: 'BAD_REQUEST', message: 'githubUsername is required.' });
      }

      app.log.info(`[ProfileDiscover] Auto-discovering for ${githubUsername}...`);

      // Step 1: Auto-discover LinkedIn
      const linkedinText = await linkedInService.discover(githubUsername);

      // Step 2: Scrape optional hint URLs
      let hintsText = '';
      if (hints && hints.length > 0) {
        hintsText = await jinaScraperService.scrapeUrls(hints);
      }

      // Step 3: Build full profile (GitHub API + LinkedIn + hints)
      const profile = await profileBuilder.build({
        githubUsername,
        linkedinText: linkedinText || hintsText,
      });

      return {
        profile,
        discovery: {
          linkedinFound: !!linkedinText,
          linkedinLength: linkedinText.length,
          hintsScraped: hints?.length || 0,
        },
      };
    } catch (err: any) {
      app.log.error(err);
      return rep.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  });

  /**
   * POST /profile/scrape — Manual URL scrape (legacy compat)
   * Takes explicit URLs and scrapes them via Jina.
   */
  app.post<{ Body: ScrapeBody }>('/profile/scrape', async (req, rep) => {
    try {
      const { urls } = req.body;
      
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return rep.status(400).send({ error: 'BAD_REQUEST', message: 'No URLs provided in body.' });
      }

      const rawMarkdown = await jinaScraperService.scrapeUrls(urls);
      const condensedText = await profileCondensationService.condense(rawMarkdown);
      
      return { text: condensedText };
    } catch (err: any) {
      app.log.error(err);
      return rep.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  });
};
