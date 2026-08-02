# Spec: Phase 05 — RAG + Knowledge

## Overview

Add a Retrieval-Augmented Generation (RAG) system to the WhatsApp AI Agent. The agent can now consult product catalogs, FAQs, and technical documents to answer customer questions. Includes a Dashboard section for managing knowledge bases and uploading documents.

## Goals

- Agent answers questions using Biokool's actual product/service data
- Non-technical user can upload PDFs and manage content from Dashboard
- Multi-tenant ready (knowledge isolated per tenant)
- Simple, cost-effective (Supabase pgvector + OpenAI embeddings)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    DASHBOARD                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Knowledge   │  │ Documents    │  │ Upload     │ │
│  │ Base List   │  │ (per KB)     │  │ PDF/URL    │ │
│  └─────────────┘  └──────────────┘  └────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ API
┌──────────────────────▼──────────────────────────────┐
│                  RAG SERVICE                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Ingest   │  │ Chunker  │  │ Embedding (OAI)   │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐ │
│  │ Retriever│  │ Ranker   │  │ pgvector search   │ │
│  └──────────┘  └──────────┘  └───────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               SUPABASE (pgvector)                    │
│  knowledge_bases | documents | document_chunks       │
└─────────────────────────────────────────────────────┘
```

## Database Schema

### knowledge_bases

| Column          | Type        | Description                       |
| --------------- | ----------- | --------------------------------- |
| id              | uuid PK     |                                   |
| tenant_id       | uuid FK     |                                   |
| name            | text        | e.g. "Catálogo Biokool"           |
| description     | text        |                                   |
| embedding_model | text        | default: "text-embedding-3-small" |
| chunk_size      | int         | default: 500                      |
| chunk_overlap   | int         | default: 50                       |
| is_active       | boolean     | default: true                     |
| created_at      | timestamptz |                                   |
| updated_at      | timestamptz |                                   |

### documents

| Column            | Type        | Description                               |
| ----------------- | ----------- | ----------------------------------------- |
| id                | uuid PK     |                                           |
| knowledge_base_id | uuid FK     |                                           |
| tenant_id         | uuid FK     |                                           |
| title             | text        |                                           |
| source_type       | text        | 'pdf', 'url', 'text'                      |
| source_url        | text        | nullable                                  |
| storage_path      | text        | nullable (Supabase Storage)               |
| status            | text        | 'pending', 'processing', 'ready', 'error' |
| error_message     | text        | nullable                                  |
| chunk_count       | int         | default: 0                                |
| created_at        | timestamptz |                                           |
| updated_at        | timestamptz |                                           |

### document_chunks

| Column            | Type         | Description         |
| ----------------- | ------------ | ------------------- |
| id                | uuid PK      |                     |
| document_id       | uuid FK      |                     |
| knowledge_base_id | uuid FK      |                     |
| tenant_id         | uuid FK      |                     |
| content           | text         | chunk text          |
| metadata          | jsonb        | page, section, etc. |
| embedding         | vector(1536) | OpenAI embedding    |
| created_at        | timestamptz  |                     |

### Indexes

```sql
-- Vector similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Tenant isolation
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX idx_chunks_kb ON document_chunks(knowledge_base_id);

-- Document lookup
CREATE INDEX idx_documents_kb ON documents(knowledge_base_id);
```

### RLS Policies

```sql
-- Users can only see their tenant's knowledge
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON knowledge_bases
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Same for documents and chunks
```

## API Routes

| Method | Route                               | Description           |
| ------ | ----------------------------------- | --------------------- |
| GET    | /api/knowledge-bases                | List knowledge bases  |
| POST   | /api/knowledge-bases                | Create knowledge base |
| DELETE | /api/knowledge-bases/[id]           | Delete knowledge base |
| GET    | /api/knowledge-bases/[id]/documents | List documents        |
| POST   | /api/knowledge-bases/[id]/documents | Upload document       |
| DELETE | /api/documents/[id]                 | Delete document       |
| POST   | /api/documents/[id]/reprocess       | Re-chunk document     |

## Ingest Pipeline

```
1. User uploads PDF via Dashboard
2. API saves to Supabase Storage
3. Document record created (status: 'processing')
4. Background job:
   a. Download PDF from Storage
   b. Extract text (pdf-parse)
   c. Chunk text (500 chars, 50 overlap)
   d. Generate embeddings (OpenAI text-embedding-3-small)
   e. Insert chunks into document_chunks
   f. Update document status to 'ready'
```

## Retrieval Pipeline

```
1. User sends WhatsApp message
2. Handler calls retrieveContext(conversationId, query)
3. Embed query text
4. Vector search: top 5 chunks by tenant
5. Return chunks as context string
6. LLM receives: system_prompt + rag_context + conversation_history
```

## LLM Integration

```typescript
// In generateReply()
const ragContext = await retrieveContext(conversationId, lastMessage);

const systemPrompt = `
Eres el asistente de Biokool, especialista en soluciones bioclimáticas.

CONTEXTO DEL CATÁLOGO:
${ragContext}

Responde siempre basándote en la información del catálogo cuando sea relevante.
Si no tienes información suficiente, indica que un asesor se pondrá en contacto.
`;

// Call LLM with enhanced system prompt
```

## Dashboard UI: Knowledge Section

### Layout

```
┌─────────────────────────────────────────────────┐
│ 📚 Knowledge Base                    [+ Nuevo]  │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌───────────────────────────┐ │
│ │ 📁 Catálogo  │  │ Documents (3)             │ │
│ │    Biokool   │  │                           │ │
│ │ ✅ Activo    │  │ 📄 Catalogo_Biokool.pdf   │ │
│ │ 12 chunks   │  │    ✅ Ready · 45 chunks    │ │
│ │             │  │ 📄 FAQ_Tecnico.pdf         │ │
│ │ 📁 FAQ      │  │    ✅ Ready · 12 chunks    │ │
│ │    Técnico  │  │ 📄 Manuales.zip           │ │
│ │ ✅ Activo   │  │    ⏳ Processing...        │ │
│ │ 8 chunks   │  │                           │ │
│ │             │  │ ┌─────────────────────┐   │ │
│ │             │  │ │ 📤 Arrastra archivos│   │ │
│ │             │  │ │    o haz clic       │   │ │
│ │             │  │ └─────────────────────┘   │ │
│ └──────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### UI Components

1. **KnowledgeBaseCard** — Shows KB name, status, chunk count
2. **DocumentList** — Lists documents with status badges
3. **UploadZone** — Drag & drop or click to upload PDFs
4. **StatusBadge** — Processing/Ready/Error indicators
5. **ChunkPreview** — Preview chunks (for debugging)

### UX Best Practices

- **Progress feedback**: Show processing status in real-time
- **Error handling**: Clear error messages with retry option
- **Drag & drop**: Native HTML5 drag and drop
- **File validation**: Accept PDF, TXT, MD only, max 10MB
- **Confirmation dialogs**: Before deleting KBs or documents
- **Empty states**: Helpful guidance when no KBs exist
- **Responsive**: Works on mobile and desktop

## Implementation Steps

1. Create database tables + RLS policies
2. Enable pgvector extension in Supabase
3. Create ingest service (PDF → chunks → embeddings)
4. Create retrieval service (query → search → context)
5. Integrate retrieval into handler.ts
6. Create API routes for knowledge management
7. Create Dashboard UI components
8. Test end-to-end: upload PDF → ask question → get accurate answer
9. Write checkpoint + update AI-BOS-STATE.md

## Testing

- Upload a PDF → verify chunks created
- Ask question about uploaded content → verify relevant answer
- Ask question NOT in knowledge base → verify graceful fallback
- Test tenant isolation (if multi-tenant)
- Test file size limits and error handling

## Dependencies

- Supabase pgvector extension (needs to be enabled)
- OpenAI API key (already configured)
- pdf-parse npm package
- @supabase/storage-js (already included)
