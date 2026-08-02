# Inventory

Last updated: 2026-07-26 19:30 Hora estándar central (México)

## Directory Structure

```
whatsapp-ai-agent-kit/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── knowledge-bases/
│   │       │   ├── route.ts              # GET/POST knowledge bases
│   │       │   └── [id]/
│   │       │       ├── route.ts          # DELETE knowledge base
│   │       │       └── documents/
│   │       │           └── route.ts      # GET/POST documents
│   │       └── documents/
│   │           └── [id]/
│   │               ├── route.ts          # DELETE document
│   │               └── upload/
│   │                   └── route.ts      # POST upload file/URL
│   ├── components/
│   │   ├── Dashboard.tsx                 # Main dashboard (with Knowledge tab)
│   │   ├── Sidebar.tsx                   # Navigation (with Knowledge icon)
│   │   ├── KnowledgeSection.tsx          # Knowledge Base management
│   │   ├── KnowledgeBaseCard.tsx         # KB card with document list
│   │   ├── DocumentList.tsx              # Document list with status
│   │   └── UploadZone.tsx                # Drag-and-drop upload + URL input
│   ├── core/
│   │   └── types/
│   │       ├── database.ts               # Core database types
│   │       └── rag.ts                    # RAG types (KB, Document, Chunk)
│   ├── hooks/
│   │   ├── use-knowledge-bases.ts        # TanStack Query hooks
│   │   └── use-documents.ts              # TanStack Query hooks
│   └── lib/
│       ├── rag/
│       │   ├── chunker.ts                # Text chunking
│       │   ├── embeddings.ts             # Embedding generation
│       │   ├── ingest.ts                 # Document ingestion pipeline
│       │   ├── retrieval.ts              # Context retrieval
│       │   └── url-scraper.ts            # URL content extraction
│       ├── baileys/
│       │   └── handler.ts                # RAG context integration
│       ├── db.ts                         # RAG DB functions added
│       └── openrouter.ts                 # ragContext parameter
└── infrastructure/
    └── database/
        └── migrations/
            └── 005_rag_tables.sql        # pgvector tables
```

## Project Types

- Node.js / TypeScript
- Next.js 16 / React 19
- Supabase (PostgreSQL + pgvector)

## Dependencies

### Runtime Dependencies

| Package                       | Version     | Purpose                         |
| ----------------------------- | ----------- | ------------------------------- |
| @radix-ui/react-dialog        | ^1.1.23     | Dialog UI component             |
| @radix-ui/react-dropdown-menu | ^2.1.24     | Dropdown menu UI                |
| @radix-ui/react-slot          | ^1.3.3      | Slot component                  |
| @supabase/supabase-js         | ^2.109.0    | Supabase client                 |
| @tanstack/react-query         | ^5.101.4    | Data fetching hooks             |
| @whiskeysockets/baileys       | ^7.0.0-rc.9 | WhatsApp Web client             |
| boxen                         | ^8.0.1      | Terminal boxes (wizard)         |
| chalk                         | ^5.3.0      | Terminal colors (wizard)        |
| class-variance-authority      | ^0.7.1      | CSS class variants              |
| clsx                          | ^2.1.1      | Class name utility              |
| concurrently                  | ^9.1.2      | Run multiple commands           |
| dotenv                        | ^17.4.2     | Environment variables           |
| enquirer                      | ^2.4.1      | CLI prompts (wizard)            |
| ioredis                       | ^5.11.1     | Redis client (connection state) |
| lucide-react                  | ^1.27.0     | Icons                           |
| next                          | ^16.2.6     | React framework                 |
| openai                        | ^6.38.0     | OpenAI/OpenRouter client        |
| pdf-parse                     | ^2.4.5      | PDF text extraction             |
| pino                          | ^10.3.1     | Logging                         |
| qrcode                        | ^1.5.4      | QR code generation              |
| qrcode-terminal               | ^0.12.0     | QR code in terminal             |
| react                         | ^19.0.0     | UI library                      |
| react-dom                     | ^19.0.0     | React DOM                       |
| react-markdown                | ^10.1.0     | Markdown rendering              |
| remark-gfm                    | ^4.0.1      | GitHub Flavored Markdown        |
| tailwind-merge                | ^3.6.0      | Tailwind class merging          |
| tsx                           | ^4.19.2     | TypeScript execution            |
| uuid                          | ^14.0.1     | UUID generation                 |
| ws                            | ^8.21.1     | WebSocket (Supabase Realtime)   |
| zod                           | ^4.4.3      | Schema validation               |

### Dev Dependencies

| Package                     | Version  | Purpose                |
| --------------------------- | -------- | ---------------------- |
| @tailwindcss/postcss        | ^4.0.0   | Tailwind CSS PostCSS   |
| @testing-library/jest-dom   | ^6.9.1   | Testing utilities      |
| @testing-library/react      | ^16.3.2  | React testing          |
| @testing-library/user-event | ^14.6.1  | User event testing     |
| @types/node                 | ^22.10.0 | Node.js types          |
| @types/qrcode               | ^1.5.5   | QR code types          |
| @types/qrcode-terminal      | ^0.12.2  | QR terminal types      |
| @types/react                | ^19.0.0  | React types            |
| @types/react-dom            | ^19.0.0  | React DOM types        |
| @types/uuid                 | ^10.0.0  | UUID types             |
| @types/ws                   | ^8.18.1  | WebSocket types        |
| eslint                      | ^10.8.0  | Linting                |
| eslint-config-next          | ^16.2.12 | Next.js ESLint         |
| eslint-config-prettier      | ^10.1.8  | Prettier ESLint        |
| eslint-plugin-prettier      | ^5.5.6   | Prettier ESLint plugin |
| husky                       | ^9.1.7   | Git hooks              |
| jsdom                       | ^29.1.1  | DOM testing            |
| lint-staged                 | ^16.4.0  | Pre-commit linting     |
| prettier                    | ^3.9.6   | Code formatting        |
| rimraf                      | ^6.0.1   | Remove directories     |
| tailwindcss                 | ^4.0.0   | CSS framework          |
| typescript                  | ^5.7.0   | TypeScript compiler    |
| vitest                      | ^4.1.10  | Testing framework      |

## Key Files

| File                                                        | Purpose                      |
| ----------------------------------------------------------- | ---------------------------- |
| `AI-BOS-STATE.md`                                           | Project state tracking       |
| `CLAUDE.md`                                                 | Agent instructions           |
| `AGENTS.md`                                                 | Persistent rules             |
| `docs/superpowers/plans/2026-07-26-rag-knowledge.md`        | Phase 05 implementation plan |
| `docs/superpowers/specs/2026-07-26-rag-knowledge-design.md` | Phase 05 design spec         |
