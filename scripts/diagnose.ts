import { config } from "dotenv";
config({ path: ".env.local" });

async function diagnose() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log("=== DIAGNÓSTICO SUPABASE ===");
  console.log("URL:", url);
  console.log("Key length:", key.length);

  // Test 1: Basic fetch to Supabase REST API
  console.log("\n--- Test 1: fetch directo a Supabase ---");
  try {
    const res = await fetch(`${url}/rest/v1/tenants?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body:", body.slice(0, 200));
  } catch (err: any) {
    console.error("FETCH ERROR:", err.message);
    console.error("Cause:", err.cause?.message);
  }

  // Test 2: createClient from @supabase/supabase-js (same as bot)
  console.log("\n--- Test 2: createClient + select ---");
  try {
    const ws = require("ws");
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws },
    });

    const { data, error } = await supabase.from("tenants").select("id").limit(1);
    if (error) {
      console.error("SUPABASE ERROR:", error.message, error.code, error.details);
    } else {
      console.log("OK:", JSON.stringify(data));
    }

    // Test 3: Insert conversation (same as handler)
    console.log("\n--- Test 3: Insert conversation ---");
    const { data: conv, error: e2 } = await supabase
      .from("conversations")
      .insert({
        tenant_id: "00000000-0000-0000-0000-000000000001",
        phone: "test_diagnostic",
        name: "Diagnostic Test",
        jid: "test@lid",
        mode: "AI",
      })
      .select()
      .single();
    if (e2) {
      console.error("INSERT ERROR:", e2.message, e2.code, e2.details);
    } else {
      console.log("OK: created", conv.id);
      // Cleanup
      await supabase.from("conversations").delete().eq("id", conv.id);
      console.log("Cleaned up");
    }
  } catch (err: any) {
    console.error("MODULE ERROR:", err.message);
    console.error("Stack:", err.stack);
  }
}

diagnose()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
