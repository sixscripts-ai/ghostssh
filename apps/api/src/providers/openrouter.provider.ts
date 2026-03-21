import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class OpenRouterProvider extends BaseProvider {
  readonly name = "openrouter" as const;
  async generate(params: LlmGenerateParams): Promise<string> {
    if (!env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY missing");
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.OPENROUTER_API_KEY}`},
      body: JSON.stringify({ model:env.OPENROUTER_MODEL, response_format:params.json?{type:"json_object"}:undefined, messages:[{role:"system",content:params.system},{role:"user",content:params.user}], temperature:params.temperature??0.2 })
    });
    if (!res.ok) throw new Error(`OpenRouter error: ${await res.text()}`);
    const data = (await res.json()) as {choices?:Array<{message?:{content?:string}}>};
    return this.normalizeJson(data.choices?.[0]?.message?.content??"");
  }
}
