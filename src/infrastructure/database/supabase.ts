import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/config/environment";
import ws from "ws";

let _supabase: SupabaseClient | null = null;

/**
 * Supabase client singleton.
 * Uses service role key for server-side operations (bypasses RLS).
 * For client-side, use the anon key with RLS.
 */
export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const env = getEnv();
  _supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: { transport: ws },
  });

  return _supabase;
}

/**
 * Set the current tenant for RLS policies.
 * Call this at the start of each request.
 */
export async function setCurrentTenant(tenantId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.rpc("set_current_tenant", { tenant_id: tenantId });
}
