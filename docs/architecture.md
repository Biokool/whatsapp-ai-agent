# Architecture

## Layers

### Presentation Layer

- **Dashboard** (Next.js 16 + React 19 + Tailwind 4)
  - Real-time conversation view
  - Knowledge Base management
  - Analytics and metrics
  - Settings and configuration

### Application Layer

- **WhatsApp Handler** (Baileys)
  - Message processing
  - LID→phone resolution
  - RAG context retrieval
- **LLM Service** (OpenRouter)
  - Multi-model support (GPT, Claude, Gemini)
  - Tool calling
  - RAG context injection
- **Knowledge Service** (RAG)
  - Document ingestion (PDF → chunks → embeddings)
  - Vector similarity search
  - Context retrieval for LLM

### Data Layer

- **Supabase** (PostgreSQL + pgvector)
  - Conversations and messages
  - Knowledge bases and documents
  - Document chunks with embeddings
  - Vector similarity search

## Services

| Service   | Port | Description             |
| --------- | ---- | ----------------------- |
| Dashboard | 3000 | Next.js web app         |
| Bot       | -    | Baileys WhatsApp client |
| Supabase  | -    | PostgreSQL + pgvector   |

## Data Flow

### Incoming Message

```
WhatsApp → Baileys → Handler → RAG Retrieval → LLM → Response → WhatsApp
```

### Knowledge Ingestion

```
PDF Upload → Extract Text → Chunk → Generate Embeddings → Store in pgvector
```

## Patterns

- **Singleton Bot**: Prevents multiple instances via lock file
- **Realtime Outbox**: Supabase Realtime + polling fallback
- **LID Resolution**: Three mechanisms for WhatsApp privacy
- **RAG Pipeline**: Modular ingest → chunk → embed → store

## Risks

- **Embedding API costs**: Monitor OpenRouter usage
- **PDF quality**: Complex layouts may extract poorly
- **Vector index**: IVFFlat requires enough data for lists=100
