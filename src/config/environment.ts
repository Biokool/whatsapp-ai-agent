import { z } from "zod";

const envSchema = z.object({
  // LLM
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.0-flash-001"),

  // Dashboard Auth
  DASHBOARD_USER: z.string().optional(),
  DASHBOARD_PASSWORD: z.string().optional(),

  // Rate Limiting
  LLM_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
  LLM_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    // Return defaults in development, throw in production
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
    _env = envSchema.parse({});
    return _env;
  }

  _env = result.data;
  return _env;
}
