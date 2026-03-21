---
name: cost-aware-llm-pipeline
description: >
  Apply this skill whenever making LLM API calls, designing prompts, or building
  pipelines that call multiple AI providers. In ghostssh, trigger on: ranking
  batches, opinion engine, profile condensation, cover letter generation, or any
  withFallback() call. Prevents surprise bills by enforcing token budgets,
  provider selection, and caching strategies across the Minimax/Anthropic/OpenAI
  provider chain.
---

# Cost-Aware LLM Pipeline for ghostssh

## Provider Cost Hierarchy (cheapest → most expensive)

| Provider | Est. cost/1M tokens | Use for |
|----------|--------------------|---------| 
| Minimax M2.7 | ~$0.30 | Everything — primary |
| Gemini 2.5 Pro | ~$0.50 | Bulk analysis, large context |
| OpenAI GPT-4o | ~$2.50 | Fallback only |
| Anthropic Claude | ~$3.00 | Reasoning + vision fallback |

## Token Budgets Per Operation

```typescript
// COST_LIMITS from cost-guard.ts — enforce these always
const COST_LIMITS = {
  rankingBatch: 8000,      // 25 jobs × ~300 chars each = ~6k tokens
  profileBuild: 4000,      // GitHub repos + LinkedIn text
  opinionEngine: 3000,     // Top 20 jobs summary
  coverLetter: 2000,       // Single job + profile
  profileCondense: 5000,   // Raw scraped markdown
};
```

## Batch Strategy (critical for ranking)

Never send all jobs in one call. Always batch:
```typescript
async function batchRank(jobs: JobPosting[], batchSize = 25) {
  const batches = [];
  for (let i = 0; i < jobs.length; i += batchSize) {
    batches.push(jobs.slice(i, i + batchSize));
  }
  
  // Run max 3 batches concurrently to avoid rate limits
  const results = [];
  for (let i = 0; i < batches.length; i += 3) {
    const chunk = batches.slice(i, i + 3);
    const batchResults = await Promise.all(chunk.map(b => rankBatch(b)));
    results.push(...batchResults.flat());
  }
  return results.sort((a, b) => b.score - a.score);
}
```

## Caching Strategy

```typescript
// Cache profile builds for 24 hours (GitHub data doesn't change that fast)
// Key: `profile:${githubUsername}:${date}`
// Store in Appwrite with TTL

// Cache job rankings for 6 hours (cron runs every 6h anyway)
// Key: `ranking:${profileId}:${jobId}`
```

## Provider Selection Logic

```typescript
// Use cheap provider for bulk, expensive for precision
function selectProvider(task: 'bulk' | 'precision'): ProviderName {
  if (task === 'bulk') return 'minimax';      // batch ranking, profile build
  if (task === 'precision') return 'anthropic'; // cover letters, opinions
  return env.DEFAULT_PROVIDER;
}
```

## Hard Cost Ceiling

Per user per search: **$0.10 max**
If approaching limit: switch to minimax, reduce topK to 5, skip cover letters
Track spend in agent_events: `{ action: "llm_call", metadata: { estimated_cost: 0.003 } }`
