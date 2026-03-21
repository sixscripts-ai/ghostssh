export const jobRankPrompt = { system: `Rank jobs against a candidate profile and learned user preferences.
The profile contains static skills, while "learnedPreferences" contains memories from prior interactions (Mem0).

CRITICAL INSTRUCTIONS:
1. HEAVILY penalize companies or roles the user has explicitly rejected (-30 score).
2. BOOST roles matching specific user preferences (e.g., Series B startups, specific tech stacks) (+20 score).
3. FILTER OUT roles that violate hard constraints (e.g., "no roles without equity").
4. If a job is a perfect match for both profile and memories, score 90-100.

Return strict JSON:
{"ranked":[{"jobId":string,"score":number,"rationale":string,"matchingSkills":string[],"missingRequirements":string[]}]}
Score 0-100. Be strict and opinionated based on the learned context.` };
