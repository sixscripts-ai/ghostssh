import { emitAgentEvent } from './event-bus.js';

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const COST_LIMITS = {
  rankingBatch: 8000,
  profileBuild: 4000,
  opinionEngine: 3000,
  coverLetter: 2000
};

export function guardTokenLimit(input: string, maxTokens: number, label: string = 'unknown'): string {
  const originalTokens = estimateTokens(input);
  
  if (originalTokens <= maxTokens) {
    return input;
  }

  // 1 token ~= 4 chars roughly, so max chars = maxTokens * 4
  const maxChars = maxTokens * 4;
  const truncatedText = input.substring(0, maxChars) + "\n\n[truncated for cost control]";
  
  // Fire and forget event
  emitAgentEvent({
    userId: "system", // We don't easily have userId here unless passed, fallback to system
    agent: "cron", // We don't have the context of which agent exactly, default to cron/system
    action: "input_truncated",
    status: "success",
    duration_ms: 0,
    metadata: { label, originalTokens, maxTokens }
  }).catch(() => {});

  return truncatedText;
}