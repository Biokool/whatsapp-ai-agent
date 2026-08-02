import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabase } from "../src/infrastructure/database/supabase";

const supabase = getSupabase();

console.log("=== TEST REALTIME WITHOUT FILTER ===");

const channel = supabase
  .channel("test-outbox-nofilter")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
      // NO filter — receive all INSERTs
    },
    (payload) => {
      const msg = payload.new as any;
      console.log("EVENT:", msg.role, msg.content?.slice(0, 40));
    }
  )
  .subscribe((status) => {
    console.log("Status:", status);
    if (status === "SUBSCRIBED") {
      console.log("OK - inserting test messages...");
      setTimeout(async () => {
        const { data: conv } = await supabase.from("conversations").select("id").limit(1).single();
        if (!conv) {
          console.log("No conv");
          process.exit(1);
        }

        // Insert human message
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          role: "human",
          content: "test human " + Date.now(),
        });
        console.log("Inserted human message");

        // Insert user message
        await supabase.from("messages").insert({
          conversation_id: conv.id,
          role: "user",
          content: "test user " + Date.now(),
        });
        console.log("Inserted user message");
      }, 2000);
    }
  });

setTimeout(() => {
  supabase.removeChannel(channel);
  process.exit(0);
}, 12000);
