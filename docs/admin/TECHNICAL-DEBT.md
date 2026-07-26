# TECHNICAL-DEBT.md — Phase 00 System Audit

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 00 — System Audit

---

## Executive Summary

The WhatsApp AI Agent Kit has **16 identified technical debt items** across 4 severity levels:

- **P0 (Critical):** 2 items
- **P1 (High):** 4 items
- **P2 (Medium):** 5 items
- **P3 (Low):** 5 items

---

## P0 — Critical Debt

### TD-001: No Authentication on Dashboard

**Location:** `src/app/`, `src/components/`

**Description:**
The dashboard is accessible to anyone with the URL. There is no authentication, authorization, or session management. Any user can:
- View all conversations
- Read all messages
- Switch between AI/HUMAN modes
- Delete conversations
- Send messages on behalf of the business

**Impact:**
- Complete data exposure
- Unauthorized access to customer conversations
- Potential for malicious actions

**Remediation:**
1. Add basic authentication (env-based or database-backed)
2. Add session management
3. Add API route protection

**Effort:** Medium (2-3 days)

---

### TD-002: Secret Exposed in Config File

**Location:** `config/servers.json:51`

**Description:**
The OpenRouter API key is hardcoded in `config/servers.json`:
```json
"api_key": "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"
```

**Impact:**
- Secret leaked in version control
- Anyone with repo access has the API key
- Potential for cost runaway

**Remediation:**
1. Remove API key from `config/servers.json`
2. Use environment variables only
3. Rotate the exposed key

**Effort:** Low (1 hour)

---

## P1 — High Debt

### TD-003: No Input Validation on API Routes

**Location:** `src/app/api/`

**Description:**
API routes accept untrusted input without validation:
- `POST /api/messages/[id]` — No content sanitization
- `POST /api/mode/[id]` — No mode validation
- `DELETE /api/conversations/[id]` — No ownership check

**Impact:**
- Potential injection attacks
- Data corruption
- Unauthorized actions

**Remediation:**
1. Add input validation with Zod or similar
2. Add sanitization for text content
3. Add ownership/authorization checks

**Effort:** Medium (2-3 days)

---

### TD-004: No Rate Limiting on LLM Calls

**Location:** `src/lib/openrouter.ts`

**Description:**
There is no rate limiting on LLM API calls. A single conversation could trigger unlimited requests.

**Impact:**
- Cost runaway
- API key exhaustion
- Potential service ban

**Remediation:**
1. Add per-conversation rate limiting
2. Add global rate limiting
3. Add cost tracking and alerts

**Effort:** Medium (1-2 days)

---

### TD-005: SQLite Not Suitable for Production

**Location:** `src/lib/db.ts`

**Description:**
SQLite has fundamental limitations for production:
- Single-writer concurrency
- No network access
- No built-in replication
- File-based storage

**Impact:**
- Concurrency bottlenecks
- No horizontal scaling
- Data loss risk on disk failure

**Remediation:**
1. Migrate to PostgreSQL for production
2. Keep SQLite for development/testing
3. Add connection pooling

**Effort:** High (3-5 days)

---

### TD-006: No Message Queue for Offline Scenarios

**Location:** `src/lib/baileys/outbox.ts`

**Description:**
The outbox system uses polling (2s intervals) and SQLite. If the bot goes down, messages are:
- Not received (WhatsApp doesn't queue indefinitely)
- Not sent (outbox polling stops)

**Impact:**
- Message loss during downtime
- No delivery guarantees
- No retry mechanism

**Remediation:**
1. Add persistent message queue (Redis/RabbitMQ)
2. Add retry logic with exponential backoff
3. Add delivery status tracking

**Effort:** High (3-5 days)

---

## P2 — Medium Debt

### TD-007: No Media Handling

**Location:** `src/lib/baileys/handler.ts:48-50`

**Description:**
The handler only processes text messages. Images, audio, documents, and stickers are silently ignored.

**Impact:**
- Limited functionality
- Poor user experience
- Missed business opportunities (e.g., photo-based inquiries)

**Remediation:**
1. Add image handling (OCR or description)
2. Add document handling (PDF parsing)
3. Add audio handling (transcription)

**Effort:** High (5-7 days)

---

### TD-008: Hardcoded Tool Weights

**Location:** `src/lib/tools/calificar.ts:50-55`

**Description:**
Lead scoring weights are hardcoded:
```typescript
if (args.tieneNegocioActivo) score += 3;
if (args.facturaMasDe5kMes) score += 3;
if (args.dolorEncajaConPropuesta) score += 2;
if (args.urgenciaAlta) score += 1;
if (args.presupuestoConfirmado) score += 1;
```

**Impact:**
- Not configurable per tenant
- Not adaptable to different businesses
- Requires code changes for tuning

**Remediation:**
1. Move weights to configuration
2. Add per-tenant customization
3. Add A/B testing capability

**Effort:** Medium (2-3 days)

---

### TD-009: No Conversation Export

**Location:** `src/components/ConversationPanel.tsx`

**Description:**
There is no way to export conversations. Users can only view them in the dashboard.

**Impact:**
- Data portability issue
- Compliance risk (GDPR, etc.)
- No backup capability

**Remediation:**
1. Add CSV export
2. Add JSON export
3. Add PDF export

**Effort:** Low (1 day)

---

### TD-010: Polling Instead of WebSocket

**Location:** `src/components/Dashboard.tsx:44`, `src/components/ConversationPanel.tsx:51`

**Description:**
The dashboard uses polling (2s intervals) for updates:
```typescript
const interval = setInterval(refresh, 2000);
```

**Impact:**
- Suboptimal UX (2s delay)
- Unnecessary network traffic
- Battery drain on mobile

**Remediation:**
1. Implement WebSocket for real-time updates
2. Add Server-Sent Events as fallback
3. Optimize polling frequency

**Effort:** Medium (2-3 days)

---

### TD-011: No Token Counting

**Location:** `src/lib/openrouter.ts`

**Description:**
There is no tracking of token usage or costs. The LLM calls are made without monitoring.

**Impact:**
- No cost visibility
- No budget alerts
- No usage analytics

**Remediation:**
1. Add token counting from API responses
2. Add cost calculation
3. Add usage dashboard

**Effort:** Medium (1-2 days)

---

## P3 — Low Debt

### TD-012: Empty Documentation Files

**Location:** `docs/security.md`, `docs/testing.md`, `docs/architecture.md`

**Description:**
Several documentation files are empty placeholders:
```markdown
# Security

## Threat Model


## Secrets Handling


## Vulnerabilities


## Mitigations
```

**Impact:**
- Maintenance burden
- Confusion for new developers
- Incomplete documentation

**Remediation:**
1. Fill in security documentation
2. Fill in testing documentation
3. Fill in architecture documentation

**Effort:** Low (1-2 days)

---

### TD-013: Stale Documentation

**Location:** `docs/project-state.md`, `docs/inventory.md`

**Description:**
Some documentation is outdated:
- `project-state.md` last updated 2026-07-20
- `inventory.md` lists old Baileys version (^6.7.21)

**Impact:**
- Confusion
- Incorrect information
- Maintenance burden

**Remediation:**
1. Update project-state.md
2. Update inventory.md
3. Add documentation freshness checks

**Effort:** Low (1 hour)

---

### TD-014: Verbose Logging in Production

**Location:** `src/lib/baileys/client.ts:25`

**Description:**
The Baileys logger is set to debug level:
```typescript
const baileysLogger = pino({ level: "debug" }); // Temporal: debug para ver errores de conexión
```

**Impact:**
- Verbose logs
- Performance impact
- Storage bloat

**Remediation:**
1. Set to `silent` or `warn` for production
2. Add environment-based configuration
3. Add log rotation

**Effort:** Low (15 minutes)

---

### TD-015: No Soft Deletes

**Location:** `src/lib/db.ts:204-216`

**Description:**
Conversations are permanently deleted:
```typescript
const deleteConversationTx = db.transaction((conversationId: number): void => {
  stmtDeleteMessages.run(conversationId);
  stmtDeletePendingOutbox.run(conversationId);
  stmtDeleteConv.run(conversationId);
});
```

**Impact:**
- Data permanently lost
- No recovery possible
- Compliance risk

**Remediation:**
1. Add `deleted_at` column
2. Add soft delete functions
3. Add data retention policy

**Effort:** Low (1 day)

---

### TD-016: No Audit Trail

**Location:** All database operations

**Description:**
There is no audit trail for changes. Who changed what, when, is not tracked.

**Impact:**
- No accountability
- No debugging capability
- Compliance risk

**Remediation:**
1. Add audit_logs table
2. Add triggers for change tracking
3. Add audit middleware

**Effort:** Medium (2-3 days)

---

## Debt Summary

| Severity | Count | Total Effort |
|----------|-------|--------------|
| P0 (Critical) | 2 | 1-2 days |
| P1 (High) | 4 | 9-15 days |
| P2 (Medium) | 5 | 11-16 days |
| P3 (Low) | 5 | 4-5 days |
| **Total** | **16** | **25-38 days** |

---

## Remediation Priority

### Phase 02: Contracts + Configuration
- TD-002 (Remove secret from config)
- TD-008 (Make tool weights configurable)

### Phase 03: Engineering Foundation
- TD-003 (Input validation)
- TD-012 (Documentation)
- TD-013 (Stale docs)
- TD-014 (Logging)

### Phase 04: Data + Multi-Tenancy
- TD-005 (PostgreSQL migration)
- TD-015 (Soft deletes)
- TD-016 (Audit trail)

### Phase 06: Universal Agent + Memory
- TD-004 (Rate limiting)
- TD-011 (Token counting)

### Phase 07: Tools + Calendar
- TD-007 (Media handling)
- TD-009 (Conversation export)

### Phase 08: Omnichannel
- TD-006 (Message queue)

### Phase 11: Observability
- TD-010 (WebSocket)

### Phase 14: Hardening
- TD-001 (Authentication)

---

**Generated by:** AI-BOS Phase 00 — System Audit
**Date:** 2026-07-25
