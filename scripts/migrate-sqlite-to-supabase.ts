import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import fs from "node:fs";
import ws from "ws";

// ============================================================
// SQLite → Supabase Migration Script
// ============================================================

const SQLITE_PATH = path.resolve(process.cwd(), "data/messages.db");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`SQLite database not found at ${SQLITE_PATH}`);
  process.exit(1);
}

const sqlite = new Database(SQLITE_PATH, { readonly: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
});

async function migrate() {
  console.log("Starting migration from SQLite to Supabase...\n");

  // 1. Ensure default tenant exists
  console.log("1. Creating default tenant...");
  const { error: tenantError } = await supabase
    .from("tenants")
    .upsert({ id: DEFAULT_TENANT_ID, name: "Biokool", slug: "biokool" }, { onConflict: "id" });
  if (tenantError) throw new Error(`Tenant error: ${tenantError.message}`);
  console.log("   ✓ Default tenant ready\n");

  // 2. Migrate conversations
  console.log("2. Migrating conversations...");
  const conversations = sqlite.prepare("SELECT * FROM conversations").all() as Array<{
    id: number;
    phone: string;
    name: string | null;
    jid: string | null;
    mode: string;
    last_message_at: number | null;
    created_at: number;
  }>;

  let convCount = 0;
  const idMap = new Map<number, string>(); // old SQLite ID → new UUID

  for (const conv of conversations) {
    const newId = uuidv4();
    idMap.set(conv.id, newId);

    const { error } = await supabase.from("conversations").insert({
      id: newId,
      tenant_id: DEFAULT_TENANT_ID,
      phone: conv.phone,
      name: conv.name,
      jid: conv.jid,
      mode: conv.mode,
      last_message_at: conv.last_message_at
        ? new Date(conv.last_message_at * 1000).toISOString()
        : null,
      created_at: new Date(conv.created_at * 1000).toISOString(),
    });

    if (error) throw new Error(`Conversation error: ${error.message}`);
    convCount++;
  }
  console.log(`   ✓ ${convCount} conversations migrated\n`);

  // 3. Migrate messages
  console.log("3. Migrating messages...");
  const messages = sqlite.prepare("SELECT * FROM messages").all() as Array<{
    id: number;
    conversation_id: number;
    role: string;
    content: string;
    created_at: number;
  }>;

  let msgCount = 0;
  const batchSize = 100;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    const inserts = batch.map((msg) => ({
      conversation_id: idMap.get(msg.conversation_id) || uuidv4(),
      role: msg.role,
      content: msg.content,
      created_at: new Date(msg.created_at * 1000).toISOString(),
    }));

    const { error } = await supabase.from("messages").insert(inserts);
    if (error) throw new Error(`Messages error: ${error.message}`);
    msgCount += batch.length;
    process.stdout.write(`   Migrated ${msgCount}/${messages.length} messages\r`);
  }
  console.log(`\n   ✓ ${msgCount} messages migrated\n`);

  // 4. Summary
  console.log("Migration complete!");
  console.log(`   Conversations: ${convCount}`);
  console.log(`   Messages: ${msgCount}`);
  console.log(`   Tenant: Biokool (${DEFAULT_TENANT_ID})`);
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
