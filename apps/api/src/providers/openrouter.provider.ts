import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";
import { rateLimit } from "../lib/rate-limiter.js";

export class OpenRouterProvider extends BaseProvider {
  readonly name = "openrouter" as const;
  async _generate(params: LlmGenerateParams, isRetry = false): Promise<string> {
    if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");
    await rateLimit();
    
    const reqInit: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({ model:env.OPENROUTER_MODEL, response_format:params.json?{type:"json_object"}:undefined, messages:[{role:"system",content:params.system},{role:"user",content:params.user}], temperature:params.temperature??0.2 }),
      signal: AbortSignal.timeout(30000)
    };
    
    let res = await fetch("https://openrouter.ai/api/v1/chat/completions", reqInit);
    
    if (res.status === 429 && !isRetry) {
      console.warn("[OpenRouter] Rate limited (429), retrying...");
      await new Promise(r => setTimeout(r, 5000));
      res = await fetch("https://openrouter.ai/api/v1/chat/completions", reqInit);
    }
    
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {choices?:Array<{message?:{content?:string}}>};
    return this.normalizeJson(data.choices?.[0]?.message?.content??"");
  }
}
