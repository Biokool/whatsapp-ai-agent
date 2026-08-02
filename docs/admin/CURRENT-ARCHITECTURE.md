# CURRENT-ARCHITECTURE.md — Phase 00 System Audit

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 00 — System Audit

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER DEVICES                             │
│  (WhatsApp Mobile App) ←→ (WhatsApp Servers) ←→ (Baileys)      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOCKER CONTAINER                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    NODE.JS PROCESS                         │  │
│  │                                                           │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │  │
│  │  │   BAILEYS    │    │   NEXT.JS   │    │   SQLITE    │  │  │
│  │  │   CLIENT     │    │   SERVER    │    │   DATABASE  │  │  │
│  │  │             │    │             │    │             │  │  │
│  │  │ - Connect   │    │ - API Routes│    │ - Messages  │  │  │
│  │  │ - Messages  │    │ - Dashboard │    │ - Contacts  │  │  │
│  │  │ - Send      │    │ - WebSocket │    │ - State     │  │  │
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘  │  │
│  │         │                  │                  │          │  │
│  │         └──────────────────┼──────────────────┘          │  │
│  │                            │                             │  │
│  │                    ┌───────▼───────┐                     │  │
│  │                    │   OPENROUTER  │                     │  │
│  │                    │   LLM API     │                     │  │
│  │                    └───────────────┘                     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Baileys Client (`src/lib/baileys/`)

**Purpose:** WhatsApp protocol implementation

**Files:**

- `client.ts` — Socket management, reconnection
- `handler.ts` — Message processing
- `outbox.ts` — Human message delivery

**Dependencies:**

- `@whiskeysockets/baileys` ^7.0.0-rc.9
- `pino` (logging)
- `qrcode-terminal` (QR display)

**Data Flow:**

```
WhatsApp Server ←→ Baileys Socket ←→ Message Handler ←→ Database
                                         │
                                         ▼
                                    OpenRouter LLM
                                         │
                                         ▼
                                    Response Sender
```

### 2.2 Next.js Server (`src/app/`)

**Purpose:** Dashboard and API

**Routes:**

| Route                        | Method | Purpose                 |
| ---------------------------- | ------ | ----------------------- |
| `/`                          | GET    | Dashboard page          |
| `/docs`                      | GET    | Documentation viewer    |
| `/api/conversations`         | GET    | List conversations      |
| `/api/conversations/[id]`    | DELETE | Delete conversation     |
| `/api/messages/[id]`         | GET    | Get messages            |
| `/api/messages/[id]`         | POST   | Send message            |
| `/api/mode/[id]`             | POST   | Switch AI/HUMAN mode    |
| `/api/connection/status`     | GET    | Get connection status   |
| `/api/connection/disconnect` | POST   | Disconnect WhatsApp     |
| `/api/docs`                  | GET    | List documentation      |
| `/api/docs/read`             | GET    | Read documentation file |

### 2.3 SQLite Database (`src/lib/db.ts`)

**Purpose:** Data persistence

**Tables:**

```sql
conversations (
  id INTEGER PRIMARY KEY,
  phone TEXT UNIQUE,
  name TEXT,
  jid TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')),
  last_message_at INTEGER,
  created_at INTEGER
)

messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','human')),
  content TEXT,
  created_at INTEGER
)

connection_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT CHECK(status IN ('disconnected','qr','connecting','connected')),
  qr_string TEXT,
  phone TEXT,
  updated_at INTEGER
)

outbox (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER,
  phone TEXT,
  content TEXT,
  sent INTEGER DEFAULT 0,
  created_at INTEGER
)
```

### 2.4 OpenRouter LLM (`src/lib/openrouter.ts`)

**Purpose:** AI response generation

**Configuration:**

- Provider: OpenRouter
- Default Model: `openai/gpt-4o-mini`
- Temperature: 0.4
- Max Tool Turns: 5

**Tool Calling Loop:**

```
User Message
    │
    ▼
System Prompt + History
    │
    ▼
LLM Completion
    │
    ├── No Tool Calls → Return Response
    │
    └── Tool Calls → Execute Tools → Add Results → Loop (max 5)
```

### 2.5 Tools (`src/lib/tools/`)

**Purpose:** Business logic execution

**Available Tools:**

| Tool            | Purpose                    | Status     |
| --------------- | -------------------------- | ---------- |
| `guardarLead`   | Save lead to Google Sheets | UNVERIFIED |
| `calificar`     | Score lead 1-10            | VERIFIED   |
| `agendar`       | Generate scheduling link   | UNVERIFIED |
| `derivarHumano` | Switch to HUMAN mode       | VERIFIED   |

---

## 3. Data Flow

### 3.1 Inbound Message Flow

```
1. WhatsApp message received
   │
2. Baileys parses message
   │
3. Handler filters (groups, broadcasts, newsletters)
   │
4. Handler extracts text content
   │
5. getOrCreateConversation() → SQLite
   │
6. insertMessage() → SQLite (role: 'user')
   │
7. Check conversation mode
   │
   ├── Mode: HUMAN → Stop (human will respond from dashboard)
   │
   └── Mode: AI → Continue
        │
8. getRecentHistory() → SQLite (last 20 messages)
   │
9. generateReply() → OpenRouter LLM
   │
   ├── Tool calls → Execute → Loop
   │
   └── Final response
        │
10. insertMessage() → SQLite (role: 'assistant')
    │
11. sock.sendMessage() → WhatsApp
```

### 3.2 Outbound Message Flow (Human)

```
1. Human types message in dashboard
   │
2. POST /api/messages/[id]
   │
3. insertMessage() → SQLite (role: 'human')
   │
4. enqueueOutbox() → SQLite (outbox table)
   │
5. Outbox loop polls every 2s
   │
6. getPendingOutbox() → SQLite
   │
7. sock.sendMessage() → WhatsApp
   │
8. markOutboxSent() → SQLite
```

### 3.3 Connection Management Flow

```
1. Bot starts → useMultiFileAuthState()
   │
2. QR generated → setConnectionState({status: 'qr'})
   │
3. User scans QR → Connection established
   │
4. setConnectionState({status: 'connected'})
   │
5. Connection lost → scheduleReconnect()
   │
6. Reconnect → start() (new socket)
   │
7. Logout (code 401) → setConnectionState({status: 'disconnected'})
```

---

## 4. Deployment Architecture

### 4.1 Docker Configuration

**Dockerfile:** Multi-stage build

- Stage 1 (builder): Build Next.js app
- Stage 2 (production): Run with minimal dependencies

**docker-compose.local.yml:**

- Container: `whatsapp-agent`
- Ports: 3000 (dashboard)
- Volumes: `data`, `auth`, `prompts`, `docs`
- Restart: unless-stopped

### 4.2 Environment Configuration

**Required:**

- `OPENROUTER_API_KEY` — LLM authentication
- `OPENROUTER_MODEL` — LLM model selection

**Optional:**

- `GOOGLE_SHEETS_WEBHOOK_URL` — Lead storage
- `CAL_BOOKING_URL` — Scheduling
- `PORT` — Dashboard port (default: 3000)
- `LOG_LEVEL` — Logging verbosity (default: info)

---

## 5. Security Architecture

### 5.1 Current State

**Authentication:** NONE

- Dashboard accessible to anyone with URL
- No API route protection
- No session management

**Authorization:** NONE

- All users have full access
- No role-based access control

**Secrets:**

- API key in `.env.local` (not committed)
- API key in `config/servers.json` (RISK)
- Docker uses env vars (good)

### 5.2 Recommendations

1. Add basic authentication to dashboard
2. Remove secrets from config files
3. Add API route protection
4. Implement rate limiting

---

## 6. Scalability Analysis

### 6.1 Current Limitations

| Component | Limitation     | Impact                 |
| --------- | -------------- | ---------------------- |
| SQLite    | Single-writer  | Concurrency bottleneck |
| Baileys   | Single session | One WhatsApp account   |
| Next.js   | Single process | Limited throughput     |
| Polling   | 2s intervals   | Suboptimal UX          |

### 6.2 Scaling Path

```
Current: SQLite + Single Process
    │
    ▼
Phase 1: PostgreSQL + Multiple Processes
    │
    ▼
Phase 2: Redis + Message Queue
    │
    ▼
Phase 3: Microservices + Load Balancing
```

---

## 7. Technology Stack

| Layer     | Technology   | Version    | Purpose                 |
| --------- | ------------ | ---------- | ----------------------- |
| Runtime   | Node.js      | 20+        | JavaScript execution    |
| Framework | Next.js      | 16.2.6     | Web framework           |
| UI        | React        | 19.0.0     | Component library       |
| Styling   | Tailwind CSS | 4.0.0      | Utility CSS             |
| Database  | SQLite       | -          | Data persistence        |
| WhatsApp  | Baileys      | 7.0.0-rc.9 | Protocol implementation |
| LLM       | OpenRouter   | -          | AI gateway              |
| Container | Docker       | -          | Deployment              |

---

**Generated by:** AI-BOS Phase 00 — System Audit
**Date:** 2026-07-25
