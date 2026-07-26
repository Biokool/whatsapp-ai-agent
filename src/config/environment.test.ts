import { describe, it, expect, beforeAll } from "vitest";
import { getEnv } from "./environment";

describe("Environment Config", () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("returns default values in development", () => {
    const env = getEnv();
    expect(env.NODE_ENV).toBeDefined();
    expect(env.LLM_RATE_LIMIT_MAX_REQUESTS).toBe(10);
    expect(env.LLM_RATE_LIMIT_WINDOW_MS).toBe(60000);
  });

  it("has OpenRouter model default", () => {
    const env = getEnv();
    expect(env.OPENROUTER_MODEL).toBe("google/gemini-2.0-flash-001");
  });
});
