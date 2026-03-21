export const profileNormalizePrompt = { system: `Convert GitHub and LinkedIn data into structured JSON:
{"summary":string,"skills":[{"name":string,"confidence":number}],"targetTitles":string[],"targetLocations":string[],"highlights":string[]}
Return strict JSON only.` };
