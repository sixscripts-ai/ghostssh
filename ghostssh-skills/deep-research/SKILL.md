---
name: deep-research
description: >
  Use this skill for autonomous multi-step research tasks that require searching
  multiple sources, synthesizing findings, and producing structured intelligence.
  In ghostssh, trigger on: hiring signal detection, company research, contact
  discovery, competitor analysis, or any task requiring more than 2 web searches.
  Powers the Scout agent's hiring urgency scoring and the Outreach agent's
  contact discovery pipeline.
---

# Deep Research for ghostssh Agents

Autonomous multi-step research using Jina Search + Scrape pipeline.

## Research Loop Pattern

```typescript
async function deepResearch(query: string, maxSteps = 5): Promise<ResearchResult> {
  const findings: string[] = [];
  let currentQuery = query;
  
  for (let step = 0; step < maxSteps; step++) {
    // Step 1: Search
    const results = await webSearchService.search(currentQuery, 5);
    if (results.length === 0) break;
    
    // Step 2: Scrape top 2 results
    const scraped = await Promise.allSettled(
      results.slice(0, 2).map(r => jinaScraperService.scrapeWithResilience(r.url))
    );
    
    // Step 3: Extract key findings via LLM
    const content = scraped
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .map(r => (r as any).value.content)
      .join('\n\n---\n\n');
    
    findings.push(content);
    
    // Step 4: Generate follow-up query if needed
    // (stop early if we have enough signal)
    if (findings.join('').length > 10000) break;
  }
  
  return { query, findings, steps: findings.length };
}
```

## Hiring Signal Research (ghostssh Scout agent)

```typescript
async function researchHiringSignals(company: string, role: string) {
  const queries = [
    `"${company}" hiring "${role}" 2026`,
    `"${company}" engineering team growing careers`,
    `site:linkedin.com/company "${company}" jobs`,
    `"${company}" raised funding headcount growth`
  ];
  
  const signals = [];
  for (const q of queries) {
    const results = await webSearchService.search(q, 3);
    
    // Score signals
    for (const r of results) {
      const age = getAgeFromSnippet(r.snippet); // days since posted
      if (age < 3) signals.push({ type: 'very_recent', score: 40, source: r.url });
      else if (age < 7) signals.push({ type: 'recent', score: 25, source: r.url });
      if (r.snippet.toLowerCase().includes('we\'re hiring')) 
        signals.push({ type: 'active_hiring', score: 25, source: r.url });
      if (r.snippet.toLowerCase().includes('series') && r.snippet.includes('million'))
        signals.push({ type: 'funded', score: 20, source: r.url });
    }
  }
  
  return {
    urgencyScore: Math.min(signals.reduce((s, sig) => s + sig.score, 0), 100),
    signals: signals.map(s => s.type)
  };
}
```

## Contact Discovery (ghostssh Outreach agent)

```typescript
async function findBestContact(company: string) {
  const queries = [
    `"${company}" "VP Engineering" OR "CTO" OR "Head of Engineering" linkedin`,
    `"${company}" engineering recruiter email`,
    `site:linkedin.com/in "${company}" engineering manager`
  ];
  
  for (const q of queries) {
    const results = await webSearchService.search(q, 3);
    const linkedin = results.find(r => r.url.includes('linkedin.com/in/'));
    if (linkedin) {
      const scraped = await jinaScraperService.scrapeWithResilience(linkedin.url);
      if (scraped.success) {
        return extractContactFromMarkdown(scraped.content);
      }
    }
  }
  return null;
}
```

## Research Quality Rules

- Always cite sources in findings
- Cap at 5 search steps per research task
- If Jina returns empty: retry once with simpler query
- Never hallucinate contact info — return null if not found
- Cache research results in Appwrite for 24 hours per company
