# Phase 04 Implementation Plan — Full Supabase Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the entire data layer from SQLite to Supabase (PostgreSQL) + Redis, unifying all data in one platform.

**Architecture:** Baileys + Next.js both use Supabase client (async/HTTP). Outbox replaced by Supabase Realtime. connection_state moved to Redis. Multi-tenancy via tenant_id + RLS.

**Tech Stack:** `@supabase/supabase-js`, `ioredis`, `uuid`, PostgreSQL (Supabase free tier), Redis (Upstash free tier or local)

## Global Constraints

- Supabase free tier: 500MB database, 1GB file storage, 50K monthly active users
- Redis free tier (Upstash): 10K commands/day, 256MB storage
- UUIDs for all primary keys (replace INTEGER AUTOINCREMENT)
- TIMESTAMPTZ for all timestamps (replace unix epoch INTEGER)
- Default tenant: `00000000-0000-0000-0000-000000000001` (Biokool)
- Keep existing functionality working (conversations, messages, mode toggle, human reply)

---

## File Structure

```
NEW:
  src/infrastructure/database/supabase.ts      # Supabase client singleton
  src/infrastructure/database/schema.sql        # Full PostgreSQL schema
  src/infrastructure/cache/redis.ts             # Redis client
  src/infrastructure/cache/connection-state.ts  # connection_state in Redis
  src/core/types/database.ts                    # All TypeScript interfaces
  scripts/migrate-sqlite-to-supabase.ts         # Data migration script
  .env.example                                  # Updated with Supabase + Redis vars

MODIFY:
  src/lib/db.ts                                 # REWRITE: Supabase queries
  src/lib/baileys/client.ts                     # MODIFY: Use Redis for connection_state
  src/lib/baileys/handler.ts                    # MODIFY: Use Supabase
  src/lib/baileys/outbox.ts                     # REWRITE: Supabase Realtime
  src/app/api/conversations/route.ts            # MODIFY: Use Supabase
  src/app/api/conversations/[conversationId]/route.ts  # MODIFY: Use Supabase
  src/app/api/messages/[conversationId]/route.ts       # MODIFY: Use Supabase
  src/app/api/mode/[conversationId]/route.ts           # MODIFY: Use Supabase
  src/app/api/connection/status/route.ts               # MODIFY: Use Redis
  src/app/api/connection/disconnect/route.ts           # MODIFY: Use Redis + Supabase
  src/app/api/health/route.ts                          # MODIFY: Use Supabase
  src/middleware.ts                                    # MODIFY: Add tenant resolution
  src/config/environment.ts                            # MODIFY: Add Supabase + Redis vars
  package.json                                         # MODIFY: Add dependencies
```

---

### Task 1: Install Dependencies

**Files:**

- Modify: `package.json`

**Dependencies to add:**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.0",
    "ioredis": "^5.6.0",
    "uuid": "^11.1.0"
  },
  "devDependencies": {
    "@types/uuid": "^10.0.0"
  }
}
```

- [ ] **Step 1: Install packages**

```bash
npm install @supabase/supabase-js ioredis uuid --legacy-peer-deps
npm install -D @types/uuid --legacy-peer-deps
```

- [ ] **Step 2: Verify installation**

```bash
npm ls @supabase/supabase-js ioredis uuid
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add supabase-js, ioredis, uuid dependencies"
```

---

### Task 2: Update Environment Config

**Files:**

- Modify: `src/config/environment.ts`

- [ ] **Step 1: Add Supabase + Redis env vars**

```typescript
import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // LLM
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_MODEL: z.string().default("google/gemini-2.0-flash-001"),

  // Dashboard Auth
  DASHBOARD_USER: z.string().optional(),
  DASHBOARD_PASSWORD: z.string().optional(),

  // Rate Limiting
  LLM_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(10),
  LLM_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),

  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid environment variables");
    }
    _env = envSchema.parse({});
    return _env;
  }

  _env = result.data;
  return _env;
}
```

- [ ] **Step 2: Update .env.example**

```env
# Supabase (free tier)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (Upstash free tier or local)
REDIS_URL=redis://localhost:6379

# LLM
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.0-flash-001

# Dashboard Auth
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=biokool2026

# Rate Limiting
LLM_RATE_LIMIT_MAX_REQUESTS=10
LLM_RATE_LIMIT_WINDOW_MS=60000
```

- [ ] **Step 3: Update .env.local with your Supabase credentials**

Add the Supabase URL and keys from your Supabase dashboard (Settings → API).

- [ ] **Step 4: Commit**

```bash
git add src/config/environment.ts .env.example
git commit -m "feat: add Supabase + Redis environment variables"
```

---

### Task 3: Create Core Types

**Files:**

- Create: `src/core/types/database.ts`

- [ ] **Step 1: Define all database types**

```typescript
// ============================================================
// Database Types — Supabase (PostgreSQL)
// ============================================================

export type ConversationMode = "AI" | "HUMAN";
export type MessageRole = "user" | "assistant" | "human";
export type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected";
export type ConversationStatus = "active" | "closed" | "archived";
export type LeadStatus = "new" | "qualified" | "disqualified" | "converted";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";

export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  config: Record<string, unknown>;
  created_at: string; // TIMESTAMPTZ
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string; // UUID
  tenant_id: string;
  phone: string;
  name: string | null;
  jid: string | null;
  mode: ConversationMode;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationListItem extends Conversation {
  last_message_preview: string | null;
}

export interface Message {
  id: string; // UUID
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  contact_id: string;
  score: number;
  status: LeadStatus;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  meeting_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// Default tenant ID for single-tenant mode
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
```

- [ ] **Step 2: Commit**

```bash
git add src/core/types/database.ts
git commit -m "feat: add core database types for Supabase"
```

---

### Task 4: Create Supabase Client

**Files:**

- Create: `src/infrastructure/database/supabase.ts`

- [ ] **Step 1: Create Supabase client singleton**

```typescript
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/config/environment";

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
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/database/supabase.ts
git commit -m "feat: add Supabase client singleton"
```

---

### Task 5: Create Redis Client + Connection State

**Files:**

- Create: `src/infrastructure/cache/redis.ts`
- Create: `src/infrastructure/cache/connection-state.ts`

- [ ] **Step 1: Create Redis client**

```typescript
import Redis from "ioredis";
import { getEnv } from "@/config/environment";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const env = getEnv();
  _redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  _redis.on("error", (err) => {
    console.error("[Redis] connection error:", err.message);
  });

  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}
```

- [ ] **Step 2: Create connection_state in Redis**

```typescript
import { getRedis } from "./redis";
import type { ConnectionStatus } from "@/core/types/database";

const CONNECTION_KEY = "whatsapp:connection";

export interface ConnectionState {
  status: ConnectionStatus;
  qr_string: string | null;
  phone: string | null;
}

const DEFAULT_STATE: ConnectionState = {
  status: "disconnected",
  qr_string: null,
  phone: null,
};

export async function getConnectionState(): Promise<ConnectionState> {
  const redis = getRedis();
  const data = await redis.get(CONNECTION_KEY);
  if (!data) return DEFAULT_STATE;
  try {
    return JSON.parse(data) as ConnectionState;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setConnectionState(input: Partial<ConnectionState>): Promise<void> {
  const current = await getConnectionState();
  const next: ConnectionState = {
    status: input.status ?? current.status,
    qr_string: "qr_string" in input ? (input.qr_string ?? null) : current.qr_string,
    phone: "phone" in input ? (input.phone ?? null) : current.phone,
  };
  const redis = getRedis();
  await redis.set(CONNECTION_KEY, JSON.stringify(next));
}

export async function resetConnectionState(): Promise<void> {
  const redis = getRedis();
  await redis.set(CONNECTION_KEY, JSON.stringify(DEFAULT_STATE));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/infrastructure/cache/redis.ts src/infrastructure/cache/connection-state.ts
git commit -m "feat: add Redis client and connection_state cache"
```

---

### Task 6: Create PostgreSQL Schema

**Files:**

- Create: `src/infrastructure/database/schema.sql`

- [ ] **Step 1: Create full schema**

```sql
-- ============================================================
-- WhatsApp AI Agent — Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tenants
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default tenant for single-tenant mode
INSERT INTO tenants (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Biokool', 'biokool')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Conversations
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  phone TEXT NOT NULL,
  name TEXT,
  jid TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  status TEXT CHECK(status IN ('active','closed','archived')) NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_phone ON conversations(tenant_id, phone);

-- ============================================================
-- Messages
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- ============================================================
-- Contacts (for future CRM features)
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);

-- ============================================================
-- Leads (for future lead qualification)
-- ============================================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  contact_id UUID NOT NULL REFERENCES contacts(id),
  score INTEGER CHECK(score >= 0 AND score <= 10),
  status TEXT CHECK(status IN ('new','qualified','disqualified','converted')) NOT NULL DEFAULT 'new',
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);

-- ============================================================
-- Appointments (for future scheduling)
-- ============================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  lead_id UUID NOT NULL REFERENCES leads(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK(status IN ('scheduled','confirmed','completed','cancelled')) NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);

-- ============================================================
-- RAG Documents (for future knowledge base)
-- ============================================================
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rag_documents_tenant ON rag_documents(tenant_id);

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_messages ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
  ));

CREATE POLICY tenant_isolation_contacts ON contacts
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_appointments ON appointments
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_rag_documents ON rag_documents
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ============================================================
-- Function to set current tenant (for RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Realtime: Enable for conversations (for outbox replacement)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

- [ ] **Step 2: Commit**

```bash
git add src/infrastructure/database/schema.sql
git commit -m "feat: add PostgreSQL schema for Supabase"
```

---

### Task 7: Create Migration Script

**Files:**

- Create: `scripts/migrate-sqlite-to-supabase.ts`

- [ ] **Step 1: Create migration script**

```typescript
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import path from "node:path";
import fs from "node:fs";

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
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
```

- [ ] **Step 2: Add migrate script to package.json**

```json
"migrate": "tsx scripts/migrate-sqlite-to-supabase.ts"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-sqlite-to-supabase.ts package.json
git commit -m "feat: add SQLite to Supabase migration script"
```

---

### Task 8: Rewrite db.ts to Use Supabase

**Files:**

- Modify: `src/lib/db.ts` (complete rewrite)

- [ ] **Step 1: Rewrite db.ts**

The entire file is replaced. All functions now use Supabase client instead of better-sqlite3. The `better-sqlite3` import and lazy initialization pattern are removed.

```typescript
// ============================================================
// db.ts — Supabase (PostgreSQL) Data Layer
// ============================================================

import { getSupabase } from "@/infrastructure/database/supabase";
import {
  DEFAULT_TENANT_ID,
  type Conversation,
  type ConversationListItem,
  type Message,
  type ConversationMode,
  type MessageRole,
} from "@/core/types/database";

// ============================================================
// Conversations
// ============================================================

export async function getOrCreateConversation(
  phone: string,
  name?: string,
  jid?: string
): Promise<Conversation> {
  const supabase = getSupabase();

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("phone", phone)
    .single();

  if (existing) {
    // Update name if missing
    if (name && (!existing.name || existing.name === "")) {
      await supabase.from("conversations").update({ name }).eq("id", existing.id);
      existing.name = name;
    }
    // Update jid if changed
    if (jid && existing.jid !== jid) {
      await supabase.from("conversations").update({ jid }).eq("id", existing.id);
      existing.jid = jid;
    }
    return existing as Conversation;
  }

  // Create new conversation
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      phone,
      name: name ?? null,
      jid: jid ?? null,
      mode: "AI",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return created as Conversation;
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("conversations").select("*").eq("id", id).single();
  return (data as Conversation) ?? null;
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const supabase = getSupabase();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!conversations) return [];

  // Get last message preview for each conversation
  const result: ConversationListItem[] = [];
  for (const conv of conversations) {
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...(conv as Conversation),
      last_message_preview: lastMsg?.content ?? null,
    });
  }

  return result;
}

export async function setMode(conversationId: string, mode: ConversationMode): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("conversations").update({ mode }).eq("id", conversationId);
}

// ============================================================
// Messages
// ============================================================

export async function insertMessage(
  conversationId: string,
  role: MessageRole,
  content: string
): Promise<string> {
  const supabase = getSupabase();

  // Insert message
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert message: ${error.message}`);

  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return msg.id;
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as Message[]) ?? []).reverse();
}

export async function getRecentHistory(conversationId: string, limit = 20): Promise<Message[]> {
  return getMessages(conversationId, limit);
}

// ============================================================
// Delete Conversation (cascade handled by FK)
// ============================================================

export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = getSupabase();

  // Delete messages first (cascade should handle this, but being explicit)
  await supabase.from("messages").delete().eq("conversation_id", conversationId);

  // Delete conversation
  await supabase.from("conversations").delete().eq("id", conversationId);
}

// ============================================================
// Health Check
// ============================================================

export interface DatabaseHealth {
  status: "healthy" | "degraded" | "unhealthy";
  conversations: number;
  messages: number;
  uptime: number;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const supabase = getSupabase();

  const [convResult, msgResult] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
  ]);

  const conversations = convResult.count ?? 0;
  const messages = msgResult.count ?? 0;

  return {
    status: "healthy",
    conversations,
    messages,
    uptime: process.uptime(),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: rewrite db.ts to use Supabase instead of SQLite"
```

---

### Task 9: Rewrite Baileys Handler

**Files:**

- Modify: `src/lib/baileys/handler.ts`

- [ ] **Step 1: Update imports and make functions async**

The handler now uses async Supabase calls instead of sync SQLite calls.

```typescript
import type { WASocket, BaileysEventMap } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
} from "../db";
import { generateReply } from "../openrouter";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

export async function handleIncomingMessages(
  sock: WASocket,
  event: BaileysEventMap["messages.upsert"]
): Promise<void> {
  if (event.type !== "notify") return;

  for (const msg of event.messages) {
    if (msg.key.fromMe) continue;

    const remoteJid = msg.key.remoteJid ?? "";

    if (
      remoteJid.endsWith("@g.us") ||
      remoteJid.endsWith("@broadcast") ||
      remoteJid.endsWith("@newsletter")
    ) {
      continue;
    }

    if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) continue;

    const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null;

    if (!text || text.trim() === "") continue;

    const phone = remoteJid.split("@")[0].split(":")[0];
    const pushName = msg.pushName ?? undefined;

    logger.info(`[bot] ← mensaje de ${phone}: "${text.slice(0, 60)}"`);

    // All DB calls are now async
    const convo = await getOrCreateConversation(phone, pushName, remoteJid);
    await insertMessage(convo.id, "user", text);

    const fresh = await getConversationById(convo.id);
    if (!fresh) continue;

    if (fresh.mode !== "AI") {
      logger.info(`[bot] conversación ${convo.id} en modo HUMAN, no respondo`);
      continue;
    }

    const start = Date.now();
    try {
      const history = await getRecentHistory(convo.id, 20);
      logger.info(`[bot] llamando al LLM con ${history.length} mensajes...`);

      const reply = await generateReply({ history, conversationId: convo.id });

      if (!reply || reply.trim() === "") {
        logger.warn("[bot] LLM devolvió respuesta vacía, ignorando");
        continue;
      }

      const ms = Date.now() - start;
      logger.info(`[bot] LLM respondió en ${ms}ms`);

      await insertMessage(convo.id, "assistant", reply);
      await sock.sendMessage(remoteJid, { text: reply });

      logger.info(`[bot] → enviado a ${phone}: "${reply.slice(0, 60)}"`);
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        `[bot] error procesando mensaje de ${phone}`
      );
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/baileys/handler.ts
git commit -m "feat: update Baileys handler for async Supabase calls"
```

---

### Task 10: Replace Outbox with Supabase Realtime

**Files:**

- Modify: `src/lib/baileys/outbox.ts` (complete rewrite)

- [ ] **Step 1: Rewrite outbox to use Supabase Realtime**

```typescript
import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

let channel: ReturnType<typeof getSupabase>["channel"] | null = null;

/**
 * Subscribe to Supabase Realtime for outgoing messages.
 * When a human sends a message from the dashboard, it's inserted into
 * the `messages` table with role='human'. Baileys listens for these
 * inserts and sends them via WhatsApp.
 */
export function startOutboxListener(sock: WASocket): void {
  if (channel) return;

  const supabase = getSupabase();

  channel = supabase
    .channel("outbox")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "role=eq.human",
      },
      async (payload) => {
        const msg = payload.new as {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
        };

        logger.info(`[bot] ← outbox realtime: message ${msg.id}`);

        // Get conversation to find the JID
        const { data: convo } = await supabase
          .from("conversations")
          .select("jid, phone")
          .eq("id", msg.conversation_id)
          .single();

        if (!convo) {
          logger.warn(`[bot] conversation ${msg.conversation_id} not found`);
          return;
        }

        const jid = convo.jid ?? `${convo.phone}@s.whatsapp.net`;

        try {
          await sock.sendMessage(jid, { text: msg.content });
          logger.info(`[bot] → outbox enviado a ${convo.phone}: "${msg.content.slice(0, 40)}..."`);
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            `[bot] outbox message ${msg.id} falló`
          );
        }
      }
    )
    .subscribe();

  logger.info("[bot] outbox listener started (Supabase Realtime)");
}

export function stopOutboxListener(): void {
  if (channel) {
    const supabase = getSupabase();
    supabase.removeChannel(channel);
    channel = null;
    logger.info("[bot] outbox listener stopped");
  }
}
```

- [ ] **Step 2: Update client.ts to use new outbox**

Replace `startOutboxLoop`/`stopOutboxLoop` with `startOutboxListener`/`stopOutboxListener`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/baileys/outbox.ts src/lib/baileys/client.ts
git commit -m "feat: replace outbox polling with Supabase Realtime"
```

---

### Task 11: Update API Routes

**Files:**

- Modify: `src/app/api/conversations/route.ts`
- Modify: `src/app/api/conversations/[conversationId]/route.ts`
- Modify: `src/app/api/messages/[conversationId]/route.ts`
- Modify: `src/app/api/mode/[conversationId]/route.ts`
- Modify: `src/app/api/connection/status/route.ts`
- Modify: `src/app/api/connection/disconnect/route.ts`
- Modify: `src/app/api/health/route.ts`

- [ ] **Step 1: Update each route to use async Supabase calls**

Each route currently uses sync SQLite calls. Replace with async Supabase calls.

Example for `GET /api/conversations`:

```typescript
import { NextResponse } from "next/server";
import { listConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update connection routes to use Redis**

```typescript
// GET /api/connection/status
import { NextResponse } from "next/server";
import { getConnectionState } from "@/infrastructure/cache/connection-state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getConnectionState();
    return NextResponse.json(state);
  } catch (error) {
    return NextResponse.json({ status: "disconnected", qrPng: null, phone: null }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit each route separately**

```bash
git add src/app/api/conversations/route.ts
git commit -m "feat: update conversations API route for Supabase"

git add src/app/api/messages/[conversationId]/route.ts
git commit -m "feat: update messages API route for Supabase"

# ... etc for each route
```

---

### Task 12: Update Baileys Client

**Files:**

- Modify: `src/lib/baileys/client.ts`

- [ ] **Step 1: Update imports and connection state calls**

Replace `setConnectionState`/`getConnectionState` from `../db` with imports from `@/infrastructure/cache/connection-state`.

Replace `startOutboxLoop`/`stopOutboxLoop` with `startOutboxListener`/`stopOutboxListener`.

Make all connection state calls async.

- [ ] **Step 2: Commit**

```bash
git add src/lib/baileys/client.ts
git commit -m "feat: update Baileys client for Redis + Supabase Realtime"
```

---

### Task 13: Test Everything

- [ ] **Step 1: Update .env.local with Supabase credentials**

Get from Supabase Dashboard → Settings → API.

- [ ] **Step 2: Create Supabase project and run schema**

Go to Supabase SQL Editor, paste `schema.sql`, and run.

- [ ] **Step 3: Run migration script**

```bash
npm run migrate
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run typecheck
```

- [ ] **Step 5: Run tests**

```bash
npm run test
```

- [ ] **Step 6: Start the application**

```bash
npm run dev
```

- [ ] **Step 7: Test WhatsApp connection**

1. Open dashboard at http://localhost:3000
2. Scan QR code
3. Send a test message from WhatsApp
4. Verify it appears in the dashboard
5. Toggle AI/HUMAN mode
6. Send a human reply

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: Phase 04 — Full Supabase migration complete"
```

---

## Success Criteria

- [ ] All data migrated from SQLite to Supabase
- [ ] Baileys connects and works with Supabase
- [ ] All API routes work with Supabase
- [ ] Real-time updates work (no polling for outbox)
- [ ] connection_state stored in Redis
- [ ] Multi-tenancy with RLS works
- [ ] No data loss
- [ ] Build passes
- [ ] All tests pass
- [ ] WhatsApp connection works end-to-end

---

**Generated by:** AI-BOS Phase 04 — Full Supabase Migration
**Date:** 2026-07-25
