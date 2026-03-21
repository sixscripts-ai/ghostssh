import { FastifyPluginAsync } from 'fastify';
import { agentMemoryService } from '../agent/memory.service.js';

interface MemoryParams {
  userId: string;
}

interface DeleteParams {
  memoryId: string;
}

/**
 * REST routes for reading and managing agent memories.
 * Used by the dashboard to display and delete memories.
 */
export const memoryRoutes: FastifyPluginAsync = async (app) => {

  /** GET /memory/:userId — list all memories for a user */
  app.get<{ Params: MemoryParams }>('/memory/:userId', async (req, rep) => {
    const { userId } = req.params;

    if (!userId) {
      return rep.status(400).send({ error: 'BAD_REQUEST', message: 'userId is required' });
    }

    if (!agentMemoryService.ready) {
      return rep.status(503).send({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Mem0 is not configured. Set MEM0_API_KEY.',
      });
    }

    const memories = await agentMemoryService.getAll(userId);
    return { userId, total: memories.length, memories };
  });

  /** DELETE /memory/:memoryId — remove a specific memory */
  app.delete<{ Params: DeleteParams }>('/memory/:memoryId', async (req, rep) => {
    const { memoryId } = req.params;

    if (!memoryId) {
      return rep.status(400).send({ error: 'BAD_REQUEST', message: 'memoryId is required' });
    }

    if (!agentMemoryService.ready) {
      return rep.status(503).send({
        error: 'SERVICE_UNAVAILABLE',
        message: 'Mem0 is not configured. Set MEM0_API_KEY.',
      });
    }

    const deleted = await agentMemoryService.deleteMemory(memoryId);
    return { success: deleted, memoryId };
  });

  /** POST /memory/:userId/search — semantic search for memories */
  app.post<{ Params: MemoryParams; Body: { query: string; limit?: number } }>(
    '/memory/:userId/search',
    async (req, rep) => {
      const { userId } = req.params;
      const { query, limit } = req.body;

      if (!userId || !query) {
        return rep.status(400).send({ error: 'BAD_REQUEST', message: 'userId and query are required' });
      }

      if (!agentMemoryService.ready) {
        return rep.status(503).send({
          error: 'SERVICE_UNAVAILABLE',
          message: 'Mem0 is not configured. Set MEM0_API_KEY.',
        });
      }

      const results = await agentMemoryService.searchMemory(userId, query, limit);
      return { userId, query, total: results.length, results };
    }
  );
};
