export type ProviderName = "minimax" | "openai" | "anthropic" | "gemini" | "openrouter";

export type LlmGenerateParams = {
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  json?: boolean;
};

export interface LlmProvider {
  readonly name: ProviderName;
  generate(params: LlmGenerateParams): Promise<string>;
}
