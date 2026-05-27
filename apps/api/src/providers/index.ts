import { env } from "../config/env.js";
import type { LlmProvider, ProviderName } from "../types/provider.js";
import { MinimaxProvider } from "./minimax.provider.js";
import { AnthropicProvider } from "./anthropic.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { OpenRouterProvider } from "./openrouter.provider.js";
import { TetrateProvider } from "./tetrate.provider.js";

const providers: Record<ProviderName, () => LlmProvider> = {
  minimax: () => new MinimaxProvider(),
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
  gemini: () => new GeminiProvider(),
  openrouter: () => new OpenRouterProvider(),
  tetrate: () => new TetrateProvider(),
};

export function getProvider(name?: ProviderName): LlmProvider {
  const providerFn = providers[name ?? env.DEFAULT_PROVIDER];
  return providerFn();
}

export async function withFallback<T>(op: (p: LlmProvider) => Promise<T>, preferred?: ProviderName): Promise<T> {
  const primaryName = preferred || env.DEFAULT_PROVIDER;
  try { return await op(getProvider(primaryName)); }
  catch (e: any) {
    console.error(`[withFallback] Provider ${primaryName} failed:`, e.message);
    if (primaryName === env.FALLBACK_PROVIDER) {
      console.warn(`[withFallback] Primary matches fallback (${env.FALLBACK_PROVIDER}). Attempting secondary fallback to minimax.`);
      return await op(getProvider("minimax"));
    }
    return await op(getProvider(env.FALLBACK_PROVIDER));
  }
}
