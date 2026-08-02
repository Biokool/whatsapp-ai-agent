# RAG + Knowledge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RAG system so the WhatsApp agent can consult Biokool's product catalogs and FAQs, with a Dashboard section for managing knowledge.

**Architecture:** Supabase pgvector for embeddings, pdf-parse for extraction, OpenAI text-embedding-3-small for embeddings. Dashboard UI with drag-and-drop upload.

**Tech Stack:** Supabase (pgvector), OpenAI embeddings, pdf-parse, Next.js 16, React 19, TanStack Query, Tailwind CSS

## Global Constraints

- Node.js 20.20.0
- Next.js 16.2.12 (Turbopack)
- Supabase project: mvbynpfvxcpvuoazkaxc.supabase.co
- OpenAI API key via OpenRouter
- Default tenant: 00000000-0000-0000-0000-000000000001
- Dashboard auth: admin / biokool2026

---

### Task 1: Enable pgvector + Create Tables

**Files:**

- Create: `src/infrastructure/database/migrations/005_rag_tables.sql`

**Interfaces:**

- Consumes: Supabase SQL Editor
- Produces: knowledge_bases, documents, document_chunks tables with RLS

- [ ] **Step 1: Create migration SQL**

```sql
-- 005_rag_tables.sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge Bases
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  chunk_size INT NOT NULL DEFAULT 500,
  chunk_overlap INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'text')),
  source_url TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document Chunks with embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_kb_tenant ON knowledge_bases(tenant_id);
CREATE INDEX idx_docs_kb ON documents(knowledge_base_id);
CREATE INDEX idx_docs_tenant ON documents(tenant_id);
CREATE INDEX idx_chunks_doc ON document_chunks(document_id);
CREATE INDEX idx_chunks_kb ON document_chunks(knowledge_base_id);
CREATE INDEX idx_chunks_tenant ON document_chunks(tenant_id);

-- Vector similarity index (IVFFlat)
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY kb_tenant_isolation ON knowledge_bases
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY docs_tenant_isolation ON documents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY chunks_tenant_isolation ON document_chunks
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kb_updated_at BEFORE UPDATE ON knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_docs_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Execute in Supabase SQL Editor**

Run the SQL in Supabase Dashboard → SQL Editor → New query → Run.

- [ ] **Step 3: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('knowledge_bases', 'documents', 'document_chunks');
```

Expected: 3 rows returned.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/database/migrations/005_rag_tables.sql
git commit -m "feat(rag): add pgvector tables for knowledge base"
```

---

### Task 2: RAG Types + DB Functions

**Files:**

- Create: `src/core/types/rag.ts`
- Modify: `src/lib/db.ts` (add RAG functions)

**Interfaces:**

- Consumes: Supabase client from `src/infrastructure/database/supabase.ts`
- Produces: `KnowledgeBase`, `Document`, `DocumentChunk` types; `createKnowledgeBase()`, `listKnowledgeBases()`, `createDocument()`, `updateDocumentStatus()`, `retrieveRelevantChunks()`

- [ ] **Step 1: Create RAG types**

```typescript
// src/core/types/rag.ts
export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  knowledge_base_id: string;
  tenant_id: string;
  title: string;
  source_type: "pdf" | "url" | "text";
  source_url: string | null;
  storage_path: string | null;
  status: "pending" | "processing" | "ready" | "error";
  error_message: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  knowledge_base_id: string;
  tenant_id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[] | null;
  created_at: string;
}

export interface KnowledgeBaseWithStats extends KnowledgeBase {
  document_count: number;
  total_chunks: number;
}
```

- [ ] **Step 2: Add RAG functions to db.ts**

```typescript
// Add to src/lib/db.ts

import type {
  KnowledgeBase,
  Document,
  DocumentChunk,
  KnowledgeBaseWithStats,
} from "@/core/types/rag";

// ============================================================
// Knowledge Bases
// ============================================================

export async function listKnowledgeBases(): Promise<KnowledgeBaseWithStats[]> {
  const supabase = getSupabase();
  const { data: kbs } = await supabase
    .from("knowledge_bases")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("created_at", { ascending: false });

  if (!kbs) return [];

  const result: KnowledgeBaseWithStats[] = [];
  for (const kb of kbs) {
    const { count: docCount } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_base_id", kb.id);

    const { count: chunkCount } = await supabase
      .from("document_chunks")
      .select("id", { count: "exact", head: true })
      .eq("knowledge_base_id", kb.id);

    result.push({
      ...(kb as KnowledgeBase),
      document_count: docCount ?? 0,
      total_chunks: chunkCount ?? 0,
    });
  }
  return result;
}

export async function createKnowledgeBase(
  name: string,
  description?: string
): Promise<KnowledgeBase> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("knowledge_bases")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      name,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create knowledge base: ${error.message}`);
  return data as KnowledgeBase;
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("knowledge_bases").delete().eq("id", id);
}

// ============================================================
// Documents
// ============================================================

export async function listDocuments(kbId: string): Promise<Document[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("knowledge_base_id", kbId)
    .order("created_at", { ascending: false });

  return (data as Document[]) ?? [];
}

export async function createDocument(
  kbId: string,
  title: string,
  sourceType: "pdf" | "url" | "text",
  storagePath?: string,
  sourceUrl?: string
): Promise<Document> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      knowledge_base_id: kbId,
      tenant_id: DEFAULT_TENANT_ID,
      title,
      source_type: sourceType,
      storage_path: storagePath ?? null,
      source_url: sourceUrl ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create document: ${error.message}`);
  return data as Document;
}

export async function updateDocumentStatus(
  docId: string,
  status: Document["status"],
  errorMessage?: string,
  chunkCount?: number
): Promise<void> {
  const supabase = getSupabase();
  const update: Record<string, unknown> = { status };
  if (errorMessage !== undefined) update.error_message = errorMessage;
  if (chunkCount !== undefined) update.chunk_count = chunkCount;
  await supabase.from("documents").update(update).eq("id", docId);
}

export async function deleteDocument(docId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("documents").delete().eq("id", docId);
}

// ============================================================
// RAG Retrieval
// ============================================================

export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  tenantId: string,
  limit = 5
): Promise<{ content: string; document_title: string; metadata: Record<string, unknown> }[]> {
  const supabase = getSupabase();

  // Use pgvector cosine similarity search
  const { data, error } = await supabase.rpc("match_document_chunks", {
    p_tenant_id: tenantId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_count: limit,
  });

  if (error) {
    logger.warn({ error: error.message }, "[rag] chunk retrieval failed");
    return [];
  }

  return (data as any[]) ?? [];
}
```

- [ ] **Step 3: Create match_document_chunks function in Supabase**

```sql
CREATE OR REPLACE FUNCTION match_document_chunks(
  p_tenant_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  document_title TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    d.title AS document_title,
    dc.metadata,
    1 - (dc.embedding <=> p_query_embedding) AS similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.tenant_id = p_tenant_id
    AND d.status = 'ready'
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/core/types/rag.ts src/lib/db.ts
git commit -m "feat(rag): add types and DB functions for knowledge base"
```

---

### Task 3: Ingest Service (PDF → Chunks → Embeddings)

**Files:**

- Create: `src/lib/rag/ingest.ts`
- Create: `src/lib/rag/chunker.ts`
- Create: `src/lib/rag/embeddings.ts`

**Interfaces:**

- Consumes: `createDocument()`, `updateDocumentStatus()` from db.ts, OpenAI API
- Produces: `ingestDocument(docId, filePath)`, `chunkText(text, chunkSize, overlap)`, `generateEmbeddings(texts)`

- [ ] **Step 1: Create chunker**

```typescript
// src/lib/rag/chunker.ts
export interface Chunk {
  content: string;
  metadata: { index: number; start: number; end: number };
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        metadata: { index, start, end },
      });
      index++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}
```

- [ ] **Step 2: Create embeddings service**

```typescript
// src/lib/rag/embeddings.ts
import pino from "pino";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: texts,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}
```

- [ ] **Step 3: Create ingest service**

```typescript
// src/lib/rag/ingest.ts
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";
import { updateDocumentStatus } from "../db";
import { chunkText } from "./chunker";
import { generateEmbeddings } from "./embeddings";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

export async function ingestDocument(
  docId: string,
  filePath: string,
  tenantId: string,
  knowledgeBaseId: string,
  chunkSize = 500,
  chunkOverlap = 50
): Promise<void> {
  try {
    await updateDocumentStatus(docId, "processing");
    logger.info(`[rag] ingesting document ${docId}`);

    // 1. Extract text from PDF
    let text: string;
    if (filePath.endsWith(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = fs.readFileSync(filePath);
      const pdf = await pdfParse(buffer);
      text = pdf.text;
    } else {
      text = fs.readFileSync(filePath, "utf-8");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("No text content extracted from document");
    }

    logger.info(`[rag] extracted ${text.length} chars from document`);

    // 2. Chunk text
    const chunks = chunkText(text, chunkSize, chunkOverlap);
    logger.info(`[rag] created ${chunks.length} chunks`);

    // 3. Generate embeddings in batches of 20
    const batchSize = 20;
    const supabase = getSupabase();

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await generateEmbeddings(batch.map((c) => c.content));

      const rows = batch.map((chunk, idx) => ({
        document_id: docId,
        knowledge_base_id: knowledgeBaseId,
        tenant_id: tenantId,
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: JSON.stringify(embeddings[idx]),
      }));

      const { error } = await supabase.from("document_chunks").insert(rows);
      if (error) throw new Error(`Failed to insert chunks: ${error.message}`);

      logger.info(
        `[rag] inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`
      );
    }

    // 4. Update document status
    await updateDocumentStatus(docId, "ready", undefined, chunks.length);
    logger.info(`[rag] document ${docId} ready (${chunks.length} chunks)`);
  } catch (err: any) {
    logger.error({ err: err.message }, `[rag] ingest failed for ${docId}`);
    await updateDocumentStatus(docId, "error", err.message);
  }
}
```

- [ ] **Step 4: Install pdf-parse**

Run: `npm install pdf-parse`
Expected: Package installed

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/rag/ package.json package-lock.json
git commit -m "feat(rag): add ingest pipeline (pdf → chunks → embeddings)"
```

---

### Task 4: Retrieval Service

**Files:**

- Create: `src/lib/rag/retrieval.ts`

**Interfaces:**

- Consumes: `generateEmbeddings()` from embeddings.ts, `retrieveRelevantChunks()` from db.ts
- Produces: `retrieveContext(conversationId, query): Promise<string>`

- [ ] **Step 1: Create retrieval service**

```typescript
// src/lib/rag/retrieval.ts
import pino from "pino";
import { retrieveRelevantChunks } from "../db";
import { generateEmbeddings } from "./embeddings";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

export async function retrieveContext(
  tenantId: string,
  query: string,
  maxChunks = 5
): Promise<string> {
  try {
    // 1. Embed the query
    const [queryEmbedding] = await generateEmbeddings([query]);

    // 2. Search for relevant chunks
    const chunks = await retrieveRelevantChunks(queryEmbedding, tenantId, maxChunks);

    if (chunks.length === 0) {
      logger.info("[rag] no relevant chunks found");
      return "";
    }

    // 3. Format context
    const context = chunks.map((c) => `[${c.document_title}]\n${c.content}`).join("\n\n---\n\n");

    logger.info(
      `[rag] retrieved ${chunks.length} chunks (top similarity: ${chunks[0] ? "yes" : "no"})`
    );
    return context;
  } catch (err: any) {
    logger.warn({ err: err.message }, "[rag] retrieval failed, continuing without context");
    return "";
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/rag/retrieval.ts
git commit -m "feat(rag): add retrieval service for context injection"
```

---

### Task 5: Integrate RAG into Handler

**Files:**

- Modify: `src/lib/baileys/handler.ts` (add RAG context retrieval)
- Modify: `src/lib/openrouter.ts` (accept ragContext parameter)

**Interfaces:**

- Consumes: `retrieveContext()` from retrieval.ts
- Produces: LLM responses enriched with RAG context

- [ ] **Step 1: Modify generateReply to accept ragContext**

```typescript
// In src/lib/openrouter.ts, modify generateReply signature:
interface GenerateReplyOptions {
  history: Message[];
  conversationId: string;
  ragContext?: string;
}

export async function generateReply(options: GenerateReplyOptions): Promise<string> {
  const { history, conversationId, ragContext } = options;

  // Build system prompt with RAG context
  let systemPrompt = SYSTEM_PROMPT;

  if (ragContext && ragContext.trim().length > 0) {
    systemPrompt += `\n\nCONEXTO DEL CATÁLOGO Y DOCUMENTACIÓN:\n${ragContext}\n\nUsa esta información para responder preguntas sobre productos, servicios, precios y especificaciones técnicas.`;
  }

  // ... rest of the existing implementation
}
```

- [ ] **Step 2: Add RAG retrieval to handler**

```typescript
// In src/lib/baileys/handler.ts, before generateReply call:
import { retrieveContext } from "../rag/retrieval";
import { DEFAULT_TENANT_ID } from "@/core/types/database";

// Inside the message processing loop, before generateReply:
const ragContext = await retrieveContext(DEFAULT_TENANT_ID, text);

const reply = await generateReply({
  history,
  conversationId: convo.id,
  ragContext,
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/baileys/handler.ts src/lib/openrouter.ts
git commit -m "feat(rag): integrate RAG context into WhatsApp handler"
```

---

### Task 6: API Routes for Knowledge Management

**Files:**

- Create: `src/app/api/knowledge-bases/route.ts`
- Create: `src/app/api/knowledge-bases/[id]/route.ts`
- Create: `src/app/api/knowledge-bases/[id]/documents/route.ts`
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/documents/[id]/upload/route.ts`

**Interfaces:**

- Consumes: DB functions from db.ts, ingest service
- Produces: REST API endpoints for Dashboard

- [ ] **Step 1: Create knowledge-bases list/create route**

```typescript
// src/app/api/knowledge-bases/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listKnowledgeBases, createKnowledgeBase } from "@/lib/db";

export async function GET() {
  try {
    const kbs = await listKnowledgeBases();
    return NextResponse.json(kbs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const kb = await createKnowledgeBase(name, description);
    return NextResponse.json(kb, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create knowledge base delete route**

```typescript
// src/app/api/knowledge-bases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteKnowledgeBase } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteKnowledgeBase(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create documents list/upload route**

```typescript
// src/app/api/knowledge-bases/[id]/documents/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listDocuments, createDocument } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docs = await listDocuments(id);
    return NextResponse.json(docs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, source_type, source_url } = await req.json();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const doc = await createDocument(id, title, source_type || "pdf", undefined, source_url);
    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create document delete route**

```typescript
// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteDocument } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteDocument(id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create upload route with ingest trigger**

```typescript
// src/app/api/documents/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/infrastructure/database/supabase";
import { updateDocumentStatus } from "@/lib/db";
import { ingestDocument } from "@/lib/rag/ingest";
import fs from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    // Validate file type
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "txt" && ext !== "md") {
      return NextResponse.json({ error: "Only PDF, TXT, MD files accepted" }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    // Get document info
    const supabase = getSupabase();
    const { data: doc } = await supabase
      .from("documents")
      .select("*, knowledge_bases!inner(tenant_id, chunk_size, chunk_overlap)")
      .eq("id", id)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Save file to disk
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, `${id}.${ext}`);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // Update storage path
    await supabase.from("documents").update({ storage_path: filePath }).eq("id", id);

    // Trigger ingest in background
    const kb = doc.knowledge_bases as any;
    ingestDocument(
      id,
      filePath,
      kb.tenant_id,
      doc.knowledge_base_id,
      kb.chunk_size,
      kb.chunk_overlap
    );

    return NextResponse.json({ ok: true, message: "Upload received, processing started" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Add to PUBLIC_ROUTES in middleware.ts**

```typescript
// Add to PUBLIC_ROUTES array in src/middleware.ts:
"/api/knowledge-bases",
"/api/documents",
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/app/api/knowledge-bases/ src/app/api/documents/ src/middleware.ts
git commit -m "feat(rag): add API routes for knowledge management"
```

---

### Task 7: Dashboard UI — Knowledge Section

**Files:**

- Create: `src/components/KnowledgeSection.tsx`
- Create: `src/components/KnowledgeBaseCard.tsx`
- Create: `src/components/DocumentList.tsx`
- Create: `src/components/UploadZone.tsx`
- Create: `src/hooks/use-knowledge-bases.ts`
- Create: `src/hooks/use-documents.ts`
- Modify: `src/components/Dashboard.tsx` (add knowledge tab)

**Interfaces:**

- Consumes: API routes from Task 6
- Produces: Full Dashboard UI for knowledge management

- [ ] **Step 1: Create TanStack Query hooks**

```typescript
// src/hooks/use-knowledge-bases.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const res = await fetch("/api/knowledge-bases");
      if (!res.ok) throw new Error("Failed to fetch knowledge bases");
      return res.json();
    },
  });
}

export function useCreateKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const res = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) throw new Error("Failed to create knowledge base");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/knowledge-bases/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete knowledge base");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

// src/hooks/use-documents.ts
export function useDocuments(kbId: string | null) {
  return useQuery({
    queryKey: ["documents", kbId],
    queryFn: async () => {
      if (!kbId) return [];
      const res = await fetch(`/api/knowledge-bases/${kbId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!kbId,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ kbId, file }: { kbId: string; file: File }) => {
      // First create document record
      const createRes = await fetch(`/api/knowledge-bases/${kbId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: file.name, source_type: "pdf" }),
      });
      if (!createRes.ok) throw new Error("Failed to create document");
      const doc = await createRes.json();

      // Then upload file
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`/api/documents/${doc.id}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      return doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });
}
```

- [ ] **Step 2: Create UploadZone component**

```tsx
// src/components/UploadZone.tsx
"use client";

import { useRef, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export default function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
        isDragging
          ? "border-ai-green-light bg-ai-green/10"
          : "border-navy-500 hover:border-navy-400 hover:bg-navy-700/50"
      } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md"
        onChange={handleChange}
        className="hidden"
      />
      <span className="material-symbols-outlined text-3xl text-navy-400 mb-2">
        {isUploading ? "hourglass_top" : "upload_file"}
      </span>
      <p className="text-sm text-navy-300">
        {isUploading ? "Procesando archivo..." : "Arrastra un archivo o haz clic para subir"}
      </p>
      <p className="text-xs text-navy-400 mt-1">PDF, TXT, MD — Max 10MB</p>
    </div>
  );
}
```

- [ ] **Step 3: Create DocumentList component**

```tsx
// src/components/DocumentList.tsx
"use client";

import type { Document } from "@/core/types/rag";

interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  const styles = {
    ready: "bg-ai-green/20 text-ai-green-light",
    processing: "bg-amber-warm/20 text-amber-warm",
    pending: "bg-navy-600 text-navy-300",
    error: "bg-red-dark/20 text-red-alert",
  };
  const labels = {
    ready: "Listo",
    processing: "Procesando...",
    pending: "Pendiente",
    error: "Error",
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function DocumentList({ documents, onDelete }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-navy-400 text-center py-4">
        No hay documentos. Sube un PDF para empezar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between p-2 bg-navy-700 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-navy-400 text-[18px]">description</span>
            <span className="text-sm text-navy-200 truncate">{doc.title}</span>
            <StatusBadge status={doc.status} />
            {doc.status === "ready" && (
              <span className="text-[10px] text-navy-400">{doc.chunk_count} chunks</span>
            )}
          </div>
          <button
            onClick={() => onDelete(doc.id)}
            className="text-navy-400 hover:text-red-alert p-1"
          >
            <span className="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create KnowledgeBaseCard component**

```tsx
// src/components/KnowledgeBaseCard.tsx
"use client";

import { useState } from "react";
import type { KnowledgeBaseWithStats } from "@/core/types/rag";
import { useDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/use-documents";
import DocumentList from "./DocumentList";
import UploadZone from "./UploadZone";

interface KnowledgeBaseCardProps {
  kb: KnowledgeBaseWithStats;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (id: string) => void;
}

export default function KnowledgeBaseCard({
  kb,
  isSelected,
  onSelect,
  onDelete,
}: KnowledgeBaseCardProps) {
  const { data: documents = [] } = useDocuments(isSelected ? kb.id : null);
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();

  function handleUpload(file: File) {
    uploadMutation.mutate({ kbId: kb.id, file });
  }

  function handleDeleteDoc(docId: string) {
    if (confirm("Eliminar este documento?")) {
      deleteMutation.mutate(docId);
    }
  }

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? "border-ai-green-light bg-navy-700"
          : "border-navy-500 bg-navy-800 hover:border-navy-400"
      }`}
    >
      <div onClick={onSelect} className="p-4 cursor-pointer flex justify-between items-start">
        <div>
          <h3 className="font-bold text-navy-200">{kb.name}</h3>
          {kb.description && <p className="text-xs text-navy-400 mt-1">{kb.description}</p>}
          <div className="flex gap-3 mt-2 text-[11px] text-navy-300">
            <span>{kb.document_count} docs</span>
            <span>{kb.total_chunks} chunks</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(kb.id);
          }}
          className="text-navy-400 hover:text-red-alert p-1"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {isSelected && (
        <div className="px-4 pb-4 space-y-3 border-t border-navy-600 pt-3">
          <DocumentList documents={documents} onDelete={handleDeleteDoc} />
          <UploadZone onUpload={handleUpload} isUploading={uploadMutation.isPending} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create KnowledgeSection (main container)**

```tsx
// src/components/KnowledgeSection.tsx
"use client";

import { useState } from "react";
import {
  useKnowledgeBases,
  useCreateKnowledgeBase,
  useDeleteKnowledgeBase,
} from "@/hooks/use-knowledge-bases";
import KnowledgeBaseCard from "./KnowledgeBaseCard";

export default function KnowledgeSection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases();
  const createMutation = useCreateKnowledgeBase();
  const deleteMutation = useDeleteKnowledgeBase();

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate(
      { name: newName.trim(), description: newDesc.trim() || undefined },
      {
        onSuccess: () => {
          setNewName("");
          setNewDesc("");
          setShowCreate(false);
        },
      }
    );
  }

  function handleDelete(id: string) {
    if (confirm("Eliminar esta Knowledge Base y todos sus documentos?")) {
      deleteMutation.mutate(id);
      if (selectedId === id) setSelectedId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-geist text-lg font-bold text-navy-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-ai-green-light">school</span>
          Knowledge Base
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
        >
          + Nuevo
        </button>
      </div>

      {showCreate && (
        <div className="bg-navy-700 rounded-xl p-4 space-y-3 border border-navy-500">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre (ej: Catálogo Biokool)"
            className="w-full bg-navy-900 border border-navy-500 rounded-lg px-3 py-2 text-sm text-navy-200 placeholder-navy-400 focus:outline-none focus:border-ai-green-light"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full bg-navy-900 border border-navy-500 rounded-lg px-3 py-2 text-sm text-navy-200 placeholder-navy-400 focus:outline-none focus:border-ai-green-light"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-ai-green hover:bg-ai-green-light text-ai-green-dark text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {createMutation.isPending ? "Creando..." : "Crear"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="text-navy-400 hover:text-navy-200 text-xs px-3 py-1.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-navy-400 text-sm">Cargando...</div>
      ) : knowledgeBases.length === 0 ? (
        <div className="text-center py-12 text-navy-400">
          <span className="material-symbols-outlined text-4xl mb-2 text-navy-500">school</span>
          <p className="text-sm">No hay Knowledge Bases creadas.</p>
          <p className="text-xs text-navy-500 mt-1">
            Crea una para subir catálogos, FAQs y documentación técnica.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {knowledgeBases.map((kb) => (
            <KnowledgeBaseCard
              key={kb.id}
              kb={kb}
              isSelected={selectedId === kb.id}
              onSelect={() => setSelectedId(selectedId === kb.id ? null : kb.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Add Knowledge tab to Dashboard**

```tsx
// In src/components/Dashboard.tsx, add import:
import KnowledgeSection from "./KnowledgeSection";

// In the tabs/sidebar, add a knowledge tab icon:
// Add to the sidebar buttons:
<button
  onClick={() => setActiveTab("knowledge")}
  className={`... ${activeTab === "knowledge" ? "text-ai-green-light" : "text-navy-400"}`}
>
  <span className="material-symbols-outlined">school</span>
  <span className="text-[9px] font-medium">Knowledge</span>
</button>;

// In the main content area, add the knowledge section:
{
  activeTab === "knowledge" && <KnowledgeSection />;
}
```

- [ ] **Step 7: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/components/KnowledgeSection.tsx src/components/KnowledgeBaseCard.tsx \
  src/components/DocumentList.tsx src/components/UploadZone.tsx \
  src/hooks/use-knowledge-bases.ts src/hooks/use-documents.ts \
  src/components/Dashboard.tsx
git commit -m "feat(rag): add Dashboard UI for knowledge management"
```

---

### Task 8: End-to-End Test

**Files:**

- Test: Manual testing via Dashboard + WhatsApp

- [ ] **Step 1: Restart bot + dev server**

```bash
# Kill existing processes
# Start bot: npx tsx scripts/start-bot.ts
# Start dev: npm run dev
```

- [ ] **Step 2: Test Dashboard Knowledge Section**

1. Open http://localhost:3000
2. Navigate to Knowledge tab
3. Create a Knowledge Base named "Catálogo Biokool"
4. Upload a test PDF
5. Verify status changes to "Listo" with chunk count

- [ ] **Step 3: Test RAG retrieval via WhatsApp**

1. Send a question about a product from the uploaded PDF
2. Verify the agent uses the catalog information in its response
3. Verify the bot log shows "[rag] retrieved X chunks"

- [ ] **Step 4: Test error handling**

1. Upload an invalid file type → verify error message
2. Upload a very large file → verify size limit
3. Delete a document → verify it's removed

- [ ] **Step 5: Update AI-BOS-STATE.md**

Mark Phase 05 as completed.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(rag): Phase 05 complete — RAG + Knowledge system"
```
