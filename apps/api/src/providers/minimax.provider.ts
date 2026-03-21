import { BaseProvider } from "./base.js";
import type { LlmGenerateParams } from "../types/provider.js";
import { env } from "../config/env.js";

export class MinimaxProvider extends BaseProvider {
  readonly name = "minimax" as const;

  async _generate(params: LlmGenerateParams): Promise<string> {
    if (!env.MINIMAX_API_KEY) throw new Error("MINIMAX_API_KEY missing");

    const res = await fetch("https://api.minimaxi.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.MINIMAX_MODEL,
        temperature: params.temperature ?? 0.2,
        max_tokens: params.maxOutputTokens ?? 2000,
        response_format: params.json ? { type: "json_object" } : { type: "text" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user },
        ],
      }),
    });

    if (!res.ok) throw new Error(`Minimax error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return this.normalizeJson(data.choices?.[0]?.message?.content ?? "");
  }
}
