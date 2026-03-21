import { env } from "../config/env.js";
import type { LlmProvider, ProviderName } from "../types/provider.js";
import { MinimaxProvider } from "./minimax.provider.js";
import { AnthropicProvider } from "./anthropic.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { OpenRouterProvider } from "./openrouter.provider.js";

const providers: Record<ProviderName, LlmProvider> = {
  minimax: new MinimaxProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
  openrouter: new OpenRouterProvider(),
};

export function getProvider(name?: ProviderName): LlmProvider {
  return providers[name ?? env.DEFAULT_PROVIDER];
}

export async function withFallback<T>(op: (p: LlmProvider) => Promise<T>, preferred?: ProviderName): Promise<T> {
  try { return await op(getProvider(preferred)); }
  catch { return await op(getProvider(env.FALLBACK_PROVIDER)); }
}
