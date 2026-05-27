export type ProviderName = "minimax" | "openai" | "anthropic" | "gemini" | "openrouter" | "tetrate" | "deepinfra" | "groq";

export type LlmGenerateParams = {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  apiKey?: string;
  json?: boolean;
};

export interface LlmProvider {
  readonly name: ProviderName;
  generate(params: LlmGenerateParams): Promise<string>;
}
