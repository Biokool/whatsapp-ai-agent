# Changelog

## [2026-08-01] — Fix refresco de estado en dashboard (UI congelada en "Procesando...")

- **What changed:** El dashboard se quedaba en "Procesando..." indefinidamente aunque el documento ya estuviera `ready` en Supabase
- **Why:** `refetchOnWindowFocus: false` + `refetchInterval` condicionado a `visibilityState === "hidden"` detenían el polling al perder el foco de la pestaña, y nunca se reanudaba
- **Who:** Sesión de soporte operativo
- **Origin:** Reporte de usuario (FICHA TECNICA KOOLKAT.pdf)
- **Impact:** El estado "Listo" ahora se refleja sin recargar, incluso si la pestaña pierde foco durante el procesamiento
- **Risk:** low
- **Compatibility:** Backward compatible
- **Affected dependencies:** None (solo opciones de TanStack Query)
- **Rollback:** Restaurar `refetchOnWindowFocus: false` y el check de visibilityState
- **Tests:** E2E — subida vía ruta real del frontend, polling captura `pending → processing → ready` (~3s)

### Modified Files

- `src/components/providers.tsx` — `refetchOnWindowFocus: true`
- `src/hooks/use-documents.ts` — `refetchIntervalInBackground: true`, sin check de `visibilityState`
- `errores-sesion.md` — nuevo post-mortem #18

## [2026-08-01] — Fix MIME en subida de documentos a Google Drive (n8n)

- **What changed:** Corregida la subida de archivos a Google Drive vía el workflow n8n `Document Upload Handler` (`yE4ZFxz6dGBuKEtS`), que subía los ficheros como `text/plain` vacíos (`size: 0`)
- **Why:** El nodo GDrive usaba parámetros de V2 con `typeVersion` 2 (runtime V1), y n8n ejecutaba el webhook desde la snapshot de `workflow_history` (no `workflow_entity.nodes`)
- **Who:** Sesión de soporte operativo
- **Origin:** Bug detectado en producción (archivos en GDrive vacíos)
- **Impact:** Los PDFs ahora llegan a GDrive con `mimeType: application/pdf` y el tamaño real; el pipeline completo (upload → GDrive → document_versions → RAG ready) verificado E2E
- **Risk:** low
- **Compatibility:** Se mantuvo typeVersion 2 (runtime V1) en workflows externos; el workflow de documentos usa typeVersion 3
- **Affected dependencies:** n8n dist (`GoogleDriveV1.node.js` línea 2233 parcheado), `workflow_history` snapshot
- **Rollback:** Cambiar typeVersion a 2 en `workflow_entity.nodes` y `workflow_history` (reintroduce el bug)
- **Tests:** E2E — `fileId` en GDrive con `mimeType: application/pdf` + `size: 381`; `document_versions` en Supabase con size real; RAG `status=ready` con chunk recuperable por `match_document_chunks`

### Modified Files

- `docs/n8n/README.md` — workflow real (`yE4ZFxz6dGBuKEtS`), nota de snapshot, bug MIME, doble base de datos (NeonTech vs Supabase)
- `docs/n8n/utils-patched.js` / `utils-current.js` — referencia del bug vs fix en `getItemBinaryData`
- `errores-sesion.md` — nuevo post-mortem #17

## [2026-07-26 19:00] — Phase 05: RAG + Knowledge

- **What changed:** Implemented RAG system with Knowledge Base management
- **Why:** Allow agent to consult product catalogs, FAQs, and technical documentation
- **Who:** AI-BOS execution
- **Origin:** Phase 05 plan
- **Impact:** Agent can now answer questions using uploaded documents
- **Risk:** medium (embedding API costs, PDF quality)
- **Compatibility:** Backward compatible
- **Affected dependencies:** Added pdf-parse, Supabase pgvector
- **Rollback:** Remove RAG tables, revert handler changes

### New Files

- `src/infrastructure/database/migrations/005_rag_tables.sql` - pgvector tables
- `src/core/types/rag.ts` - TypeScript types
- `src/lib/rag/chunker.ts` - Text chunking
- `src/lib/rag/embeddings.ts` - Embedding generation
- `src/lib/rag/ingest.ts` - Document ingestion pipeline
- `src/lib/rag/retrieval.ts` - Context retrieval
- `src/app/api/knowledge-bases/` - CRUD routes
- `src/app/api/documents/[id]/upload/` - File upload
- `src/hooks/use-knowledge-bases.ts` - TanStack Query hooks
- `src/hooks/use-documents.ts` - TanStack Query hooks
- `src/components/KnowledgeSection.tsx` - Main Knowledge tab
- `src/components/KnowledgeBaseCard.tsx` - KB card component
- `src/components/DocumentList.tsx` - Document list
- `src/components/UploadZone.tsx` - Drag-and-drop upload

### Modified Files

- `src/lib/db.ts` - Added RAG DB functions
- `src/lib/openrouter.ts` - Accepts ragContext parameter
- `src/lib/baileys/handler.ts` - Retrieves RAG context before LLM
- `src/components/Dashboard.tsx` - Added Knowledge tab
- `src/components/Sidebar.tsx` - Added Knowledge tab icon
- `src/middleware.ts` - Added public API routes

## [2026-07-20 18:52] — Initial PKM setup

- **What changed:** Initialized Project Knowledge Manager
- **Why:** Set up documentation structure
- **Who:** PKM Init Script
- **Origin:** Script
- **Impact:** Project documentation structure
- **Risk:** low
- **Compatibility:** N/A
- **Affected dependencies:** None
- **Rollback:** Remove docs/ directory
- **Tests:** N/A
