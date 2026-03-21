import { ID } from 'node-appwrite';
import { databases, DATABASE_ID } from './appwrite.js';

const COLLECTION_ID = 'agent_events';

export interface AgentEvent {
  userId: string;
  agent: "scout" | "ranker" | "memory" | "outreach" | "applier" | "cron";
  action: string;
  status: "success" | "error" | "timeout" | "skipped";
  duration_ms: number;
  result_count?: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string; // ISO
}

export async function emitAgentEvent(event: AgentEvent): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Agent Event]', JSON.stringify(event));
    }

    const doc = {
      userId: event.userId,
      agent: event.agent,
      action: event.action,
      status: event.status,
      duration_ms: event.duration_ms,
      result_count: event.result_count ?? null,
      error_message: event.error_message ?? null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      timestamp: event.timestamp || new Date().toISOString()
    };

    // Fire and forget
    await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), doc);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Agent Event] Failed to emit:', error);
    }
    // Never throws
  }
}
