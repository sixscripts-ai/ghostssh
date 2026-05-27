import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class TetrateProvider extends BaseProvider {
  readonly name = "tetrate" as const;

  async _generate(params: LlmGenerateParams, isRetry = false): Promise<string> {
    const key = params.apiKey || env.TETRATE_API_KEY;
    if (!key) throw new Error("TETRATE_API_KEY missing");
    
    // Tetrate uses an OpenAI-compatible /v1/chat/completions endpoint
    const reqInit: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: env.TETRATE_MODEL,
        response_format: params.json ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user }
        ],
        temperature: params.temperature ?? 0.2
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    };
    
    let res = await fetch("https://api.router.tetrate.ai/v1/chat/completions", reqInit);
    
    // Retry once on 429 rate limit
    if (res.status === 429 && !isRetry) {
      console.warn("[Tetrate] Rate limited (429), retrying...");
      await new Promise(r => setTimeout(r, 5000));
      res = await fetch("https://api.router.tetrate.ai/v1/chat/completions", reqInit);
    }
    
    if (!res.ok) {
      throw new Error(`Tetrate error: ${res.status} ${await res.text()}`);
    }
    
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return this.normalizeJson(data.choices?.[0]?.message?.content ?? "");
  }
}
