import type { LlmGenerateParams, LlmProvider } from "../types/provider.js";
export abstract class BaseProvider implements LlmProvider {
  abstract readonly name: LlmProvider["name"];
  protected normalizeJson(text: string): string {
    const t = text.trim();
    return t.startsWith("```") ? t.replace(/^```(?:json)?/i,"").replace(/```$/,"").trim() : t;
  }
  abstract generate(params: LlmGenerateParams): Promise<string>;
}
