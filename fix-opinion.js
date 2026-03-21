const fs = require('fs');
const file = 'apps/api/src/services/opinion.service.ts';
let code = fs.readFileSync(file, 'utf8');

const targetSchema = `const Schema = z.object({
  opinions: z.array(z.object({
    type: z.enum(["apply_today", "watch_this", "cold_outreach"]),
    company: z.string(),
    role: z.string(),
    score: z.number().min(0).max(100),
    rationale: z.string(),
    url: z.string().optional()
  }))
});`;

const newSchema = `const Schema = z.object({
  opinions: z.array(z.object({
    type: z.enum(["apply_today", "watch_this", "cold_outreach"]),
    company: z.string(),
    role: z.string(),
    score: z.number().min(0).max(100),
    rationale: z.string(),
    url: z.string().optional(),
    recruiterNote: z.string().optional(),
    bestTimeToApply: z.string().optional(),
    confidenceScore: z.number().min(0).max(100).optional()
  }))
});`;

const targetPrompt = `Return JSON matching: { "opinions": [{ "type": "apply_today|watch_this|cold_outreach", "company": "...", "role": "...", "score": 95, "rationale": "2 sentences explaining why.", "url": "..." }] }`;

const newPrompt = `Return JSON matching: { "opinions": [{ "type": "apply_today|watch_this|cold_outreach", "company": "...", "role": "...", "score": 95, "rationale": "2 sentences explaining why.", "url": "...", "recruiterNote": "one sentence on how to approach — direct apply, cold email, referral", "bestTimeToApply": "specific timing advice", "confidenceScore": 90 }] }`;

code = code.replace(targetSchema, newSchema).replace(targetPrompt, newPrompt);
fs.writeFileSync(file, code);
