import type { LlmGenerateParams, LlmProvider } from "../types/provider.js";
import { guardTokenLimit, COST_LIMITS } from "../lib/cost-guard.js";

export abstract class BaseProvider implements LlmProvider {
  abstract readonly name: LlmProvider["name"];
  
  protected normalizeJson(text: string): string {
    const t = text.trim();
    return t.startsWith("```") ? t.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim() : t;
  }
  
  async generate(params: LlmGenerateParams): Promise<string> {
    params.user = guardTokenLimit(params.user, COST_LIMITS.rankingBatch, "provider_input");
    return this._generate(params);
  }

  protected abstract _generate(params: LlmGenerateParams): Promise<string>;
}

