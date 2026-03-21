const fs = require('fs');
const file = 'apps/api/src/services/ranking.service.ts';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      // Rank each batch in parallel
      const batchResults = await Promise.all(
        batches.map((batch, i) => this.rankBatch(profile, batch, provider, i + 1, batches.length))
      );`;

const newStr = `      // Rank each batch max 3 concurrently
      const batchResults: import("../types/job.js").RankedJob[][] = [];
      for (let i = 0; i < batches.length; i += 3) {
        const chunkBatches = batches.slice(i, i + 3);
        const results = await Promise.allSettled(chunkBatches.map((b, idx) => 
          this.rankBatch(profile, b, provider, i + idx + 1, batches.length)
        ));
        for (const res of results) {
          if (res.status === 'fulfilled') batchResults.push(res.value);
        }
      }`;

code = code.replace(targetStr, newStr);
fs.writeFileSync(file, code);
