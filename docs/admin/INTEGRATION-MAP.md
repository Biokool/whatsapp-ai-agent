# INTEGRATION-MAP.md — Phase 01 Target Architecture

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 01 — Target Architecture

---

## 1. Integration Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INTEGRATION MAP                                       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CHANNEL INTEGRATIONS                                                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  WhatsApp   │  │  Telegram   │  │  Instagram  │                │   │
│  │  │  (Baileys)  │  │  (Bot API)  │  │  (Graph API)│                │   │
│  │  │  ACTIVE     │  │  FUTURE     │  │  FUTURE     │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                                  │   │
│  │  │  Messenger  │  │  Email      │                                  │   │
│  │  │  (Graph API)│  │  (SMTP)     │                                  │   │
│  │  │  FUTURE     │  │  FUTURE     │                                  │   │
│  │  └─────────────┘  └─────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LLM INTEGRATIONS                                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  OpenRouter │  │  Anthropic  │  │  OpenAI     │                │   │
│  │  │  ACTIVE     │  │  FUTURE     │  │  FUTURE     │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                                  │   │
│  │  │  Local      │  │  Azure      │                                  │   │
│  │  │  (Ollama)   │  │  OpenAI     │                                  │   │
│  │  │  FUTURE     │  │  FUTURE     │                                  │   │
│  │  └─────────────┘  └─────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DATABASE INTEGRATIONS                                              │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  Supabase   │  │  PostgreSQL │  │  SQLite     │                │   │
│  │  │  (Primary)  │  │  (Direct)   │  │  (Dev Only) │                │   │
│  │  │  TARGET     │  │  TARGET     │  │  CURRENT    │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐                                  │   │
│  │  │  Redis      │  │  MongoDB    │                                  │   │
│  │  │  (Cache)    │  │  (Future)   │                                  │   │
│  │  │  TARGET     │  │  FUTURE     │                                  │   │
│  │  └─────────────┘  └─────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SCHEDULING INTEGRATIONS                                            │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  Cal.com    │  │  Calendly   │  │  Google     │                │   │
│  │  │  ACTIVE     │  │  FUTURE     │  │  Calendar   │                │   │
│  │  └─────────────┘  └─────────────┘  │  FUTURE     │                │   │
│  │                                     └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ORCHESTRATION INTEGRATIONS                                         │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  n8n        │  │  Zapier     │  │  Make       │                │   │
│  │  │  TARGET     │  │  FUTURE     │  │  FUTURE     │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STORAGE INTEGRATIONS                                               │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │   │
│  │  │  Google     │  │  AWS S3     │  │  Cloudflare │                │   │
│  │  │  Sheets     │  │             │  │  R2         │                │   │
│  │  │  ACTIVE     │  │  FUTURE     │  │  FUTURE     │                │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Integration Details

### 2.1 WhatsApp (Baileys) — ACTIVE

```yaml
integration:
  name: "WhatsApp via Baileys"
  status: "ACTIVE"
  library: "@whiskeysockets/baileys"
  version: "^7.0.0-rc.9"
  
capabilities:
  - Text messages
  - Connection management
  - QR code authentication
  - Auto-reconnection
  
limitations:
  - No media handling (v1)
  - No group support
  - Single session only
  
configuration:
  auth_dir: "./auth"
  browser: "macOS Desktop"
  sync_full_history: false
  mark_online_on_connect: false
```

### 2.2 OpenRouter (LLM) — ACTIVE

```yaml
integration:
  name: "OpenRouter LLM Gateway"
  status: "ACTIVE"
  library: "openai"
  version: "^6.38.0"
  
capabilities:
  - Chat completions
  - Tool calling
  - Streaming (future)
  - Multiple models
  
models:
  primary: "openai/gpt-4o-mini"
  fallback: "anthropic/claude-haiku-4-5"
  
configuration:
  base_url: "https://openrouter.ai/api/v1"
  temperature: 0.4
  max_tool_turns: 5
  
rate_limits:
  max_requests_per_minute: 10
  max_tokens_per_day: 100000
```

### 2.3 Supabase (Database) — TARGET

```yaml
integration:
  name: "Supabase (PostgreSQL + pgvector)"
  status: "TARGET"
  phase: "04"
  
capabilities:
  - PostgreSQL database
  - Row Level Security
  - Realtime subscriptions
  - Vector search (pgvector)
  - Authentication
  - Storage
  
configuration:
  project_ref: "YOUR_PROJECT_REF"
  anon_key: "YOUR_ANON_KEY"
  service_role_key: "YOUR_SERVICE_ROLE_KEY"
  
tables:
  - tenants
  - contacts
  - conversations
  - messages
  - leads
  - appointments
  - rag_documents
  - audit_logs
```

### 2.4 Redis (Cache) — TARGET

```yaml
integration:
  name: "Redis"
  status: "TARGET"
  phase: "04"
  
capabilities:
  - Session storage
  - Rate limiting
  - Pub/Sub
  - Caching
  - Queue management
  
use_cases:
  - session:{userId}
  - ratelimit:{tenantId}:{endpoint}
  - presence:{conversationId}
  - cache:llm:{hash}
  - pubsub:channels
  
configuration:
  host: "localhost"
  port: 6379
  password: ""
```

### 2.5 Cal.com (Scheduling) — ACTIVE

```yaml
integration:
  name: "Cal.com"
  status: "ACTIVE"
  
capabilities:
  - Get availability
  - Create bookings
  - Cancel bookings
  
configuration:
  booking_url: "https://cal.com/your-user/diagnostico"
  
environment_variables:
  - CAL_BOOKING_URL
```

### 2.6 Google Sheets (Storage) — ACTIVE

```yaml
integration:
  name: "Google Sheets via Webhook"
  status: "ACTIVE"
  
capabilities:
  - Store leads
  - Custom fields
  
configuration:
  webhook_url: "YOUR_GOOGLE_SHEETS_WEBHOOK_URL"
  
environment_variables:
  - GOOGLE_SHEETS_WEBHOOK_URL
```

### 2.7 n8n (Orchestration) — TARGET

```yaml
integration:
  name: "n8n"
  status: "TARGET"
  phase: "09"
  
capabilities:
  - Workflow automation
  - HTTP requests
  - Webhooks
  - Custom nodes
  
workflows:
  - WF-INBOUND
  - WF-NORMALIZE
  - WF-RESOLVE-TENANT
  - WF-RESOLVE-CONTACT
  - WF-CONTEXT
  - WF-RAG
  - WF-AGENT
  - WF-TOOLS
  - WF-OUTBOUND
  - WF-PERSIST
  - WF-FOLLOW-UP
  - WF-APPOINTMENT
  - WF-ERROR
  
configuration:
  base_url: "http://localhost:5678"
  api_url: "http://localhost:5678/api/v1"
```

---

## 3. Integration Status Matrix

| Integration | Status | Phase | Priority | Complexity |
|-------------|--------|-------|----------|------------|
| WhatsApp (Baileys) | ACTIVE | - | P0 | Medium |
| OpenRouter (LLM) | ACTIVE | - | P0 | Low |
| Cal.com (Scheduling) | ACTIVE | - | P1 | Low |
| Google Sheets (Storage) | ACTIVE | - | P2 | Low |
| Supabase (Database) | TARGET | 04 | P0 | High |
| Redis (Cache) | TARGET | 04 | P1 | Medium |
| pgvector (RAG) | TARGET | 05 | P1 | Medium |
| n8n (Orchestration) | TARGET | 09 | P2 | High |
| Telegram | FUTURE | 08 | P2 | Medium |
| Instagram | FUTURE | 08 | P2 | Medium |
| Messenger | FUTURE | 08 | P2 | Medium |
| Anthropic (LLM) | FUTURE | 06 | P2 | Low |
| OpenAI (LLM) | FUTURE | 06 | P2 | Low |
| Local (Ollama) | FUTURE | 06 | P3 | Medium |
| Calendly | FUTURE | 07 | P3 | Low |
| Google Calendar | FUTURE | 07 | P2 | Medium |

---

## 4. Integration Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION DEPENDENCIES                      │
│                                                                 │
│  PHASE 02: Contracts + Configuration                            │
│  └── Define TypeScript interfaces for all integrations          │
│                                                                 │
│  PHASE 04: Data + Multi-Tenancy                                 │
│  ├── Supabase (PostgreSQL)                                      │
│  └── Redis (Cache)                                              │
│                                                                 │
│  PHASE 05: RAG + Knowledge                                      │
│  └── pgvector (Vector Store)                                    │
│                                                                 │
│  PHASE 06: Universal Agent + Memory                             │
│  └── LLM Provider abstraction                                   │
│                                                                 │
│  PHASE 07: Tools + Calendar                                     │
│  └── Scheduling Provider abstraction                            │
│                                                                 │
│  PHASE 08: Omnichannel                                          │
│  ├── Telegram                                                   │
│  ├── Instagram                                                  │
│  └── Messenger                                                  │
│                                                                 │
│  PHASE 09: N8N Orchestration                                    │
│  └── n8n integration                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Environment Variables

```bash
# ============================================================
# REQUIRED
# ============================================================

# OpenRouter LLM
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini

# ============================================================
# OPTIONAL · Tools
# ============================================================

# Google Sheets
GOOGLE_SHEETS_WEBHOOK_URL=

# Cal.com
CAL_BOOKING_URL=

# ============================================================
# OPTIONAL · Database (Phase 04)
# ============================================================

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Redis
REDIS_URL=

# ============================================================
# OPTIONAL · Security
# ============================================================

# Dashboard Auth
DASHBOARD_USER=
DASHBOARD_PASSWORD=

# Rate Limiting
LLM_RATE_LIMIT_MAX_REQUESTS=10
LLM_RATE_LIMIT_WINDOW_MS=60000

# ============================================================
# OPTIONAL · Production
# ============================================================

PORT=3000
LOG_LEVEL=info
NODE_ENV=development
```

---

**Generated by:** AI-BOS Phase 01 — Target Architecture
**Date:** 2026-07-25
