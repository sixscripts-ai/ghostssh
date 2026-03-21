import { FastifyPluginAsync } from 'fastify';
import { jinaScraperService } from '../services/jina-scraper.service.js';
import { profileCondensationService } from '../services/profile-condensation.service.js';

interface ScrapeBody {
  urls: string[];
}

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ScrapeBody }>('/profile/scrape', async (req, rep) => {
    try {
      const { urls } = req.body;
      
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return rep.status(400).send({ error: 'BAD_REQUEST', message: 'No URLs provided in body.' });
      }

      // 1. Scrape all provided URLs via Jina AI
      const rawMarkdown = await jinaScraperService.scrapeUrls(urls);

      // 2. Condense the raw text strings into a perfectly formatted Markdown Candidate Profile
      const condensedText = await profileCondensationService.condense(rawMarkdown);
      
      return { text: condensedText };
    } catch (err: any) {
      app.log.error(err);
      return rep.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  });
};
