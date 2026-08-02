# TARGET-ARCHITECTURE.md — Phase 01 Target Architecture

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 01 — Target Architecture
**Based on:** Phase 00 System Audit

---

## 1. Architecture Vision

### 1.1 From Current to Target

```
CURRENT STATE                          TARGET STATE
─────────────────────────────────────────────────────────────
Monolithic                             Layered Architecture
Single-tenant                          Multi-tenant
SQLite only                            PostgreSQL + Supabase
No authentication                      JWT + RBAC
No channel abstraction                 Channel-agnostic core
No provider abstraction                Provider-agnostic LLM
No RAG                                 RAG with vector search
No memory                              Persistent memory
No observability                       Full observability
No control plane                       Admin control plane
```

### 1.2 Architecture Principles

1. **Immutable Core** — Business logic independent of providers
2. **Ports & Adapters** — Infrastructure replaceable without core changes
3. **Multi-tenant from Day One** — Tenant-aware but not complex
4. **Configuration over Hardcoding** — All config externalized
5. **Incremental Evolution** — Small changes, validate, repeat

---

## 2. Immutable Core

The Immutable Core contains business logic that must NOT depend on external providers.

### 2.1 Core Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                     IMMUTABLE CORE                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   DOMAIN    │  │ APPLICATION │  │   AGENTS    │        │
│  │             │  │             │  │             │        │
│  │ - Entities  │  │ - Use Cases │  │ - Context   │        │
│  │ - Value Obj │  │ - Ports     │  │ - Memory    │        │
│  │ - Rules     │  │ - Events    │  │ - Tools     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  DO NOT DEPEND ON:                                          │
│  - WhatsApp / Baileys                                       │
│  - OpenRouter / OpenAI                                      │
│  - Supabase / PostgreSQL                                    │
│  - Redis / Any cache                                        │
│  - n8n / Any orchestrator                                   │
│  - Google Calendar / Cal.com                                │
│  - Any specific provider                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Core Contracts (Ports)

```typescript
// Channel Port — Any messaging channel
interface ChannelPort {
  sendMessage(conversationId: string, content: MessageContent): Promise<void>;
  onMessage(handler: MessageHandler): void;
  getConnectionStatus(): ConnectionStatus;
}

// LLM Port — Any AI provider
interface LLMPort {
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMChunk>;
  countTokens(text: string): Promise<number>;
}

// Storage Port — Any database
interface StoragePort {
  conversations: ConversationRepository;
  messages: MessageRepository;
  contacts: ContactRepository;
  tenants: TenantRepository;
}

// RAG Port — Any vector store
interface RAGPort {
  ingest(document: Document): Promise<void>;
  query(query: RAGQuery): Promise<RAGResult[]>;
  delete(tenantId: string, documentId: string): Promise<void>;
}

// Memory Port — Any memory store
interface MemoryPort {
  get(key: string): Promise<MemoryEntry | null>;
  set(key: string, value: MemoryEntry, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// Tool Port — Any external tool
interface ToolPort {
  execute(request: ToolRequest): Promise<ToolResult>;
  getDefinition(): ToolDefinition;
}

// Observability Port — Any monitoring system
interface ObservabilityPort {
  log(level: string, message: string, context?: Record<string, unknown>): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
  trace(operation: string, fn: () => Promise<T>): Promise<T>;
}
```

---

## 3. Domain Layer

### 3.1 Entities

```typescript
// Tenant — Business unit
interface Tenant {
  id: string;
  name: string;
  config: TenantConfig;
  createdAt: Date;
  updatedAt: Date;
}

// Contact — External person
interface Contact {
  id: string;
  tenantId: string;
  phone: string;
  name: string | null;
  email: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Conversation — Message thread
interface Conversation {
  id: string;
  tenantId: string;
  contactId: string;
  channel: string;
  mode: "AI" | "HUMAN";
  status: "active" | "closed" | "archived";
  lastMessageAt: Date | null;
  createdAt: Date;
}

// Message — Single message
interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "human";
  content: MessageContent;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Lead — Potential customer
interface Lead {
  id: string;
  tenantId: string;
  contactId: string;
  score: number;
  status: "new" | "qualified" | "disqualified" | "converted";
  criteria: LeadCriteria;
  createdAt: Date;
}

// Appointment — Scheduled meeting
interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  scheduledAt: Date;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  meetingUrl: string | null;
  createdAt: Date;
}
```

### 3.2 Value Objects

```typescript
// MessageContent — Polymorphic content
type MessageContent =
  | { type: "text"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "document"; url: string; filename: string }
  | { type: "audio"; url: string; duration?: number };

// TenantConfig — Business configuration
interface TenantConfig {
  llm: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tools: {
    googleSheetsWebhookUrl?: string;
    calBookingUrl?: string;
    customTools?: ToolDefinition[];
  };
  prompts: {
    system: string;
    fallback: string;
  };
  rateLimits: {
    maxRequestsPerMinute: number;
    maxTokensPerDay: number;
  };
}

// LeadCriteria — Scoring criteria
interface LeadCriteria {
  hasActiveBusiness: boolean;
  monthlyRevenue?: number;
  painMatchesProposal: boolean;
  urgencyLevel: "low" | "medium" | "high";
  budgetConfirmed: boolean;
}
```

### 3.3 Domain Events

```typescript
// Domain Events
interface DomainEvent {
  id: string;
  tenantId: string;
  timestamp: Date;
  type: string;
  payload: unknown;
}

// Specific Events
interface MessageReceived extends DomainEvent {
  type: "message.received";
  payload: { conversationId: string; messageId: string };
}

interface MessageSent extends DomainEvent {
  type: "message.sent";
  payload: { conversationId: string; messageId: string; channel: string };
}

interface LeadQualified extends DomainEvent {
  type: "lead.qualified";
  payload: { leadId: string; score: number };
}

interface AppointmentScheduled extends DomainEvent {
  type: "appointment.scheduled";
  payload: { appointmentId: string; scheduledAt: Date };
}

interface HumanEscalation extends DomainEvent {
  type: "human.escalation";
  payload: { conversationId: string; reason: string };
}
```

---

## 4. Application Layer

### 4.1 Use Cases

```typescript
// Message Processing
interface ProcessMessageUseCase {
  execute(input: {
    tenantId: string;
    conversationId: string;
    content: MessageContent;
  }): Promise<void>;
}

// Lead Management
interface QualifyLeadUseCase {
  execute(input: { tenantId: string; conversationId: string }): Promise<Lead>;
}

// Appointment Scheduling
interface ScheduleAppointmentUseCase {
  execute(input: { tenantId: string; leadId: string; preferredTime?: Date }): Promise<Appointment>;
}

// Human Escalation
interface EscalateToHumanUseCase {
  execute(input: { tenantId: string; conversationId: string; reason: string }): Promise<void>;
}

// Knowledge Query
interface QueryKnowledgeUseCase {
  execute(input: {
    tenantId: string;
    query: string;
    context?: string[];
  }): Promise<KnowledgeResult[]>;
}
```

### 4.2 Ports (Interfaces)

```typescript
// Repository Ports
interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByPhone(tenantId: string, phone: string): Promise<Conversation | null>;
  list(tenantId: string, filters?: ConversationFilters): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
  delete(id: string): Promise<void>;
}

interface MessageRepository {
  findByConversation(conversationId: string, limit?: number): Promise<Message[]>;
  save(message: Message): Promise<void>;
  countByTenant(tenantId: string): Promise<number>;
}

interface ContactRepository {
  findById(id: string): Promise<Contact | null>;
  findByPhone(tenantId: string, phone: string): Promise<Contact | null>;
  save(contact: Contact): Promise<void>;
}

interface LeadRepository {
  findById(id: string): Promise<Lead | null>;
  findByConversation(conversationId: string): Promise<Lead | null>;
  save(lead: Lead): Promise<void>;
  listByTenant(tenantId: string): Promise<Lead[]>;
}

interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findByLead(leadId: string): Promise<Appointment | null>;
  save(appointment: Appointment): Promise<void>;
  listUpcoming(tenantId: string): Promise<Appointment[]>;
}

// External Service Ports
interface SchedulingService {
  getAvailability(tenantId: string): Promise<TimeSlot[]>;
  createBooking(input: BookingInput): Promise<BookingResult>;
  cancelBooking(bookingId: string): Promise<void>;
}

interface NotificationService {
  send(input: NotificationInput): Promise<void>;
}

interface AnalyticsService {
  track(event: AnalyticsEvent): Promise<void>;
}
```

---

## 5. Infrastructure Layer

### 5.1 Database (Supabase/PostgreSQL)

```sql
-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contacts
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

-- Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  channel TEXT NOT NULL,
  mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
  status TEXT CHECK(status IN ('active','closed','archived')) NOT NULL DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  score INTEGER CHECK(score >= 0 AND score <= 10),
  status TEXT CHECK(status IN ('new','qualified','disqualified','converted')) NOT NULL DEFAULT 'new',
  criteria JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lead_id UUID NOT NULL REFERENCES leads(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK(status IN ('scheduled','confirmed','completed','cancelled')) NOT NULL DEFAULT 'scheduled',
  meeting_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RAG Documents (vector store via pgvector)
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
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

-- Indexes
CREATE INDEX idx_contacts_phone ON contacts(tenant_id, phone);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_rag_documents_tenant ON rag_documents(tenant_id);
CREATE INDEX idx_rag_documents_embedding ON rag_documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Row Level Security
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_contacts ON contacts
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_conversations ON conversations
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_messages ON messages
  USING (conversation_id IN (
    SELECT id FROM conversations
    WHERE tenant_id = current_setting('app.current_tenant')::UUID
  ));

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_appointments ON appointments
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_rag_documents ON rag_documents
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

### 5.2 Cache (Redis)

```
Use Cases:
- Session storage (JWT tokens)
- Rate limiting counters
- Real-time presence
- Pub/Sub for WebSocket
- Temporary LLM responses cache

Key Patterns:
- session:{userId} → Session data (TTL: 24h)
- ratelimit:{tenantId}:{endpoint} → Counter (TTL: 1min)
- presence:{conversationId} → Last seen (TTL: 5min)
- cache:llm:{hash} → LLM response (TTL: 1h)
```

### 5.3 Vector Store (pgvector)

```
Use Cases:
- Document embeddings for RAG
- Semantic search
- Knowledge base retrieval

Configuration:
- Dimensions: 1536 (OpenAI) or 768 (local models)
- Index: IVFFlat for fast similarity search
- Distance: Cosine similarity
```

---

## 6. Adapters Layer

### 6.1 Channel Adapters

```typescript
// WhatsApp Adapter (Baileys)
class WhatsAppAdapter implements ChannelPort {
  constructor(private config: WhatsAppConfig) {}

  async sendMessage(conversationId: string, content: MessageContent): Promise<void> {
    // Implementation using Baileys
  }

  onMessage(handler: MessageHandler): void {
    // Register message handler
  }

  getConnectionStatus(): ConnectionStatus {
    // Return connection status
  }
}

// Telegram Adapter (Future)
class TelegramAdapter implements ChannelPort {
  // Implementation using Telegram Bot API
}

// Instagram Adapter (Future)
class InstagramAdapter implements ChannelPort {
  // Implementation using Instagram API
}

// Messenger Adapter (Future)
class MessengerAdapter implements ChannelPort {
  // Implementation using Meta API
}
```

### 6.2 LLM Adapters

```typescript
// OpenRouter Adapter
class OpenRouterAdapter implements LLMPort {
  constructor(private config: OpenRouterConfig) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Implementation using OpenAI SDK
  }

  async stream(request: LLMRequest): AsyncIterable<LLMChunk> {
    // Streaming implementation
  }

  async countTokens(text: string): Promise<number> {
    // Token counting
  }
}

// Anthropic Adapter (Future)
class AnthropicAdapter implements LLMPort {
  // Implementation using Anthropic SDK
}

// Local Model Adapter (Future)
class LocalModelAdapter implements LLMPort {
  // Implementation using Ollama or similar
}
```

### 6.3 Storage Adapters

```typescript
// Supabase Adapter
class SupabaseAdapter implements StoragePort {
  constructor(private config: SupabaseConfig) {}

  get conversations(): ConversationRepository {
    return new SupabaseConversationRepository(this.client);
  }

  get messages(): MessageRepository {
    return new SupabaseMessageRepository(this.client);
  }

  // ... other repositories
}
```

### 6.4 Scheduling Adapters

```typescript
// Cal.com Adapter
class CalComAdapter implements SchedulingService {
  constructor(private config: CalComConfig) {}

  async getAvailability(tenantId: string): Promise<TimeSlot[]> {
    // Implementation using Cal.com API
  }

  async createBooking(input: BookingInput): Promise<BookingResult> {
    // Implementation using Cal.com API
  }
}

// Google Calendar Adapter (Future)
class GoogleCalendarAdapter implements SchedulingService {
  // Implementation using Google Calendar API
}
```

---

## 7. Agent Architecture

### 7.1 Universal Agent

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIVERSAL AGENT                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  INTENT     │  │  RAG        │  │  MEMORY     │        │
│  │  DETECTOR   │  │  RETRIEVER  │  │  MANAGER    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  CONTEXT  │                            │
│                    │  BUILDER  │                            │
│                    └─────┬─────┘                            │
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  RESPONSE │                            │
│                    │  GENERATOR│                            │
│                    └─────┬─────┘                            │
│                          │                                  │
│                    ┌─────▼─────┐                            │
│                    │  TOOL     │                            │
│                    │  EXECUTOR │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Agent Context

```typescript
interface AgentContext {
  tenant: Tenant;
  conversation: Conversation;
  contact: Contact;
  history: Message[];
  knowledge: KnowledgeResult[];
  memory: MemoryContext;
  tools: ToolDefinition[];
}
```

### 7.3 Agent Flow

```
1. Receive Message
   │
2. Build Context
   │
   ├── Load tenant config
   ├── Load conversation history
   ├── Load contact info
   ├── Query RAG for relevant knowledge
   └── Load memory context
   │
3. Detect Intent
   │
   ├── Information request
   ├── Quote request
   ├── Appointment request
   ├── Complaint
   ├── Human escalation
   └── Unknown
   │
4. Generate Response
   │
   ├── Build system prompt
   ├── Add knowledge context
   ├── Add memory context
   ├── Call LLM
   └── Parse response
   │
5. Execute Tools (if needed)
   │
   ├── Validate tool call
   ├── Execute tool
   ├── Handle result
   └── Update context
   │
6. Send Response
   │
   ├── Save to database
   ├── Send via channel
   ├── Update memory
   └── Track analytics
```

---

## 8. Knowledge/RAG Architecture

### 8.1 RAG Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG PIPELINE                              │
│                                                             │
│  INGESTION                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │  READ   │→ │  CLEAN  │→ │  CHUNK  │→ │ EMBED   │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                              │              │
│                                              ▼              │
│                                       ┌─────────┐          │
│                                       │  STORE  │          │
│                                       │(pgvector)│         │
│                                       └─────────┘          │
│                                                             │
│  RETRIEVAL                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │  QUERY  │→ │  EMBED  │→ │  SEARCH │→ │  RANK   │      │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘      │
│                                              │              │
│                                              ▼              │
│                                       ┌─────────┐          │
│                                       │ CONTEXT │          │
│                                       └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Knowledge Separation

```
┌─────────────────────────────────────────────────────────────┐
│                 KNOWLEDGE HIERARCHY                          │
│                                                             │
│  LEVEL 1: System Instructions (NOT from RAG)                │
│  ├── Core behavior rules                                    │
│  ├── Safety guidelines                                      │
│  └── Escalation protocols                                   │
│                                                             │
│  LEVEL 2: Tenant Configuration (from Config)                │
│  ├── Business info                                          │
│  ├── Contact details                                        │
│  └── Service offerings                                      │
│                                                             │
│  LEVEL 3: Business Knowledge (from RAG)                     │
│  ├── Product catalog                                        │
│  ├── Pricing                                                │
│  ├── FAQs                                                   │
│  └── Policies                                               │
│                                                             │
│  LEVEL 4: Conversation Context (from Memory)                │
│  ├── Recent messages                                        │
│  ├── User preferences                                       │
│  └── Previous interactions                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Memory Architecture

### 9.1 Memory Types

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY LAYERS                             │
│                                                             │
│  WORKING MEMORY (Current conversation)                      │
│  ├── Last N messages                                        │
│  ├── Current intent                                         │
│  └── Active tools                                           │
│                                                             │
│  SHORT-TERM MEMORY (Recent interactions)                    │
│  ├── Conversation summaries                                 │
│  ├── Recent leads                                           │
│  └── Pending appointments                                   │
│                                                             │
│  LONG-TERM MEMORY (Persistent)                              │
│  ├── User preferences                                       │
│  ├── Interaction history                                    │
│  └── Learned patterns                                       │
│                                                             │
│  SEMANTIC MEMORY (Knowledge)                                │
│  ├── Business knowledge                                     │
│  ├── Product information                                    │
│  └── Policy documents                                       │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Memory Storage

```typescript
// Working Memory — In-memory (per request)
interface WorkingMemory {
  messages: Message[];
  intent: Intent | null;
  activeTools: string[];
  context: Record<string, unknown>;
}

// Short-Term Memory — Redis (per conversation)
interface ShortTermMemory {
  conversationId: string;
  summary: string;
  lastIntent: Intent;
  pendingActions: Action[];
  ttl: number; // 24 hours
}

// Long-Term Memory — PostgreSQL (per contact)
interface LongTermMemory {
  contactId: string;
  preferences: UserPreferences;
  interactionCount: number;
  lastInteraction: Date;
  tags: string[];
}

// Semantic Memory — pgvector (per tenant)
interface SemanticMemory {
  tenantId: string;
  documents: Document[];
  embeddings: number[][];
}
```

---

## 10. Tools Architecture

### 10.1 Tool Registry

```typescript
// Tool Definition
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  permissions: Permission[];
  rateLimit: RateLimitConfig;
}

// Tool Execution
interface ToolExecutor {
  validate(args: unknown): ValidationResult;
  execute(args: unknown, context: ToolContext): Promise<ToolResult>;
  rollback(args: unknown, result: ToolResult): Promise<void>;
}

// Built-in Tools
const BUILT_IN_TOOLS: ToolDefinition[] = [
  guardarLead,
  calificar,
  agendar,
  derivarHumano,
  buscarConocimiento,
  actualizarContacto,
  crearSeguimiento,
  obtenerDisponibilidad,
];
```

### 10.2 Tool Security

```
┌─────────────────────────────────────────────────────────────┐
│                 TOOL SECURITY LAYERS                         │
│                                                             │
│  1. AUTHENTICATION                                          │
│     └── Verify tool call is from authorized agent           │
│                                                             │
│  2. AUTHORIZATION                                           │
│     └── Check tenant has permission for this tool           │
│                                                             │
│  3. VALIDATION                                              │
│     └── Validate input parameters                           │
│                                                             │
│  4. RATE LIMITING                                           │
│     └── Check rate limits for this tool                     │
│                                                             │
│  5. AUDIT                                                   │
│     └── Log tool execution                                  │
│                                                             │
│  6. ROLLBACK                                                │
│     └── Support undo for reversible operations              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Observability Architecture

### 11.1 Three Pillars

```
┌─────────────────────────────────────────────────────────────┐
│                 OBSERVABILITY                                │
│                                                             │
│  LOGS                                                       │
│  ├── Application logs                                       │
│  ├── Access logs                                            │
│  ├── Error logs                                             │
│  └── Audit logs                                             │
│                                                             │
│  METRICS                                                    │
│  ├── Request count/latency                                  │
│  ├── LLM usage/cost                                         │
│  ├── Message delivery rate                                  │
│  ├── Lead conversion rate                                   │
│  └── System health                                          │
│                                                             │
│  TRACES                                                     │
│  ├── Request tracing                                        │
│  ├── LLM call tracing                                       │
│  ├── Tool execution tracing                                 │
│  └── Cross-service tracing                                  │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 Health Checks

```typescript
interface HealthCheck {
  name: string;
  check: () => Promise<HealthStatus>;
  critical: boolean;
}

const HEALTH_CHECKS: HealthCheck[] = [
  { name: "database", check: checkDatabase, critical: true },
  { name: "redis", check: checkRedis, critical: true },
  { name: "llm", check: checkLLM, critical: false },
  { name: "whatsapp", check: checkWhatsApp, critical: true },
  { name: "rag", check: checkRAG, critical: false },
];
```

---

## 12. Control Plane Architecture

### 12.1 Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│                 ADMIN CONTROL PLANE                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   HEALTH    │  │   ERRORS    │  │  EXECUTIONS │        │
│  │   DASHBOARD │  │   VIEWER    │  │  LOG        │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   TENANTS   │  │   AGENTS    │  │   RAG       │        │
│  │   MANAGER   │  │   CONFIG    │  │   MANAGER   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   ANALYTICS │  │   COSTS     │  │   CONFIG    │        │
│  │   DASHBOARD │  │   TRACKER   │  │   MANAGER   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. Migration Strategy

### 13.1 Incremental Evolution

```
Phase 02: Contracts + Configuration
  └── Define TypeScript interfaces, centralize config

Phase 03: Engineering Foundation
  └── Add tests, linting, CI/CD

Phase 04: Data + Multi-Tenancy
  └── Migrate SQLite → PostgreSQL, add tenant_id

Phase 05: RAG + Knowledge
  └── Add pgvector, implement RAG pipeline

Phase 06: Universal Agent + Memory
  └── Refactor agent, add memory layers

Phase 07: Tools + Calendar
  └── Refactor tools, add scheduling

Phase 08: Omnichannel
  └── Add channel adapters

Phase 09: N8N Orchestration
  └── Add n8n integration

Phase 10: CRM + Follow-Up
  └── Add CRM features

Phase 11: Observability
  └── Add logging, metrics, traces

Phase 12: Admin Control Plane
  └── Build admin dashboard

Phase 13: Recovery + Autonomy
  └── Add recovery mechanisms

Phase 14: Hardening
  └── Security audit, performance optimization
```

### 13.2 Backward Compatibility

- Keep SQLite for development/testing
- Keep existing API routes working
- Add new routes alongside old ones
- Migrate data incrementally
- Support both old and new auth during transition

---

**Generated by:** AI-BOS Phase 01 — Target Architecture
**Date:** 2026-07-25
