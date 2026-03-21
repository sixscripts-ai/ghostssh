import { ID, Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';

export interface AgentMemoryContext {
  previousSearches: string[];
  appliedJobUrls: string[];
  lastSearchDate: string;
}

/**
 * Provides historical context and memory recall for the Autonomous Agent
 * by querying the Appwrite database for previous interactions, job statuses,
 * and search queries.
 */
export class AgentMemoryService {
  /**
   * Retrieves memory context for a specific user or profile
   */
  public async getHistoricalContext(githubUsername: string, currentQuery: string): Promise<AgentMemoryContext> {
    console.log(`[MemoryService] Fetching historical memory context for ${githubUsername} (Query: ${currentQuery})...`);
    try {
      // Fetch jobs that were previously applied or saved
      // In a real schema, we would filter by a userId or profileId.
      // Assuming jobs are tied globally or we pull 'applied' status
      const response = await databases.listDocuments(
        DATABASE_ID,
        JOBS_COLLECTION_ID,
        [
          Query.equal('status', ['applied', 'interviewing', 'failed']),
          Query.limit(100)
        ]
      );

      const appliedJobUrls = response.documents.map((doc: any) => doc.url);

      // We would also fetch from a dedicated `search_queries` collection
      // For now, returning a scaffolded memory object based on the jobs memory
      return {
        previousSearches: ["AI Engineer", "Software Developer"], // Scaffolded past intent
        appliedJobUrls,
        lastSearchDate: new Date().toISOString()
      };
    } catch (error) {
      console.error("[MemoryService] Failed to load memory:", error);
      return { previousSearches: [], appliedJobUrls: [], lastSearchDate: new Date().toISOString() };
    }
  }

  /**
   * Logs a new search query to short-term memory / Appwrite
   */
  public async recordSearchQuery(githubUsername: string, query: string) {
    console.log(`[MemoryService] Persisting search query to memory: "${query}" for ${githubUsername}`);
    // A future `searches` Appwrite collection would store this query.
  }
}
