const fs = require('fs');
const file = 'apps/api/src/services/ranking.service.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('agentMemoryService')) {
  code = "import { agentMemoryService } from '../agent/memory.service.js';\n" + code;
}

const methodTarget = `  async rank(profile: CandidateProfile, jobs: JobPosting[], provider?: ProviderName): Promise<RankedJob[]> {
    const start = Date.now();
    try {`;

const newMethod = `  async rank(profile: CandidateProfile, jobs: JobPosting[], provider?: ProviderName): Promise<RankedJob[]> {
    const start = Date.now();
    try {
      const prefSummary = await agentMemoryService.getPreferenceSummary(
        profile.githubUsername || "anonymous"
      ).catch(() => "");`;
      
code = code.replace(methodTarget, newMethod);

const promptTarget = `        user: JSON.stringify({
          profile,`;

const newPrompt = `        user: JSON.stringify({
          profile: {
             ...profile,
             preferenceSummary: prefSummary || undefined
          },`;
code = code.replace(promptTarget, newPrompt);
code = code.replace(`system: jobRankPrompt.system,`, `system: jobRankPrompt.system + (prefSummary ? "\\n\\nUser preference summary (inject into ranking decisions):\\n" + prefSummary : ""),`);

// we need to pass prefSummary down to rankBatch
code = code.replace(`(profile, batch, provider, i + idx + 1, batches.length)`, `(profile, batch, provider, i + idx + 1, batches.length, prefSummary)`);

code = code.replace(
  `private async rankBatch(
    profile: CandidateProfile,
    batch: JobPosting[],
    provider: ProviderName | undefined,
    batchNum: number,
    totalBatches: number
  ): Promise<RankedJob[]> {`,
  `private async rankBatch(
    profile: CandidateProfile,
    batch: JobPosting[],
    provider: ProviderName | undefined,
    batchNum: number,
    totalBatches: number,
    prefSummary: string = ""
  ): Promise<RankedJob[]> {`
);

fs.writeFileSync(file, code);
