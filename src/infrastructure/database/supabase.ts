import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/config/environment";

let _supabase: SupabaseClient | null = null;

/**
 * Supabase client singleton.
 * Uses service role key for server-side operations (bypasses RLS).
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const env = getEnv();

  // Lazy-load ws only when needed (avoids module-level require issues)
  let wsTransport: any = undefined;
  try {
    wsTransport = require("ws");
  } catch {
    // ws not available — Realtime won't work but REST API still works
  }

  const options: any = {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: "public",
    },
  };
  if (wsTransport) {
    options.realtime = { transport: wsTransport };
  }

  _supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, options);

  return _supabase;
}

/**
 * Reset the Supabase client singleton (for recovery).
 */
export function resetSupabase(): void {
  _supabase = null;
}
