import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  MINIMAX_API_KEY: z.string().optional(),
  MINIMAX_MODEL: z.string().default("MiniMax-M2.5"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-5"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-pro"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o"),
  DEFAULT_PROVIDER: z.enum(["minimax","openai","anthropic","gemini","openrouter"]).default("minimax"),
  FALLBACK_PROVIDER: z.enum(["minimax","openai","anthropic","gemini","openrouter"]).default("anthropic"),
  GITHUB_TOKEN: z.string().optional(),
  USER_AGENT: z.string().default("ghostssh/1.0"),

  // Mem0 Cloud Memory
  MEM0_API_KEY: z.string().optional(),

  // Appwrite
  APPWRITE_ENDPOINT: z.string().default("https://cloud.appwrite.io/v1"),
  APPWRITE_PROJECT_ID: z.string().optional(),
  APPWRITE_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
