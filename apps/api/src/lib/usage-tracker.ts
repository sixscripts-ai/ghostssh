import { ID, Query } from 'node-appwrite';
import { databases, DATABASE_ID } from './appwrite.js';

const COLLECTION_ID = 'usage';

export interface UsageReport {
  allowed: boolean;
  tier: "free" | "pro";
  runsToday: number;
  maxJobs: number;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

export async function checkUsage(userId: string): Promise<UsageReport> {
  const date = getTodayString();

  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('date', date)
      ]
    );

    let doc: any;
    if (result.documents.length === 0) {
      // Create user record for today
      doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
        userId,
        date,
        run_count: 0,
        tier: "free"
      });
    } else {
      doc = result.documents[0];
    }

    if (!doc) {
      return { allowed: true, tier: "free", runsToday: 0, maxJobs: 5 };
    }

    const tier = doc.tier as "free" | "pro";
    const runsToday = doc.run_count as number;
    let allowed = true;
    let maxJobs = 5;

    if (tier === "free") {
      if (runsToday >= 3) {
        allowed = false;
      }
    } else {
      maxJobs = 25;
    }

    return { allowed, tier, runsToday, maxJobs };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usage Tracker] Failed to check usage:', error);
    }
    // On error, let them through as free tier to avoid complete outage
    return { allowed: true, tier: "free", runsToday: 0, maxJobs: 5 };
  }
}

export async function incrementUsage(userId: string): Promise<void> {
  const date = getTodayString();
  try {
    const result = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        Query.equal('userId', userId),
        Query.equal('date', date)
      ]
    );

    if (result.documents.length > 0) {
      const doc = result.documents[0] as any;
      if (doc) {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
          run_count: (doc.run_count as number) + 1
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usage Tracker] Failed to increment usage:', error);
    }
    // Never throws
  }
}
