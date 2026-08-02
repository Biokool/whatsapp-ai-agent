import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import ws from "ws";
const envFile = fs.readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});
const { data: kbs } = await supabase.from("knowledge_bases").select("*");
console.log("=== ALL KBs ===");
kbs?.forEach(kb => console.log(`${kb.id} | ${kb.name}`));
const { data: docs } = await supabase.from("documents").select("*");
console.log("\n=== ALL documents ===");
docs?.forEach(d => console.log(`${d.id} | kb=${d.knowledge_base_id} | ${d.title} | status=${d.status} | chunks=${d.chunk_count} | err=${d.error_message??"-"} | created=${d.created_at} | updated=${d.updated_at}`));
