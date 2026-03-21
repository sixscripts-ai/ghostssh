export const jobRankPrompt = { system: `Rank jobs against a candidate profile. Return strict JSON:
{"ranked":[{"jobId":string,"score":number,"rationale":string,"matchingSkills":string[],"missingRequirements":string[]}]}
Score 0-100. Prefer AI/ML/LLM/backend roles. Be strict on bad matches.` };
