import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

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
    const fieldErrors = result.error.flatten().fieldErrors;
    const missing = Object.entries(fieldErrors)
      .filter(([, v]) => v && v.length > 0)
      .map(([k, v]) => `${k}: ${v!.join(", ")}`);
    console.error("Invalid environment variables:");
    for (const line of missing) console.error(`  - ${line}`);
    throw new Error(`Invalid environment. Fix the variables above (see .env.example).`);
  }

  _env = result.data;
  return _env;
}
