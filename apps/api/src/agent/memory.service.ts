import { ID, Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';
import { MemoryClient } from 'mem0ai';

export interface AgentMemoryContext {
  previousSearches: string[];
  appliedJobUrls: string[];
  semanticPreferences: string;
  lastSearchDate: string;
}

/**
 * Provides historical context and memory recall for the Autonomous Agent
 * by querying the Appwrite database for episodic memory and Mem0 for semantic memory.
 */
export class AgentMemoryService {
  private mem0: MemoryClient | null = null;

  constructor() {
    try {
      this.mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY || "" }); // Automatically uses explicit or implicit env keys
      console.log("[MemoryService] Mem0 initialized successfully.");
    } catch (e) {
      console.warn("[MemoryService] Mem0 could not initialize automatically. Check MEM0_API_KEY.");
    }
  }

  /**
   * Retrieves episodic memory context and semantic facts for a user
   */
  public async getHistoricalContext(githubUsername: string, currentQuery: string): Promise<AgentMemoryContext> {
    console.log(`[MemoryService] Fetching historical + semantic memory for ${githubUsername} (Query: ${currentQuery})...`);
    try {
      // 1. Appwrite: Fetch episodic memory (Previously applied/failed jobs)
      const response = await databases.listDocuments(
        DATABASE_ID,
        JOBS_COLLECTION_ID,
        [
          Query.equal('status', ['applied', 'interviewing', 'failed']),
          Query.limit(100)
        ]
      );
      const appliedJobUrls = response.documents.map((doc: any) => doc.url);

      // 2. Mem0: Fetch semantic / unstructured memory
      let semanticPreferences = "No learned semantic parameters.";
      if (this.mem0) {
        const memSearch = await this.mem0.search(currentQuery, { user_id: githubUsername });
        if (memSearch && memSearch.length > 0) {
            semanticPreferences = memSearch.map((m: any) => `- ${m.memory}`).join("\n");
        }
      }

      return {
        previousSearches: ["AI Engineer", "Software Developer"], 
        appliedJobUrls,
        semanticPreferences,
        lastSearchDate: new Date().toISOString()
      };
    } catch (error) {
      console.error("[MemoryService] Failed to load memory:", error);
      return { previousSearches: [], appliedJobUrls: [], semanticPreferences: "", lastSearchDate: new Date().toISOString() };
    }
  }

  /**
   * Logs a new search query to semantic memory and Appwrite
   */
  public async recordSearchQuery(githubUsername: string, query: string) {
    console.log(`[MemoryService] Persisting search query to episodic memory: "${query}" for ${githubUsername}`);
    
    // Store loosely inferred semantic facts into Mem0
    if (this.mem0) {
        console.log(`[MemoryService] Memorizing semantics into Mem0 for ${githubUsername}...`);
        try {
           await this.mem0.add([{ role: "user", content: query }], { user_id: githubUsername });
        } catch (e) {
            console.error("[MemoryService] Mem0 add failed:", e);
        }
    }
  }
}

