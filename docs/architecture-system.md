# Arquitectura del Sistema - WhatsApp AI Agent

> **Documento Ejecutivo** | Versión 2.0 | Julio 2026

---

## Resumen Ejecutivo

El sistema **WhatsApp AI Agent** es una plataforma de automatización de comunicación que integra un agente de inteligencia artificial con WhatsApp Business a través de Baileys, con capacidades RAG (Retrieval-Augmented Generation) para consultar catálogos y documentación técnica.

---

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL (WhatsApp)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BAILEYS (WhatsApp Web)                               │
│                     Cliente WhatsApp Personal                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Conexión tipo WhatsApp Web (escaneo QR)                                 │
│  • Recepción/envío de mensajes                                             │
│  • Resolución LID→teléfono                                                 │
│  • Gestión de medios (imágenes, documentos, etc.)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HANDLER (Message Processing)                       │
│                    Procesamiento de Mensajes Entrantes                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Validación de mensajes (no grupos, no broadcast)                         │
│  • Búsqueda de conversación (getOrCreateConversation)                       │
│  • Historial reciente para contexto                                         │
│  • Retrieval RAG (contexto de Knowledge Base)                               │
│  • Llamada al LLM con contexto enriquecido                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OPENROUTER / LLM                                    │
│                      Inteligencia Artificial                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Procesamiento de lenguaje natural                                       │
│  • Generación de respuestas con contexto RAG                               │
│  • Tool calling (funciones especiales)                                     │
│  • Modelos: GPT-4o-mini, Claude, Gemini                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL + pgvector)                       │
│                    Almacenamiento de Datos + Embeddings                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Conversaciones y mensajes                                               │
│  • Knowledge Bases (bases de conocimiento)                                 │
│  • Documents (documentos subidos)                                          │
│  • Document Chunks (fragmentos con embeddings vectoriales)                 │
│  • Búsqueda por similitud coseno (match_document_chunks)                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Baileys (WhatsApp Web Client)

**Función:** Cliente WhatsApp tipo WhatsApp Web

| Característica   | Detalle                       |
| ---------------- | ----------------------------- |
| **Versión**      | @whiskeysockets/baileys 7.0+  |
| **Conexión**     | QR Code (escaneo desde móvil) |
| **Persistencia** | Archivos en `data/` y `auth/` |

**Responsabilidades:**

- Conexión a WhatsApp Web
- Recepción y envío de mensajes
- Resolución LID→teléfono (privacidad)
- Gestión de medios
- Reconexión automática

### 2. Handler (Message Processor)

**Función:** Procesamiento de mensajes entrantes

**Responsabilidades:**

- Validación de mensajes (filtrar grupos, broadcast, newsletters)
- Búsqueda/creación de conversaciones
- Almacenamiento de mensajes
- Retrieval de contexto RAG
- Llamada al LLM con contexto enriquecido
- Envío de respuestas

### 3. LLM Service (OpenRouter)

**Función:** Inteligencia artificial para generación de respuestas

| Característica       | Detalle                   |
| -------------------- | ------------------------- |
| **Proveedor**        | OpenRouter                |
| **Modelo Principal** | openai/gpt-4o-mini        |
| **API Key**          | Configurada en .env.local |

**Capacidades:**

- Comprensión de mensajes en múltiples idiomas
- Generación de respuestas contextuales con RAG
- Tool calling para ejecutar acciones
- Clasificación de intención del usuario

### 4. Knowledge Service (RAG)

**Función:** Retrieval-Augmented Generation para consultas a documentos

**Componentes:**

| Componente      | Función                              |
| --------------- | ------------------------------------ |
| `chunker.ts`    | División de texto en fragmentos      |
| `embeddings.ts` | Generación de embeddings vectoriales |
| `ingest.ts`     | Pipeline de ingestión de documentos  |
| `retrieval.ts`  | Búsqueda de contexto relevante       |

**Pipeline de Ingestión:**

```
PDF Upload → Extract Text → Chunk → Generate Embeddings → Store in pgvector
```

**Pipeline de Retrieval:**

```
User Query → Generate Embedding → Vector Similarity Search → Rank → Context
```

### 5. Supabase (PostgreSQL + pgvector)

**Función:** Almacenamiento persistente + embeddings vectoriales

| Característica    | Detalle                       |
| ----------------- | ----------------------------- |
| **Proveedor**     | Supabase                      |
| **Base de datos** | PostgreSQL 15+                |
| **Extensiones**   | pgvector (embeddings)         |
| **RLS**           | Row Level Security por tenant |

**Tablas Principales:**

```sql
-- Conversaciones
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  jid TEXT,
  mode TEXT CHECK(mode IN ('AI','HUMAN')),
  status TEXT CHECK(status IN ('active','closed','archived')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensajes
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL,
  role TEXT CHECK(role IN ('user','assistant','human')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge Bases
CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  chunk_size INT NOT NULL DEFAULT 500,
  chunk_overlap INT NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  knowledge_base_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'text')),
  source_url TEXT,
  storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,
  chunk_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document Chunks (con embeddings vectoriales)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,
  knowledge_base_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Función de búsqueda por similitud
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

---

## Flujo de Mensajes

### Mensaje Entrante (WhatsApp → Sistema)

```
1. Usuario envía mensaje por WhatsApp
           │
           ▼
2. Baileys recibe el mensaje
           │
           ▼
3. Handler procesa el mensaje:
   a. Valida (no grupos, no broadcast)
   b. Busca/crea conversación
   c. Almacena mensaje en BD
   d. Recupera contexto RAG (si hay Knowledge Base)
   e. Envía al LLM con contexto enriquecido
   f. Genera respuesta
   g. Ejecuta tools si es necesario
           │
           ▼
4. Handler envía respuesta por WhatsApp
           │
           ▼
5. Usuario recibe respuesta
```

### Ingesta de Documentos (PDF → Knowledge Base)

```
1. Usuario sube PDF via Dashboard
           │
           ▼
2. API recibe archivo
           │
           ▼
3. Ingest Service procesa:
   a. Extrae texto del PDF
   b. Divide en chunks
   c. Genera embeddings via OpenRouter
   d. Almacena chunks + embeddings en Supabase
           │
           ▼
4. Documento listo para consultas RAG
```

---

## Endpoints API

### Dashboard

| Servicio | URL Local             | URL Producción             |
| -------- | --------------------- | -------------------------- |
| App      | http://localhost:3000 | https://app.yourdomain.com |

### API Routes

| Ruta                                  | Método | Descripción                    |
| ------------------------------------- | ------ | ------------------------------ |
| `/api/knowledge-bases`                | GET    | Listar Knowledge Bases         |
| `/api/knowledge-bases`                | POST   | Crear Knowledge Base           |
| `/api/knowledge-bases/[id]`           | DELETE | Eliminar Knowledge Base        |
| `/api/knowledge-bases/[id]/documents` | GET    | Listar documentos              |
| `/api/knowledge-bases/[id]/documents` | POST   | Crear documento                |
| `/api/documents/[id]`                 | DELETE | Eliminar documento             |
| `/api/documents/[id]/upload`          | POST   | Subir archivo + iniciar ingest |

---

## Seguridad

### Autenticación

- **Dashboard:** Basic Auth (configurable en `.env.local`)
- **Supabase:** Service Role Key (server-side)
- **OpenRouter:** API Key (LLM calls)

### Variables Sensibles

| Variable                    | Ubicación  | Descripción                  |
| --------------------------- | ---------- | ---------------------------- |
| `OPENROUTER_API_KEY`        | .env.local | API Key de OpenRouter        |
| `NEXT_PUBLIC_SUPABASE_URL`  | .env.local | URL de Supabase              |
| `SUPABASE_SERVICE_ROLE_KEY` | .env.local | Service Role Key de Supabase |
| `DASHBOARD_USER`            | .env.local | Usuario del dashboard        |
| `DASHBOARD_PASSWORD`        | .env.local | Contraseña del dashboard     |

---

## Despliegue

### Entorno Local

```bash
# Instalar dependencias
npm install

# Ejecutar bot + dashboard
npm run start:all

# O por separado:
npm run start:bot    # Bot de WhatsApp
npm run dev          # Dashboard
```

### Producción (EasyPanel + Hostinger)

```bash
# Push a GitHub
git add .
git commit -m "cambios"
git push

# EasyPanel redespliega automáticamente
```

---

## Roadmap

### Fase 00-05: Core ✅

- [x] System Audit
- [x] Target Architecture
- [x] Contracts + Configuration
- [x] Engineering Foundation
- [x] Data + Multi-Tenancy (Supabase)
- [x] RAG + Knowledge

### Fase 06-10: Features

- [ ] Universal Agent + Memory
- [ ] Tools + Calendar
- [ ] Omnichannel
- [ ] N8N Orchestration
- [ ] CRM + Follow-Up

### Fase 11-14: Production

- [ ] Observability + Self-Validation
- [ ] Admin Control Plane
- [ ] Recovery + Controlled Autonomy
- [ ] Hardening + Production Readiness

---

## Contacto Soporte

- **Dashboard:** http://localhost:3000
- **Documentación:** Ver `docs/` directory
- **Soporte:** [Comunidad Biokool](https://biokool.mx/)

---

_Documento actualizado por AI-BOS - WhatsApp AI Agent_
