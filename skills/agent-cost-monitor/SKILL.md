---
name: agent-cost-monitor
description: >
  Track real-time token usage and estimated costs across all ghostssh agent calls.
  Use this skill when: reviewing agent performance, debugging expensive operations,
  planning infrastructure scaling, or generating usage reports. Reads from the
  agent_events Appwrite collection. Trigger on: cost analysis, usage report,
  token budget, spending review, or "how much did that cost".
---

# Agent Cost Monitor for ghostssh

## Reading Agent Events

```typescript
// Query agent_events for cost analysis
const events = await databases.listDocuments(DB, 'agent_events', [
  Query.equal('userId', githubUsername),
  Query.orderDesc('$createdAt'),
  Query.limit(100)
]);

// Calculate total estimated cost for a session
const totalCost = events.documents
  .filter(e => e.action.includes('llm_'))
  .reduce((sum, e) => {
    const meta = JSON.parse(e.metadata || '{}');
    return sum + (meta.estimated_cost || 0);
  }, 0);
```

## Cost Estimation Per Provider

```typescript
function estimateCost(tokens: number, provider: ProviderName): number {
  const rates: Record<ProviderName, number> = {
    minimax: 0.0000003,   // $0.30/1M tokens
    gemini: 0.0000005,    // $0.50/1M tokens
    openai: 0.0000025,    // $2.50/1M tokens
    anthropic: 0.000003,  // $3.00/1M tokens
    openrouter: 0.000002  // varies, ~$2/1M average
  };
  return tokens * (rates[provider] || 0.000002);
}
```

## Per-User Cost Dashboard Data

```typescript
// GET /admin/usage?userId=sixscripts
async function getUserCostSummary(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const events = await databases.listDocuments(DB, 'agent_events', [
    Query.equal('userId', userId),
    Query.greaterThanEqual('timestamp', today),
    Query.limit(500)
  ]);
  
  return {
    totalRuns: events.documents.filter(e => e.action === 'search_complete').length,
    totalLLMCalls: events.documents.filter(e => e.agent === 'ranker').length,
    avgDuration: average(events.documents.map(e => e.duration_ms)),
    estimatedCost: events.documents.reduce((s, e) => {
      return s + JSON.parse(e.metadata || '{}').estimated_cost || 0;
    }, 0),
    errorRate: events.documents.filter(e => e.status === 'error').length / events.total
  };
}
```

## Alerts

Emit warning if:
- Single search > $0.08 (approaching $0.10 ceiling)
- Error rate > 20% for any agent
- Any single LLM call > 10,000 tokens
- User has > 50 runs today on free tier (shouldn't be possible but catch it)
