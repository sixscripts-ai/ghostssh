import { emitAgentEvent } from './event-bus.js';

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export const COST_LIMITS = {
  rankingBatch: 8000,
  profileBuild: 4000,
  opinionEngine: 3000,
  coverLetter: 2000,
  profileCondense: 5000,
} as const;

export function guardTokenLimit(
  input: string,
  maxTokens: number,
  label?: string
): string {
  const tokens = estimateTokens(input);
  if (tokens <= maxTokens) {
    return input;
  }

  const truncated = input.slice(0, maxTokens * 4) + ' [truncated for cost control]';
  
  // Fire and forget
  emitAgentEvent({
    userId: 'system',
    agent: 'system',
    action: 'input_truncated',
    status: 'skipped',
    duration_ms: 0,
    metadata: { label, originalTokens: tokens, maxTokens }
  }).catch(() => {});

  return truncated;
}
