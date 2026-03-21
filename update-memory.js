const fs = require('fs');
const file = 'apps/api/src/agent/memory.service.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('import { withFallback } from')) {
    code = code.replace("import { emitAgentEvent } from '../lib/event-bus.js';", "import { emitAgentEvent } from '../lib/event-bus.js';\nimport { withFallback } from '../providers/index.js';");
}

const methodsStr = `
  async synthesizePreferences(userId: string): Promise<void> {
    try {
      if (!this.mem0) return;
      
      const all = await this.getAll(userId);
      if (all.length < 5) return;
      if (all.length % 5 !== 0) return;

      const systemPrompt = \`You extract structured job preferences from agent memory logs.
Return strict JSON only:
{ "preferredRoles": string[], "preferredCompanies": string[], "dealbreakers": string[], "preferredStack": string[], "remotePreference": "remote"|"hybrid"|"onsite"|"flexible", "seniorityLevel": "junior"|"mid"|"senior"|"staff"|"principal" }\`;

      const userPrompt = all.map(m => m.memory).join('\\n');

      const raw = await withFallback(llm => llm.generate({
        system: systemPrompt,
        user: userPrompt,
        json: true,
        maxOutputTokens: 2000
      }));

      const parsed = JSON.parse(raw);
      await this.addMemory(userId, "PREFERENCE_SUMMARY: " + JSON.stringify(parsed), "preference");
      console.log(\`[MemoryService] Synthesized preferences for \${userId}\`);
    } catch (e: any) {
      console.error("[MemoryService] Failed to synthesize preferences:", e.message);
    }
  }

  async getPreferenceSummary(userId: string): Promise<string> {
    try {
      if (!this.mem0) return "";
      const results = await this.mem0.search("PREFERENCE_SUMMARY", { user_id: userId });
      
      const res = Array.isArray(results) ? results : (results as any).results;
      if (res && res.length > 0) {
        // filter down to just the summary or just return the closest.
        const summary = res.find((r: any) => r.memory && r.memory.includes("PREFERENCE_SUMMARY"));
        if (summary) return summary.memory;
      }
      return "";
    } catch (e: any) {
      return "";
    }
  }

  // ─── Core API`;

code = code.replace('  // ─── Core API', methodsStr);

fs.writeFileSync(file, code);
