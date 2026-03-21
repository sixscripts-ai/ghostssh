import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class OpenAIProvider extends BaseProvider {
  readonly name = "openai" as const;
  async generate(params: LlmGenerateParams): Promise<string> {
    if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${env.OPENAI_API_KEY}`},
      body: JSON.stringify({ model:env.OPENAI_MODEL, temperature:params.temperature??0.2, max_tokens:params.maxOutputTokens??2000, response_format:params.json?{type:"json_object"}:undefined, messages:[{role:"system",content:params.system},{role:"user",content:params.user}] })
    });
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    const data = (await res.json()) as {choices?:Array<{message?:{content?:string}}>};
    return this.normalizeJson(data.choices?.[0]?.message?.content??"");
  }
}
