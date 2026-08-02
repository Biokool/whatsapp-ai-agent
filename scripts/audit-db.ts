import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabase } from "../src/infrastructure/database/supabase";

async function audit() {
  const s = getSupabase();

  console.log("=== CONVERSATIONS ===");
  const { data: convs, error: e1 } = await s
    .from("conversations")
    .select("id,phone,jid,name,mode,last_message_at");
  if (e1) console.log("ERROR:", e1.message, e1);
  else console.log(JSON.stringify(convs, null, 2));

  console.log("\n=== MESSAGES (last 10) ===");
  const { data: msgs, error: e2 } = await s
    .from("messages")
    .select("id,conversation_id,role,content,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (e2) console.log("ERROR:", e2.message, e2);
  else console.log(JSON.stringify(msgs, null, 2));

  console.log("\n=== TENANTS ===");
  const { data: tenants } = await s.from("tenants").select("*");
  console.log(JSON.stringify(tenants, null, 2));
}

audit()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
