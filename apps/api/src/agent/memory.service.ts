import { ID, Query } from 'node-appwrite';
import { databases, DATABASE_ID, JOBS_COLLECTION_ID } from '../lib/appwrite.js';
import { MemoryClient } from 'mem0ai';
import { emitAgentEvent } from '../lib/event-bus.js';
import { withFallback } from '../providers/index.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MemoryResult {
  id: string;
  memory: string;
  metadata?: Record<string, unknown>;
}

export interface AgentMemoryContext {
  previousSearches: string[];
  appliedJobUrls: string[];
  semanticPreferences: string;
  memories: MemoryResult[];
  lastSearchDate: string;
}

type MemoryType = 'preference' | 'search' | 'application' | 'ranking' | 'profile';

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Production-grade memory service backed by Mem0 Cloud (semantic) + Appwrite (episodic).
 * All memories are scoped by user_id = githubUsername, so there is never any cross-user leakage.
 * Mem0 Cloud handles persistence, embedding, and retrieval — no local storage needed.
 */
export class AgentMemoryService {
  private mem0: MemoryClient | null = null;
  private isReady = false;

  constructor() {
    const apiKey = process.env.MEM0_API_KEY;
    if (apiKey) {
      try {
        this.mem0 = new MemoryClient({ apiKey });
        this.isReady = true;
        console.log('[MemoryService] ✅ Mem0 Cloud initialized (ghostssh project).');
      } catch (e: any) {
        console.warn('[MemoryService] ⚠️ Mem0 init failed:', e.message);
      }
    } else {
      console.warn('[MemoryService] ⚠️ MEM0_API_KEY not set — semantic memory disabled.');
    }
  }


  async synthesizePreferences(userId: string): Promise<void> {
    try {
      if (!this.mem0) return;
      
      const all = await this.getAll(userId);
      if (all.length < 5) return;
      if (all.length % 5 !== 0) return;

      const systemPrompt = `You extract structured job preferences from agent memory logs.
Return strict JSON only:
{ "preferredRoles": string[], "preferredCompanies": string[], "dealbreakers": string[], "preferredStack": string[], "remotePreference": "remote"|"hybrid"|"onsite"|"flexible", "seniorityLevel": "junior"|"mid"|"senior"|"staff"|"principal" }`;

      const userPrompt = all.map(m => m.memory).join('\n');

      const raw = await withFallback(llm => llm.generate({
        system: systemPrompt,
        user: userPrompt,
        json: true,
        maxOutputTokens: 2000
      }));

      const parsed = JSON.parse(raw);
      await this.addMemory(userId, "PREFERENCE_SUMMARY: " + JSON.stringify(parsed), "preference");
      console.log(`[MemoryService] Synthesized preferences for ${userId}`);
    } catch (e: any) {
      console.error("[MemoryService] Failed to synthesize preferences:", e.message);
    }
  }

  async getPreferenceSummary(userId: string): Promise<string> {
    try {
      if (!this.mem0) return "";
      const results = await this.mem0.search("PREFERENCE_SUMMARY", { user_id: userId });
      
      const res = Array.isArray(results) ? results : (results as any).results;
      if (res && res.length > 0) {
        // filter down to just the summary or just return the closest.
        const summary = res.find((r: any) => r.memory && r.memory.includes("PREFERENCE_SUMMARY"));
        if (summary) return summary.memory;
      }
      return "";
    } catch (e: any) {
      return "";
    }
  }

  // ─── Core API ──────────────────────────────────────────────────────────────

  /**
   * Store a fact/memory about a user.
   * Examples: "User prefers remote ML roles", "Applied to Anthropic on 2026-03-21"
   */
  public async addMemory(
    userId: string,
    content: string,
    type: MemoryType = 'preference'
  ): Promise<void> {
    if (!this.mem0) return;

    const start = Date.now();
    try {
      console.log(`[MemoryService] 💾 Storing memory for ${userId}: "${content.slice(0, 80)}..."`);
      await this.mem0.add(
        [{ role: 'user', content }],
        {
          user_id: userId,
          metadata: { source: 'ghostssh', type, timestamp: new Date().toISOString() }
        }
      );
      await emitAgentEvent({ userId, agent: "memory", action: "memory_write", status: "success", duration_ms: Date.now() - start });
    } catch (e: any) {
      console.error(`[MemoryService] ❌ addMemory failed for ${userId}:`, e.message);
      await emitAgentEvent({ userId, agent: "memory", action: "memory_write", status: "error", duration_ms: Date.now() - start, error_message: e.message });
    }
  }

  /**
   * Retrieve relevant memories for a user based on a semantic query.
   * Used BEFORE LLM calls to inject contextual history.
   */
  public async searchMemory(
    userId: string,
    query: string,
    limit = 10
  ): Promise<MemoryResult[]> {
    if (!this.mem0) return [];

    const start = Date.now();
    try {
      console.log(`[MemoryService] 🔍 Searching memories for ${userId}: "${query.slice(0, 60)}..."`);
      const results = await this.mem0.search(query, { user_id: userId, limit });

      if (!results || results.length === 0) {
        console.log('[MemoryService] No matching memories found.');
        await emitAgentEvent({ userId, agent: "memory", action: "memory_search", status: "success", duration_ms: Date.now() - start, result_count: 0 });
        return [];
      }

      console.log(`[MemoryService] Found ${results.length} relevant memories.`);
      await emitAgentEvent({ userId, agent: "memory", action: "memory_search", status: "success", duration_ms: Date.now() - start, result_count: results.length });
      return results.map((r: any) => ({
        id: r.id || '',
        memory: r.memory || r.text || '',
        metadata: r.metadata || {},
      }));
    } catch (e: any) {
      console.error(`[MemoryService] ❌ searchMemory failed:`, e.message);
      await emitAgentEvent({ userId, agent: "memory", action: "memory_search", status: "error", duration_ms: Date.now() - start, error_message: e.message });
      return [];
    }
  }

  /**
   * List ALL memories for a user. Used by the dashboard or for debugging.
   */
  public async getAll(userId: string): Promise<MemoryResult[]> {
    if (!this.mem0) return [];

    try {
      console.log(`[MemoryService] 📋 Listing all memories for ${userId}...`);
      const results = await this.mem0.getAll({ user_id: userId });

      if (!results || results.length === 0) return [];

      return results.map((r: any) => ({
        id: r.id || '',
        memory: r.memory || r.text || '',
        metadata: r.metadata || {},
      }));
    } catch (e: any) {
      console.error('[MemoryService] ❌ getAll failed:', e.message);
      return [];
    }
  }

  /**
   * Delete a specific memory by ID. Supports GDPR / user-initiated cleanup.
   */
  public async deleteMemory(memoryId: string): Promise<boolean> {
    if (!this.mem0) return false;

    try {
      console.log(`[MemoryService] 🗑️ Deleting memory ${memoryId}...`);
      await this.mem0.delete(memoryId);
      return true;
    } catch (e: any) {
      console.error(`[MemoryService] ❌ deleteMemory failed:`, e.message);
      return false;
    }
  }

  // ─── Composite Methods (used by Orchestrator) ─────────────────────────────

  /**
   * Retrieves full historical context combining Appwrite episodic data
   * and Mem0 semantic memory for the agent's reasoning loop.
   */
  public async getHistoricalContext(
    githubUsername: string,
    currentQuery: string
  ): Promise<AgentMemoryContext> {
    console.log(`[MemoryService] Fetching combined context for ${githubUsername}...`);

    let appliedJobUrls: string[] = [];
    let memories: MemoryResult[] = [];
    let semanticPreferences = 'No learned semantic parameters.';

    // 1. Appwrite: Fetch episodic memory (previously applied/failed jobs)
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        JOBS_COLLECTION_ID,
        [
          Query.equal('status', ['applied', 'interviewing', 'failed']),
          Query.limit(100),
        ]
      );
      appliedJobUrls = response.documents.map((doc: any) => doc.url);
    } catch (e: any) {
      console.warn('[MemoryService] Appwrite episodic fetch failed:', e.message);
    }

    // 2. Mem0: Fetch semantic preferences
    memories = await this.searchMemory(githubUsername, currentQuery);
    if (memories.length > 0) {
      semanticPreferences = memories.map((m) => `- ${m.memory}`).join('\n');
    }

    return {
      previousSearches: [],
      appliedJobUrls,
      semanticPreferences,
      memories,
      lastSearchDate: new Date().toISOString(),
    };
  }

  /**
   * Persists a search event as both a semantic memory in Mem0
   * and logs it for episodic tracking.
   */
  public async recordSearchQuery(githubUsername: string, query: string): Promise<void> {
    const content = `User searched for: "${query}" on ${new Date().toISOString()}`;
    await this.addMemory(githubUsername, content, 'search');
  }

  /**
   * After ranking is complete, persist a summary to semantic memory.
   */
  public async recordRankingResult(
    githubUsername: string,
    topJobTitle: string,
    topCompany: string,
    score: number,
    totalRanked: number
  ): Promise<void> {
    const content = `Ranked ${totalRanked} jobs. Top match: "${topJobTitle}" at ${topCompany} (score: ${score}/100) on ${new Date().toISOString()}`;
    await this.addMemory(githubUsername, content, 'ranking');
  }

  /**
   * After auto-apply is queued, persist the application event.
   */
  public async recordApplication(
    githubUsername: string,
    company: string,
    role: string,
    jobUrl: string
  ): Promise<void> {
    const content = `Applied to "${role}" at ${company} (${jobUrl}) on ${new Date().toISOString()}`;
    await this.addMemory(githubUsername, content, 'application');
  }

  /** Returns true if Mem0 is connected and ready */
  public get ready(): boolean {
    return this.isReady;
  }
}

export const agentMemoryService = new AgentMemoryService();
