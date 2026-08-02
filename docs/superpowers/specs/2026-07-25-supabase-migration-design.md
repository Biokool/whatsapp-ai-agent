# Phase 04 Design Spec — Full Supabase Migration

**Date:** 2026-07-25
**Phase:** 04 — Data + Multi-Tenancy (Full Migration)
**Status:** DRAFT — Awaiting Review

---

## 1. Executive Summary

Migrate the entire data layer from SQLite to Supabase (PostgreSQL). This unifies all data in one platform:

- **Baileys** → Supabase client (async/HTTP)
- **Outbox** → Supabase Realtime (WebSocket)
- **connection_state** → Redis (fast key-value)
- **All API routes** → Supabase client
- **Multi-tenancy** → tenant_id + RLS on all tables

**Result:** Single platform (Supabase), no local database files, real-time capabilities, scalable architecture.

---

## 2. Architecture Overview

### 2.1 Current Architecture

```
Baileys Process (better-sqlite3, sync)
    ↓ (SQLite file)
data/messages.db
    ↑ (SQLite file)
Next.js API Routes (better-sqlite3, sync)
```

### 2.2 Target Architecture

```
Baileys Process (Supabase client, async)
    ↓ (HTTP/REST)
Supabase (PostgreSQL)
    ↑ (HTTP/REST)
Next.js API Routes (Supabase client, async)

Redis (connection_state, caching, rate limiting)
```

---

## 3. Schema Design

### 3.1 Tables Migrated from SQLite

#### `conversations` (migrated)

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) DEFAULT '00000000-0000-0000-0000-000000000001',
  phone TEXT NOT NULL,
  name TEXT,
  jid TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);
```

#### `messages` (migrated)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
```

#### `outbox` → REPLACED by Supabase Realtime

No longer needed. Baileys listens to Supabase Realtime for outgoing messages.

### 3.2 New Tables

#### `tenants`

```sql
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
  ('00000000-0000-0000-0000-000000000001', 'Biokool', 'biokool');
```

#### `contacts`

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, phone)
);

CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);
```

#### `leads`

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  score INTEGER CHECK(score >= 0 AND score <= 10),
  status TEXT CHECK(status IN ('new','qualified','disqualified','converted')) NOT NULL DEFAULT 'new',
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
```

#### `appointments`

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK(status IN ('scheduled','confirmed','completed','cancelled')) NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
```

#### `rag_documents`

```sql
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rag_documents_tenant ON rag_documents(tenant_id);
-- pgvector index (requires pgvector extension)
CREATE INDEX idx_rag_documents_embedding ON rag_documents USING ivfflat (embedding vector_cosine_ops);
```

#### `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

### 3.3 Row Level Security

```sql
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON conversations
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
  ));

-- Similar policies for all other tables
```

---

## 4. File Structure

```
src/
├── infrastructure/
│   ├── database/
│   │   ├── supabase.ts              # Supabase client singleton
│   │   ├── schema.sql               # Full PostgreSQL schema
│   │   └── migrations/
│   │       ├── 001_initial.sql      # Create all tables
│   │       ├── 002_rls.sql          # Enable RLS + policies
│   │       └── 003_seed.sql         # Default tenant + data
│   ├── cache/
│   │   ├── redis.ts                 # Redis client
│   │   └── connection-state.ts      # connection_state in Redis
│   └── realtime/
│       └── outbox.ts                # Supabase Realtime for outbox
├── core/
│   ├── ports/
│   │   └── storage.ts               # StoragePort interface
│   └── types/
│       ├── conversation.ts
│       ├── message.ts
│       ├── contact.ts
│       ├── lead.ts
│       └── appointment.ts
├── lib/
│   ├── db.ts                        # REWRITTEN: Supabase queries
│   ├── baileys/
│   │   ├── client.ts                # REWRITTEN: Uses Supabase
│   │   ├── handler.ts               # REWRITTEN: Uses Supabase
│   │   └── outbox.ts                # DELETED: Replaced by Realtime
│   └── openrouter.ts                # Unchanged
├── app/
│   └── api/
│       └── (all routes)             # REWRITTEN: Use Supabase
├── middleware/
│   └── tenant.ts                    # Tenant resolution
└── config/
    └── environment.ts               # Updated with Supabase + Redis vars
```

---

## 5. Implementation Steps

### Step 1: Supabase Client Setup

- Install `@supabase/supabase-js`
- Create `src/infrastructure/database/supabase.ts`
- Configure with env vars

### Step 2: Redis Client Setup

- Install `ioredis`
- Create `src/infrastructure/cache/redis.ts`
- Create `src/infrastructure/cache/connection-state.ts`

### Step 3: PostgreSQL Schema

- Create `schema.sql` with all 8 tables
- Create migration files
- Create RLS policies

### Step 4: Core Types

- Define TypeScript interfaces for all entities
- UUID-based types

### Step 5: Storage Port

- Define `StoragePort` interface
- Abstracts all database operations

### Step 6: Supabase Repository

- Implement `StoragePort` with Supabase client
- All CRUD operations

### Step 7: Rewrite API Routes

- Replace all `better-sqlite3` calls with Supabase
- Add tenant resolution middleware

### Step 8: Rewrite Baileys Integration

- Replace `better-sqlite3` with Supabase client
- Replace outbox polling with Supabase Realtime
- Move connection_state to Redis

### Step 9: Data Migration Script

- Script to migrate existing SQLite data to Supabase
- Handle UUID generation for existing INTEGER IDs

### Step 10: Testing + Validation

- Verify all API routes work
- Verify Baileys connection works
- Verify real-time updates work

---

## 6. Data Migration Strategy

### SQLite → PostgreSQL Mapping

| SQLite                 | PostgreSQL     | Notes                            |
| ---------------------- | -------------- | -------------------------------- |
| `INTEGER` (id)         | `UUID`         | Generate UUIDs for existing rows |
| `INTEGER` (unix epoch) | `TIMESTAMPTZ`  | Convert unix timestamp           |
| `TEXT` (phone)         | `TEXT`         | Direct copy                      |
| `TEXT` (mode)          | `TEXT` (CHECK) | Direct copy                      |
| `TEXT` (content)       | `TEXT`         | Direct copy                      |

### Migration Script

```typescript
// scripts/migrate-sqlite-to-supabase.ts
import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

async function migrate() {
  const sqlite = new Database("data/messages.db");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // 1. Create default tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .upsert({ id: "00000000-0000-0000-0000-000000000001", name: "Biokool", slug: "biokool" })
    .select()
    .single();

  // 2. Migrate conversations
  const conversations = sqlite.prepare("SELECT * FROM conversations").all();
  for (const conv of conversations) {
    const newId = uuidv4();
    await supabase.from("conversations").insert({
      id: newId,
      tenant_id: tenant.id,
      phone: conv.phone,
      name: conv.name,
      jid: conv.jid,
      mode: conv.mode,
      last_message_at: conv.last_message_at ? new Date(conv.last_message_at * 1000) : null,
      created_at: new Date(conv.created_at * 1000),
    });

    // 3. Migrate messages for this conversation
    const messages = sqlite
      .prepare("SELECT * FROM messages WHERE conversation_id = ?")
      .all(conv.id);
    for (const msg of messages) {
      await supabase.from("messages").insert({
        conversation_id: newId,
        role: msg.role,
        content: msg.content,
        created_at: new Date(msg.created_at * 1000),
      });
    }
  }

  console.log("Migration complete!");
}
```

---

## 7. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis
REDIS_URL=redis://localhost:6379

# Existing (unchanged)
OPENROUTER_API_KEY=sk-or-v1-...
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=biokool2026
```

---

## 8. Dependencies to Add

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0",
    "ioredis": "^5.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

---

## 9. Risk Assessment

| Risk                                      | Severity | Mitigation                                        |
| ----------------------------------------- | -------- | ------------------------------------------------- |
| Baileys async migration breaks connection | HIGH     | Test thoroughly, keep SQLite as fallback option   |
| Supabase Realtime reliability             | MEDIUM   | Keep polling as fallback                          |
| Data loss during migration                | HIGH     | Backup SQLite before migration, verify row counts |
| Redis connection failures                 | MEDIUM   | Graceful degradation, retry logic                 |
| RLS policy errors                         | MEDIUM   | Test with multiple tenants                        |

---

## 10. Success Criteria

- [ ] All data migrated from SQLite to Supabase
- [ ] Baileys connects and works with Supabase
- [ ] All API routes work with Supabase
- [ ] Real-time updates work (no polling)
- [ ] connection_state stored in Redis
- [ ] Multi-tenancy with RLS works
- [ ] No data loss
- [ ] Build passes
- [ ] All tests pass

---

**Generated by:** AI-BOS Phase 04 — Full Supabase Migration
**Date:** 2026-07-25
**Status:** DRAFT — Awaiting Review
