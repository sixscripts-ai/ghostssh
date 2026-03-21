import { FastifyPluginAsync } from 'fastify';
import { linkedInParserService } from '../services/linkedin-parser.service.js';
import { linkedInCondensationService } from '../services/linkedin-condensation.service.js';

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.post('/profile/upload', async (req, rep) => {
    try {
      const data = await req.file();
      if (!data) {
        return rep.status(400).send({ error: 'BAD_REQUEST', message: 'No file uploaded' });
      }

      // 1. Extract and Parse the ZIP Buffer
      const buffer = await data.toBuffer();
      const profileJson = linkedInParserService.parseZip(buffer);
      
      // 2. We can pass the provider string from a query parameter if needed.
      // For simplicity, let's use the default fallback provider (Minimax).
      const linkedinText = await linkedInCondensationService.condense(profileJson);
      
      return { linkedinText };
    } catch (err: any) {
      app.log.error(err);
      return rep.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  });
};
