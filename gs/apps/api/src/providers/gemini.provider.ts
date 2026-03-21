import { GoogleGenAI } from "@google/genai";
import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class GeminiProvider extends BaseProvider {
  readonly name = "gemini" as const;
  private readonly client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  async generate(params: LlmGenerateParams): Promise<string> {
    if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
    const res = await this.client.models.generateContent({ model:env.GEMINI_MODEL, contents:`${params.system}\n\n${params.user}`, config:{temperature:params.temperature??0.2,responseMimeType:params.json?"application/json":"text/plain"} });
    return this.normalizeJson(res.text??"");
  }
}
