import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class DeepInfraProvider extends BaseProvider {
  readonly name = "deepinfra" as const;
  async _generate(params: LlmGenerateParams): Promise<string> {
    const key = params.apiKey || env.DEEPINFRA_API_KEY;
    if (!key) throw new Error("DEEPINFRA_API_KEY missing");
    const res = await fetch("https://api.deepinfra.com/v1/openai/chat/completions", {
      method:"POST", headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body: JSON.stringify({ model:env.DEEPINFRA_MODEL, temperature:params.temperature??0.2, max_tokens:params.maxOutputTokens??2000, response_format:params.json?{type:"json_object"}:undefined, messages:[{role:"system",content:params.system},{role:"user",content:params.user}] })
    });
    if (!res.ok) throw new Error(`DeepInfra error: ${await res.text()}`);
    const data = (await res.json()) as {choices?:Array<{message?:{content?:string}}>};
    return this.normalizeJson(data.choices?.[0]?.message?.content??"");
  }
}
