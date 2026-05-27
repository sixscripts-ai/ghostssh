import { GoogleGenAI } from "@google/genai";
import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class GeminiProvider extends BaseProvider {
  readonly name = "gemini" as const;
  private getClient(apiKey?: string) {
    const key = apiKey || env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY missing");
    return new GoogleGenAI({ apiKey: key });
  }

  async _generate(params: LlmGenerateParams): Promise<string> {
    const res = await this.getClient(params.apiKey).models.generateContent({ model:env.GEMINI_MODEL, contents:`${params.system}\n\n${params.user}`, config:{temperature:params.temperature??0.2,responseMimeType:params.json?"application/json":"text/plain"} });
    return this.normalizeJson(res.text??"");
  }
}
