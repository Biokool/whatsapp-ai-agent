# ARCHITECTURE-MIGRATION-PLAN.md — Phase 01 Target Architecture

**Project:** WhatsApp AI Agent Kit (Biokool)
**Date:** 2026-07-25
**Phase:** 01 — Target Architecture

---

## 1. Migration Strategy

### 1.1 Principles

1. **Incremental Evolution** — Small changes, validate, repeat
2. **Backward Compatibility** — Keep existing functionality working
3. **No Big Bang** — Never rewrite everything at once
4. **Validate Each Step** — Test before moving forward
5. **Rollback Capability** — Always have a way back

### 1.2 Migration Phases

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION PHASES                              │
│                                                                 │
│  PHASE 02: Contracts + Configuration                            │
│  ├── Define TypeScript interfaces                               │
│  ├── Centralize configuration                                   │
│  ├── Add environment validation                                 │
│  └── Prepare for multi-tenancy                                  │
│                                                                 │
│  PHASE 03: Engineering Foundation                               │
│  ├── Add unit tests                                            │
│  ├── Add integration tests                                      │
│  ├── Add linting (ESLint + Prettier)                           │
│  ├── Add CI/CD (GitHub Actions)                                │
│  └── Add pre-commit hooks                                      │
│                                                                 │
│  PHASE 04: Data + Multi-Tenancy                                 │
│  ├── Migrate SQLite → PostgreSQL                                │
│  ├── Add tenant_id to all tables                               │
│  ├── Add Row Level Security                                     │
│  ├── Add Redis for caching                                      │
│  └── Add data migration scripts                                │
│                                                                 │
│  PHASE 05: RAG + Knowledge                                      │
│  ├── Add pgvector extension                                     │
│  ├── Implement RAG pipeline                                     │
│  ├── Add document ingestion                                     │
│  ├── Add semantic search                                         │
│  └── Add knowledge base management                             │
│                                                                 │
│  PHASE 06: Universal Agent + Memory                             │
│  ├── Refactor agent architecture                                │
│  ├── Add memory layers                                          │
│  ├── Add intent detection                                       │
│  ├── Add context building                                       │
│  └── Add response generation                                    │
│                                                                 │
│  PHASE 07: Tools + Calendar                                     │
│  ├── Refactor tool system                                       │
│  ├── Add tool security                                          │
│  ├── Add tool rate limiting                                      │
│  ├── Add scheduling provider abstraction                        │
│  └── Add Cal.com integration                                    │
│                                                                 │
│  PHASE 08: Omnichannel                                          │
│  ├── Add channel adapter interface                              │
│  ├── Add message normalization                                  │
│  ├── Add Telegram adapter                                       │
│  ├── Add Instagram adapter                                      │
│  └── Add Messenger adapter                                      │
│                                                                 │
│  PHASE 09: N8N Orchestration                                    │
│  ├── Add n8n integration                                        │
│  ├── Add workflow triggers                                       │
│  ├── Add webhook handlers                                       │
│  └── Add workflow management                                    │
│                                                                 │
│  PHASE 10: CRM + Follow-Up                                      │
│  ├── Add lead management                                        │
│  ├── Add follow-up system                                       │
│  ├── Add appointment management                                 │
│  └── Add conversion tracking                                    │
│                                                                 │
│  PHASE 11: Observability                                        │
│  ├── Add structured logging                                     │
│  ├── Add metrics collection                                     │
│  ├── Add distributed tracing                                    │
│  ├── Add health checks                                          │
│  └── Add alerting                                               │
│                                                                 │
│  PHASE 12: Admin Control Plane                                  │
│  ├── Build admin dashboard                                      │
│  ├── Add tenant management                                      │
│  ├── Add agent configuration                                    │
│  ├── Add RAG management                                         │
│  └── Add analytics dashboard                                    │
│                                                                 │
│  PHASE 13: Recovery + Autonomy                                  │
│  ├── Add retry mechanisms                                       │
│  ├── Add circuit breakers                                       │
│  ├── Add fallback logic                                         │
│  ├── Add auto-recovery                                          │
│  └── Add health monitoring                                      │
│                                                                 │
│  PHASE 14: Hardening                                            │
│  ├── Security audit                                             │
│  ├── Performance optimization                                   │
│  ├── Load testing                                               │
│  ├── Documentation review                                       │
│  └── Production deployment                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Migration Steps

### 2.1 Phase 02: Contracts + Configuration

**Objective:** Define stable interfaces and centralize configuration

**Steps:**
1. Create `src/core/types/` directory
2. Define TypeScript interfaces for all entities
3. Define port interfaces for all adapters
4. Create `src/config/` directory
5. Centralize all environment variables
6. Add environment validation with Zod
7. Create configuration objects

**Files to Create:**
```
src/
├── core/
│   ├── types/
│   │   ├── tenant.ts
│   │   ├── contact.ts
│   │   ├── conversation.ts
│   │   ├── message.ts
│   │   ├── lead.ts
│   │   ├── appointment.ts
│   │   └── index.ts
│   ├── ports/
│   │   ├── channel.ts
│   │   ├── llm.ts
│   │   ├── storage.ts
│   │   ├── rag.ts
│   │   ├── memory.ts
│   │   ├── tool.ts
│   │   └── index.ts
│   └── events/
│       ├── domain.ts
│       └── index.ts
└── config/
    ├── environment.ts
    ├── tenants.ts
    └── index.ts
```

**Validation:**
- [ ] All interfaces compile without errors
- [ ] Configuration loads correctly
- [ ] Environment validation works
- [ ] Existing functionality still works

---

### 2.2 Phase 03: Engineering Foundation

**Objective:** Establish engineering best practices

**Steps:**
1. Add ESLint configuration
2. Add Prettier configuration
3. Add Jest/Vitest for testing
4. Add pre-commit hooks (husky)
5. Add GitHub Actions CI
6. Add type checking to CI
7. Add lint checking to CI
8. Add test running to CI

**Files to Create/Modify:**
```
├── .eslintrc.js
├── .prettierrc
├── jest.config.js
├── .husky/
│   └── pre-commit
├── .github/
│   └── workflows/
│       └── ci.yml
└── package.json (add scripts)
```

**Validation:**
- [ ] ESLint runs without errors
- [ ] Prettier formats code correctly
- [ ] Tests run and pass
- [ ] Pre-commit hooks work
- [ ] CI pipeline runs

---

### 2.3 Phase 04: Data + Multi-Tenancy

**Objective:** Migrate to PostgreSQL and add multi-tenancy

**Steps:**
1. Set up Supabase project
2. Create database schema
3. Add tenant_id to all tables
4. Add Row Level Security policies
5. Create migration scripts
6. Migrate data from SQLite
7. Add Redis for caching
8. Update API routes for multi-tenancy
9. Add tenant resolution middleware

**Files to Create:**
```
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_tenants.sql
│   │   ├── 002_create_contacts.sql
│   │   ├── 003_create_conversations.sql
│   │   ├── 004_create_messages.sql
│   │   ├── 005_create_leads.sql
│   │   ├── 006_create_appointments.sql
│   │   ├── 007_create_rag_documents.sql
│   │   ├── 008_create_audit_logs.sql
│   │   └── 009_enable_rls.sql
│   └── seed.sql
├── src/
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── supabase.ts
│   │   │   ├── repositories/
│   │   │   │   ├── conversation.ts
│   │   │   │   ├── message.ts
│   │   │   │   ├── contact.ts
│   │   │   │   ├── lead.ts
│   │   │   │   └── appointment.ts
│   │   │   └── index.ts
│   │   └── cache/
│   │       ├── redis.ts
│   │       └── index.ts
│   └── middleware/
│       ├── tenant.ts
│       └── index.ts
└── scripts/
    └── migrate-sqlite-to-postgres.ts
```

**Validation:**
- [ ] Database schema created correctly
- [ ] RLS policies work
- [ ] Data migration successful
- [ ] API routes work with multi-tenancy
- [ ] Tenant isolation verified

---

### 2.4 Phase 05: RAG + Knowledge

**Objective:** Add RAG capabilities

**Steps:**
1. Enable pgvector extension
2. Create rag_documents table with embeddings
3. Implement document ingestion pipeline
4. Implement semantic search
5. Add knowledge base management
6. Integrate with agent

**Files to Create:**
```
src/
├── infrastructure/
│   └── rag/
│       ├── pgvector.ts
│       ├── ingestion/
│       │   ├── reader.ts
│       │   ├── cleaner.ts
│       │   ├── chunker.ts
│       │   └── embedder.ts
│       ├── retrieval/
│       │   ├── searcher.ts
│       │   ├── ranker.ts
│       │   └── context-builder.ts
│       └── index.ts
└── application/
    └── use-cases/
        └── query-knowledge.ts
```

**Validation:**
- [ ] Documents can be ingested
- [ ] Embeddings are generated
- [ ] Semantic search works
- [ ] Context is built correctly
- [ ] Agent uses RAG results

---

### 2.5 Phase 06: Universal Agent + Memory

**Objective:** Refactor agent architecture

**Steps:**
1. Create agent context builder
2. Implement intent detection
3. Add memory layers (working, short-term, long-term)
4. Refactor response generation
5. Add tool execution
6. Add escalation logic

**Files to Create:**
```
src/
├── core/
│   └── agent/
│       ├── context-builder.ts
│       ├── intent-detector.ts
│       ├── response-generator.ts
│       ├── tool-executor.ts
│       └── index.ts
├── infrastructure/
│   └── memory/
│       ├── working-memory.ts
│       ├── short-term-memory.ts
│       ├── long-term-memory.ts
│       └── index.ts
└── application/
    └── use-cases/
        ├── process-message.ts
        └── escalate-to-human.ts
```

**Validation:**
- [ ] Agent builds context correctly
- [ ] Intent detection works
- [ ] Memory persists correctly
- [ ] Response generation works
- [ ] Tools execute correctly

---

## 3. Rollback Strategy

### 3.1 Database Rollback

```bash
# Backup before migration
pg_dump your_database > backup_$(date +%Y%m%d).sql

# Rollback migration
psql your_database < backup_20260725.sql
```

### 3.2 Code Rollback

```bash
# Git rollback
git revert <commit-hash>

# Or reset to previous version
git reset --hard <commit-hash>
```

### 3.3 Docker Rollback

```bash
# Use previous image
docker compose -f docker-compose.local.yml up -d --build
```

---

## 4. Testing Strategy

### 4.1 Unit Tests

- Test each entity
- Test each value object
- Test each use case
- Test each adapter

### 4.2 Integration Tests

- Test database operations
- Test API routes
- Test LLM integration
- Test channel integration

### 4.3 E2E Tests

- Test complete message flow
- Test lead qualification
- Test appointment scheduling
-Test human escalation

---

## 5. Success Criteria

### 5.1 Phase 02 Success

- [ ] All interfaces defined
- [ ] Configuration centralized
- [ ] Environment validation works
- [ ] Existing functionality preserved

### 5.2 Phase 03 Success

- [ ] ESLint passes
- [ ] Tests pass
- [ ] CI pipeline works
- [ ] Pre-commit hooks work

### 5.3 Phase 04 Success

- [ ] PostgreSQL schema created
- [ ] Multi-tenancy works
- [ ] RLS policies enforced
- [ ] Data migration successful

### 5.4 Phase 05 Success

- [ ] RAG pipeline works
- [ ] Semantic search accurate
- [ ] Knowledge base manageable
- [ ] Agent uses RAG correctly

### 5.5 Phase 06 Success

- [ ] Agent architecture clean
- [ ] Memory works correctly
- [ ] Intent detection accurate
- [ ] Response generation good

---

**Generated by:** AI-BOS Phase 01 — Target Architecture
**Date:** 2026-07-25
