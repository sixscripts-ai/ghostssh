import { ID, Query } from "node-appwrite";
import { databases, DATABASE_ID } from "./appwrite.js";
import { emitAgentEvent } from "./event-bus.js";

const USAGE_COLLECTION = "usage";

export type UserTier = "free" | "pro";

export type UsageStatus = {
  allowed: boolean;
  tier: UserTier;
  runsToday: number;
  maxJobs: number;
};

export const TIER_LIMITS = {
  free: { maxRunsPerDay: 3, maxJobs: 5 },
  pro: { maxRunsPerDay: Infinity, maxJobs: 25 },
} as const;

export async function checkUsage(userId: string): Promise<UsageStatus> {
  try {
    const today = new Date().toISOString().split("T")[0]!;

    const response = await databases.listDocuments(DATABASE_ID, USAGE_COLLECTION, [
      Query.equal("userId", userId),
      Query.equal("date", today),
    ]);

    if (response.documents.length === 0 || !response.documents[0]) {
      return { allowed: true, tier: "free", runsToday: 0, maxJobs: 5 };
    }

    const doc = response.documents[0];
    const tier = doc.tier as UserTier;
    const runsToday = doc.run_count as number;
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;

    const allowed = tier === "pro" || runsToday < limits.maxRunsPerDay;
    
    return { allowed, tier, runsToday, maxJobs: limits.maxJobs };
  } catch (err) {
    // Fail open if Appwrite fails
    return { allowed: true, tier: "free", runsToday: 0, maxJobs: 10 };
  }
}

export async function incrementUsage(userId: string): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0]!;

    const response = await databases.listDocuments(DATABASE_ID, USAGE_COLLECTION, [
      Query.equal("userId", userId),
      Query.equal("date", today),
    ]);

    let tier: UserTier = "free";
    let runsToday = 1;

    const doc = response.documents[0];
    if (response.documents.length > 0 && doc) {
      tier = doc.tier as UserTier;
      runsToday = (doc.run_count as number) + 1;

      await databases.updateDocument(DATABASE_ID, USAGE_COLLECTION, doc.$id, {
        run_count: runsToday,
      });
    } else {
      await databases.createDocument(DATABASE_ID, USAGE_COLLECTION, ID.unique(), {
        userId,
        date: today,
        run_count: 1,
        tier: "free",
      });
    }

    emitAgentEvent({
      userId,
      agent: "system",
      action: "usage_increment",
      status: "success",
      duration_ms: 0,
      metadata: { tier, runsToday },
    }).catch(() => {});

  } catch (err) {
    // Fire and forget, no await/throw
  }
}
