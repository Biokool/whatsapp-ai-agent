import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log("URL:", url);
console.log("Key:", key?.slice(0, 20) + "...");

const ws = require("ws");

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

async function test() {
  // 1. Test basic connectivity
  console.log("\n--- Test 1: List conversations ---");
  const { data: convs, error: e1 } = await supabase.from("conversations").select("*").limit(5);
  if (e1) console.log("ERROR:", e1.message, e1.code, e1.details);
  else console.log("OK:", convs?.length, "conversations");

  // 2. Test insert conversation
  console.log("\n--- Test 2: Insert conversation ---");
  const { data: newConv, error: e2 } = await supabase
    .from("conversations")
    .insert({
      tenant_id: "00000000-0000-0000-0000-000000000001",
      phone: "test_bot_check",
      name: "Bot Check",
      mode: "AI",
    })
    .select()
    .single();
  if (e2) console.log("ERROR:", e2.message, e2.code, e2.details);
  else {
    console.log("OK: created conversation", newConv.id);

    // 3. Test insert message
    console.log("\n--- Test 3: Insert message ---");
    const { data: newMsg, error: e3 } = await supabase
      .from("messages")
      .insert({
        conversation_id: newConv.id,
        role: "user",
        content: "test message from bot check",
      })
      .select("id")
      .single();
    if (e3) console.log("ERROR:", e3.message, e3.code, e3.details);
    else console.log("OK: created message", newMsg.id);

    // 4. Cleanup
    console.log("\n--- Cleanup ---");
    await supabase.from("messages").delete().eq("conversation_id", newConv.id);
    await supabase.from("conversations").delete().eq("id", newConv.id);
    console.log("OK: cleaned up");
  }

  // 5. Test tenants table
  console.log("\n--- Test 4: Check tenants ---");
  const { data: tenants, error: e4 } = await supabase.from("tenants").select("*").limit(5);
  if (e4) console.log("ERROR:", e4.message, e4.code, e4.details);
  else
    console.log(
      "OK:",
      tenants?.length,
      "tenants:",
      tenants?.map((t) => t.name)
    );
}

test()
  .catch(console.error)
  .finally(() => process.exit(0));
