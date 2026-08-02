import { config } from "dotenv";
config({ path: ".env.local" });
import { getSupabase } from "../src/infrastructure/database/supabase";

async function check() {
  const s = getSupabase();

  // Check Realtime publication tables via REST
  console.log("=== Checking supabase_realtime publication ===");

  // The messages table needs to be in the publication for Realtime to work
  // Let's check by trying to subscribe and see if it errors
  console.log("Testing Realtime subscription on messages table...");

  const channel = s.channel("test-check");

  let receivedEvent = false;

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
    },
    (payload) => {
      console.log("Realtime event received:", payload.eventType, payload.new?.id);
      receivedEvent = true;
    }
  );

  channel.subscribe((status) => {
    console.log("Channel status:", status);
    if (status === "SUBSCRIBED") {
      console.log("Realtime subscription OK - table is in publication");
      setTimeout(() => {
        if (!receivedEvent) {
          console.log("No events yet (expected if no inserts happening)");
        }
        s.removeChannel(channel);
        process.exit(0);
      }, 3000);
    } else if (status === "CHANNEL_ERROR") {
      console.log("CHANNEL ERROR - table probably NOT in publication");
      s.removeChannel(channel);
      process.exit(1);
    }
  });

  // Safety timeout
  setTimeout(() => {
    console.log("Timeout - exiting");
    s.removeChannel(channel);
    process.exit(0);
  }, 10000);
}

check();
