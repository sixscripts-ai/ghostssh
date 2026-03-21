import { Anthropic } from "@anthropic-ai/sdk";
import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class AnthropicProvider extends BaseProvider {
  readonly name = "anthropic" as const;
  private readonly client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  async _generate(params: LlmGenerateParams): Promise<string> {
    if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");
    const res = await this.client.messages.create({ model: env.ANTHROPIC_MODEL, system: params.system, max_tokens: params.maxOutputTokens??2000, temperature: params.temperature??0.2, messages:[{role:"user",content:params.user}] });
    return this.normalizeJson(res.content.filter((c: any) => c.type==="text").map((c: any) => c.text).join("\n"));
  }
}
