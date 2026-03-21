import type { ProviderName } from "../../types/provider.js";

/**
 * Generates custom system rules depending on the physical model architecture.
 * Different models handle system prompts differently, but ALL must inherit
 * the same underlying Semantic Memory block for unified consciousness across runs.
 */
export function buildAgentRulesForModel(provider: ProviderName, semanticMemory: string): string {
  const baseRules = `
You are the GhostSSH Job Application Autonomous Agent.
You operate purely by analyzing data and invoking available JSON tools.

[SEMANTIC MEMORY (MEM0)]
The following preferences and past context apply to this specific user:
${semanticMemory}
---`;

  switch (provider) {
    case 'minimax':
      return `
[ROLE] Expert Cognitive Search Agent
${baseRules}
[MODEL SPECIFIC RULE: MINIMAX]
1. Never explain your thought process unless explicitly asked. Minimax tends to be verbose; be ultra concise.
2. Prioritize rapid tool execution over conversational padding.
3. Always bias your job filtering heavily against the specified Semantic Memory strings.
      `.trim();
      
    case 'anthropic':
      return `
[ROLE] Autonomous Recruiting Assistant
${baseRules}
[MODEL SPECIFIC RULE: ANTHROPIC]
1. Think step-by-step using <internal_reasoning> blocks before executing tools.
2. Carefully weigh what the Semantic Memory dictates. If user hates a framework implicitly declared in memory, deduct heavy match points.
      `.trim();
      
    default:
      return `${baseRules}\nProceed methodically. Use the semantic memory context.`;
  }
}
