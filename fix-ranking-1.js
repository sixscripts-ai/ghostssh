const fs = require('fs');

function updateRanking() {
  const file = 'apps/api/src/services/ranking.service.ts';
  let code = fs.readFileSync(file, 'utf8');

  const enhancedCode = `      const merged = batchResults.flat().sort((a, b) => b.score - a.score);

      const enhanced = await Promise.allSettled(
        merged.slice(0, 20).map(async (job) => {
          const signal = await hiringSignalService.score(job.company, job.title)
            .catch(() => ({ urgencyScore: 0, signals: [] }));
          return {
            ...job,
            score: Math.round((job.score * 0.6) + (signal.urgencyScore * 0.4)),
            tags: [...job.tags, ...signal.signals]
          };
        })
      );

      const boosted = enhanced
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);
      
      const rest = merged.slice(20);
      const finalRanked = [...boosted, ...rest].sort((a, b) => b.score - a.score);

      console.log(\`[Ranking] Merged \${finalRanked.length} ranked jobs. Top: \${finalRanked[0]?.title ?? 'none'} (\${finalRanked[0]?.score ?? 0})\`);
      await emitAgentEvent({ userId: "system", agent: "ranker", action: "rank_jobs", status: "success", duration_ms: Date.now() - start, result_count: finalRanked.length });

      return finalRanked;`;

  code = code.replace(/const merged = batchResults\.flat\(\)\.sort\(\(a, b\) => b\.score - a\.score\);[\s\S]*?return merged;/, enhancedCode);
  fs.writeFileSync(file, code);
}

updateRanking();
