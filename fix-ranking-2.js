const fs = require('fs');
const file = 'apps/api/src/services/ranking.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = `import { GitHubService } from "./github.service.js";\n` + code;

const patchCode = `      const finalRanked = [...boosted, ...rest].sort((a, b) => b.score - a.score);

      const github = new GitHubService();
      if (profile.githubUsername) {
        for (let i = 0; i < Math.min(10, finalRanked.length); i++) {
          const job = finalRanked[i];
          const connections = await github.getNetworkOverlap(
            profile.githubUsername, job.company
          ).catch(() => []);
          job.networkConnections = connections;
          if (connections.length > 0) {
            job.score = Math.min(job.score + 15, 100);
            job.tags = [...job.tags, \`network_overlap_\${connections.length}\`];
          }
        }
        // re-sort after score adjustments
        finalRanked.sort((a, b) => b.score - a.score);
      }`;

code = code.replace(/      const finalRanked = \[\.\.\.boosted, \.\.\.rest\]\.sort\(\(a, b\) => b\.score - a\.score\);/, patchCode);
fs.writeFileSync(file, code);
