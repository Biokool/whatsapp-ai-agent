# DATA-FLOW.md — Phase 01 Target Architecture

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 01 — Target Architecture

---

## 1. Inbound Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INBOUND MESSAGE FLOW                                 │
│                                                                             │
│  1. USER SENDS MESSAGE                                                      │
│     ┌─────────────┐                                                        │
│     │  WhatsApp   │                                                        │
│     │  Mobile App │                                                        │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. CHANNEL RECEIVES                                                        │
│     ┌─────────────┐                                                        │
│     │  WhatsApp   │                                                        │
│     │  Servers    │                                                        │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. ADAPTER PROCESSES                                                       │
│     ┌─────────────┐                                                        │
│     │  Baileys    │                                                        │
│     │  Client     │                                                        │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  4. NORMALIZE                                                               │
│     ┌─────────────┐                                                        │
│     │  WhatsApp   │                                                        │
│     │  Adapter    │──→ InboundMessage Contract                             │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  5. VALIDATE                                                                │
│     ┌─────────────┐                                                        │
│     │  Input      │                                                        │
│     │  Validator  │──→ Validate content, phone, etc.                       │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  6. RESOLVE TENANT                                                          │
│     ┌─────────────┐                                                        │
│     │  Tenant     │                                                        │
│     │  Resolver   │──→ Find tenant by phone/config                         │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  7. RESOLVE CONTACT                                                         │
│     ┌─────────────┐                                                        │
│     │  Contact    │                                                        │
│     │  Resolver   │──→ Find or create contact                              │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  8. RESOLVE CONVERSATION                                                    │
│     ┌─────────────┐                                                        │
│     │ Conversation│                                                        │
│     │  Resolver   │──→ Find or create conversation                         │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  9. PERSIST MESSAGE                                                         │
│     ┌─────────────┐                                                        │
│     │  Database   │                                                        │
│     │  (Supabase) │──→ Save message to PostgreSQL                          │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  10. CHECK MODE                                                             │
│      ┌─────────────┐                                                       │
│      │  Conversation│                                                       │
│      │  Mode Check  │──→ AI or HUMAN?                                      │
│      └──────┬───────┘                                                       │
│             │                                                               │
│      ┌──────┴──────┐                                                       │
│      │             │                                                       │
│      ▼             ▼                                                       │
│  ┌─────────┐  ┌─────────┐                                                 │
│  │ AI MODE │  │HUMAN    │                                                 │
│  │         │  │MODE     │                                                 │
│  └────┬────┘  └────┬────┘                                                 │
│       │             │                                                      │
│       ▼             ▼                                                      │
│  11A. PROCESS WITH AI    11B. WAIT FOR HUMAN                               │
│       │                        │                                           │
│       ▼                        ▼                                           │
│  ┌─────────┐              ┌─────────┐                                     │
│  │ Agent   │              │ Queue   │                                     │
│  │ Process │              │ Message │                                     │
│  └────┬────┘              └─────────┘                                     │
│       │                                                                    │
│       ▼                                                                    │
│  12. GENERATE RESPONSE                                                     │
│      ┌─────────────┐                                                      │
│      │  LLM        │                                                      │
│      │  (OpenRouter)│──→ Generate reply                                    │
│      └──────┬──────┘                                                      │
│             │                                                              │
│             ▼                                                              │
│  13. EXECUTE TOOLS (if needed)                                             │
│      ┌─────────────┐                                                      │
│      │  Tool       │                                                      │
│      │  Executor   │──→ Execute tool calls                                │
│      └──────┬──────┘                                                      │
│             │                                                              │
│             ▼                                                              │
│  14. PERSIST RESPONSE                                                      │
│      ┌─────────────┐                                                      │
│      │  Database   │                                                      │
│      │  (Supabase) │──→ Save response message                             │
│      └──────┬──────┘                                                      │
│             │                                                              │
│             ▼                                                              │
│  15. SEND RESPONSE                                                         │
│      ┌─────────────┐                                                      │
│      │  Channel    │                                                      │
│      │  Adapter    │──→ Send via WhatsApp                                  │
│      └──────┬──────┘                                                      │
│             │                                                              │
│             ▼                                                              │
│  16. UPDATE MEMORY                                                         │
│      ┌─────────────┐                                                      │
│      │  Memory     │                                                      │
│      │  Manager    │──→ Update conversation context                        │
│      └──────┬──────┘                                                      │
│             │                                                              │
│             ▼                                                              │
│  17. TRACK ANALYTICS                                                       │
│      ┌─────────────┐                                                      │
│      │  Analytics  │                                                      │
│      │  Service    │──→ Log metrics                                        │
│      └─────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Outbound Message Flow (Human)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTBOUND MESSAGE FLOW (HUMAN)                        │
│                                                                             │
│  1. HUMAN TYPES MESSAGE                                                     │
│     ┌─────────────┐                                                        │
│     │  Dashboard  │                                                        │
│     │  Input      │                                                        │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. VALIDATE INPUT                                                          │
│     ┌─────────────┐                                                        │
│     │  Validation │                                                        │
│     │  Middleware  │──→ Validate content, length, etc.                      │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. AUTHENTICATE                                                            │
│     ┌─────────────┐                                                        │
│     │  Auth       │                                                        │
│     │  Middleware  │──→ Verify JWT token                                    │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  4. CHECK PERMISSIONS                                                       │
│     ┌─────────────┐                                                        │
│     │  RBAC       │                                                        │
│     │  Checker    │──→ Verify user can send messages                       │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  5. PERSIST MESSAGE                                                         │
│     ┌─────────────┐                                                        │
│     │  Database   │                                                        │
│     │  (Supabase) │──→ Save message (role: 'human')                        │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  6. ENQUEUE FOR DELIVERY                                                    │
│     ┌─────────────┐                                                        │
│     │  Outbox     │                                                        │
│     │  Queue      │──→ Add to Redis queue                                  │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  7. WORKER PICKS UP                                                         │
│     ┌─────────────┐                                                        │
│     │  Outbox     │                                                        │
│     │  Worker     │──→ Process queue                                       │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  8. SEND VIA CHANNEL                                                        │
│     ┌─────────────┐                                                        │
│     │  Channel    │                                                        │
│     │  Adapter    │──→ Send via WhatsApp                                   │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  9. MARK DELIVERED                                                          │
│     ┌─────────────┐                                                        │
│     │  Database   │                                                        │
│     │  (Supabase) │──→ Update outbox status                                │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  10. BROADCAST TO DASHBOARD                                                 │
│      ┌─────────────┐                                                       │
│      │  WebSocket  │                                                       │
│      │  (Redis)    │──→ Notify all connected dashboards                    │
│      └─────────────┘                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. RAG Query Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RAG QUERY FLOW                                       │
│                                                                             │
│  1. USER ASKS QUESTION                                                      │
│     ┌─────────────┐                                                        │
│     │  Message    │                                                        │
│     │  "¿Cuánto cuesta?" │                                                │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. INTENT DETECTION                                                        │
│     ┌─────────────┐                                                        │
│     │  Intent     │                                                        │
│     │  Detector   │──→ Detect "pricing inquiry"                            │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. QUERY GENERATION                                                        │
│     ┌─────────────┐                                                        │
│     │  Query      │                                                        │
│     │  Generator  │──→ Generate search query                               │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  4. EMBED QUERY                                                             │
│     ┌─────────────┐                                                        │
│     │  Embedding  │                                                        │
│     │  Service    │──→ Convert query to vector                             │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  5. VECTOR SEARCH                                                           │
│     ┌─────────────┐                                                        │
│     │  pgvector   │                                                        │
│     │  Search     │──→ Find similar documents                              │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  6. RANK RESULTS                                                            │
│     ┌─────────────┐                                                        │
│     │  Ranking    │                                                        │
│     │  Service    │──→ Rank by relevance                                   │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  7. BUILD CONTEXT                                                            │
│     ┌─────────────┐                                                        │
│     │  Context    │                                                        │
│     │  Builder    │──→ Build context from top results                      │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  8. GENERATE RESPONSE                                                       │
│     ┌─────────────┐                                                        │
│     │  LLM        │                                                        │
│     │  (OpenRouter)│──→ Generate answer with context                       │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  9. SEND RESPONSE                                                           │
│     ┌─────────────┐                                                        │
│     │  Channel    │                                                        │
│     │  Adapter    │──→ Send response to user                               │
│     └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Lead Qualification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEAD QUALIFICATION FLOW                              │
│                                                                             │
│  1. CONVERSATION INITIATED                                                   │
│     ┌─────────────┐                                                        │
│     │  New        │                                                        │
│     │  Conversation│                                                       │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. COLLECT INFORMATION                                                     │
│     ┌─────────────┐                                                        │
│     │  Agent      │                                                        │
│     │  Collects   │──→ Name, phone, business, pain points                  │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. CHECK COMPLETENESS                                                      │
│     ┌─────────────┐                                                        │
│     │  Validation │                                                        │
│     │  Check      │──→ Has required info?                                  │
│     └──────┬──────┘                                                        │
│            │                                                                │
│      ┌─────┴─────┐                                                        │
│      │           │                                                        │
│      ▼           ▼                                                        │
│  ┌─────────┐ ┌─────────┐                                                 │
│  │COMPLETE │ │INCOMPLETE│                                                │
│  └────┬────┘ └────┬────┘                                                 │
│       │           │                                                      │
│       ▼           ▼                                                      │
│  4. QUALIFY LEAD     4B. CONTINUE COLLECTING                             │
│       │                                                                │
│       ▼                                                                │
│  5. CALCULATE SCORE                                                        │
│     ┌─────────────┐                                                      │
│     │  Scoring    │                                                      │
│     │  Algorithm  │──→ Score 1-10                                        │
│     └──────┬──────┘                                                      │
│            │                                                              │
│            ▼                                                              │
│  6. CHECK THRESHOLD                                                        │
│     ┌─────────────┐                                                      │
│     │  Score      │                                                      │
│     │  >= 7?      │                                                      │
│     └──────┬──────┘                                                      │
│            │                                                              │
│      ┌─────┴─────┐                                                      │
│      │           │                                                      │
│      ▼           ▼                                                      │
│  ┌─────────┐ ┌─────────┐                                               │
│  │QUALIFIED│ │DISQUALI-│                                               │
│  └────┬────┘ │ FIED    │                                               │
│       │      └────┬────┘                                               │
│       ▼           ▼                                                    │
│  7. SAVE LEAD        7B. RESPOND CORDIALLY                              │
│       │                                                                │
│       ▼                                                                │
│  8. SCHEDULE APPOINTMENT                                                  │
│     ┌─────────────┐                                                      │
│     │  Scheduling │                                                      │
│     │  Service    │──→ Get available times                               │
│     └──────┬──────┘                                                      │
│            │                                                              │
│            ▼                                                              │
│  9. CREATE BOOKING                                                         │
│     ┌─────────────┐                                                      │
│     │  Cal.com    │                                                      │
│     │  API        │──→ Create booking                                    │
│     └──────┬──────┘                                                      │
│            │                                                              │
│            ▼                                                              │
│  10. SEND CONFIRMATION                                                     │
│      ┌─────────────┐                                                      │
│      │  Channel    │                                                      │
│      │  Adapter    │──→ Send booking link                                 │
│      └─────────────┘                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Human Escalation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HUMAN ESCALATION FLOW                                │
│                                                                             │
│  1. TRIGGER DETECTED                                                        │
│     ┌─────────────┐                                                        │
│     │  Agent      │                                                        │
│     │  Detects    │──→ Complex question, complaint, etc.                   │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. SWITCH MODE                                                             │
│     ┌─────────────┐                                                        │
│     │  Database   │                                                        │
│     │  Update     │──→ Set mode = 'HUMAN'                                  │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. NOTIFY HUMAN                                                            │
│     ┌─────────────┐                                                        │
│     │  Dashboard  │                                                        │
│     │  WebSocket  │──→ Real-time notification                              │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  4. SEND ESCALATION MESSAGE                                                 │
│     ┌─────────────┐                                                        │
│     │  Channel    │                                                        │
│     │  Adapter    │──→ "Voy a derivarte con un compañero..."               │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  5. HUMAN TAKES OVER                                                        │
│     ┌─────────────┐                                                        │
│     │  Dashboard  │                                                        │
│     │  Interface  │──→ Human sees conversation                             │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  6. HUMAN RESPONDS                                                          │
│     ┌─────────────┐                                                        │
│     │  Human      │                                                        │
│     │  Types      │──→ Human response                                     │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  7. SEND VIA OUTBOX                                                         │
│     ┌─────────────┐                                                        │
│     │  Outbox     │                                                        │
│     │  Queue      │──→ Queue for delivery                                  │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  8. DELIVER TO USER                                                         │
│     ┌─────────────┐                                                        │
│     │  Channel    │                                                        │
│     │  Adapter    │──→ Send via WhatsApp                                   │
│     └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Synchronization Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA SYNC FLOW                                       │
│                                                                             │
│  1. CHANGE OCCURS                                                           │
│     ┌─────────────┐                                                        │
│     │  Database   │                                                        │
│     │  Write      │──→ INSERT/UPDATE/DELETE                                 │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  2. PUBLISH EVENT                                                           │
│     ┌─────────────┐                                                        │
│     │  Supabase   │                                                        │
│     │  Realtime   │──→ Broadcast change event                              │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  3. SUBSCRIBERS RECEIVE                                                     │
│     ┌─────────────┐                                                        │
│     │  WebSocket  │                                                        │
│     │  Clients    │──→ All connected dashboards                            │
│     └──────┬──────┘                                                        │
│            │                                                                │
│            ▼                                                                │
│  4. UPDATE UI                                                               │
│     ┌─────────────┐                                                        │
│     │  React      │                                                        │
│     │  Component  │──→ Re-render with new data                             │
│     └─────────────┘                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

**Generated by:** AI-BOS Phase 01 — Target Architecture
**Date:** 2026-07-25
