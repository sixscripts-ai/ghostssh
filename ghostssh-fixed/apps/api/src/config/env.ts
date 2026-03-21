import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  // Primary
  MINIMAX_API_KEY: z.string().optional(),
  MINIMAX_MODEL: z.string().default("MiniMax-M2.7"),

  // Fallbacks
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

  // Mem0
  MEM0_API_KEY: z.string().optional(),

  // Jina AI scraper
  JINA_API_KEY: z.string().optional(),

  // Cron auth
  CRON_SECRET: z.string().optional(),

  // Appwrite — no hardcoded defaults, fail loudly if missing
  APPWRITE_ENDPOINT: z.string().default("https://sfo.cloud.appwrite.io/v1"),
  APPWRITE_PROJECT_ID: z.string().optional(),
  APPWRITE_API_KEY: z.string().optional(),
  APPWRITE_DATABASE_ID: z.string().default("ghostssh"),
  APPWRITE_JOBS_COLLECTION_ID: z.string().default("jobs"),
  APPWRITE_PROFILES_COLLECTION_ID: z.string().default("profiles"),
  APPWRITE_APPLICATIONS_COLLECTION_ID: z.string().default("applications"),
});

export const env = EnvSchema.parse(process.env);
