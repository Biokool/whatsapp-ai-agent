# n8n Integration Guide

## Overview

This module integrates with n8n to provide:

- **Cloud storage** for documents via Google Drive
- **Version control** for uploaded files in PostgreSQL (NeonTech `neondb`)
- **Multi-tenant support** with per-tenant credentials
- **Configurable Google Drive folder** from frontend

## Architecture

```
App (upload) → n8n Webhook (upload-document) → Google Drive → PostgreSQL (document_versions) → Response
```

No hay nodo `Code` intermedio entre el webhook y Google Drive: el binario va directo del body multipart al nodo GDrive para no perder el `binaryData` (mimeType/bytes) durante el procesamiento.

## Setup

### 1. n8n Workflow

- **Webhook URL:** `http://localhost:5678/webhook/upload-document`
- **Workflow ID:** `yE4ZFxz6dGBuKEtS` (producción, activo)
- **Status:** Active
- **Sticky Notes:** 4 notas coloreadas documentando cada sección

> **Importante (snapshot de ejecución):** n8n ejecuta los webhooks activos desde la snapshot de `workflow_history` (versión publicada), NO desde `workflow_entity.nodes`. Para cambiar un parámetro de nodo (ej. `typeVersion`) hay que actualizar AMBAS filas, o la edición en la UI "no hace efecto" en ejecuciones del webhook.

### 2. Credentials in n8n

| Credential                | Type                 | ID                 | Status     |
| ------------------------- | -------------------- | ------------------ | ---------- |
| Google Drive account      | googleDriveOAuth2Api | `neBYtaMCymhmxubt` | Authorized |
| Postgres-NeonTech-Biokool | postgres             | `ByU42CyK5np0lT7P` | Connected  |

> **Postgres ≠ Supabase:** la credencial `Postgres-NeonTech-Biokool` apunta a NeonTech (`ep-icy-boat-advnxc2q-pooler.c-2.us-east-1.aws.neon.tech` / `neondb`), donde el workflow guarda `document_versions` (57 filas: inventory, days_off, document_versions). La app Next.js, en cambio, persiste sus tablas en **Supabase** (`documents`, `knowledge_bases`, `document_chunks`, `document_versions`). Son dos bases separadas: n8n registra la versión en NeonTech, y la app registra la suya en Supabase.

### 3. Configure in Dashboard

1. Go to **Knowledge** tab → **n8n** button
2. Enter webhook URL: `http://localhost:5678/webhook/upload-document`
3. Enter Google Drive folder (optional): `Biokool/Documentos`
4. Click **Guardar**

## Workflow Nodes

### Node 1: Recibir Archivo (Webhook)

- **Type:** Webhook v2
- **Path:** `upload-document`
- **Purpose:** Recibe archivos via POST multipart/form-data
- **Headers requeridos:**
  - `x-tenant-id`: UUID del tenant
  - `x-document-id`: UUID del documento
  - `x-knowledge-base-id`: UUID de la base de conocimiento
  - `x-gdrive-folder`: Carpeta personalizada en Google Drive (opcional)
- **Response mode:** lastNode
- **Options:** `binaryData: true` (esencial para que el archivo llegue como binario y no como string)

### Node 2: Subir a Google Drive

- **Type:** Google Drive **typeVersion 3** (implementación V2 del nodo)
- **Operation:** Upload
- **Parámetros:**
  - `name`: `={{ $binary.file.fileName || 'document.pdf' }}`
  - `inputDataFieldName`: `file`
- **Output:** id (fileId), name, mimeType, size
- **Destino:** carpeta raíz `My Drive` cuando no se especifica `x-gdrive-folder`

### Node 3a: Crear Tabla Si No Existe

- **Type:** PostgreSQL v2.5 (credencial `Postgres-NeonTech-Biokool`)
- **Purpose:** Crea tabla `document_versions` si no existe
- **SQL:** CREATE TABLE IF NOT EXISTS (ver sección Database Tables)
- **Ejecuta:** Una sola vez, crea la estructura necesaria

### Node 3b: Guardar Version

- **Type:** PostgreSQL v2.5 (credencial `Postgres-NeonTech-Biokool`)
- **Purpose:** Inserta registro de versión en `document_versions`
- **Calcula:** `version_number` incremental por documento
- **Campos:** document_id, tenant_id, file_url, file_size, storage_provider, storage_path, metadata
- **file_url:** `https://drive.google.com/file/d/{gdriveId}/view`

### Node 4: Responder al Cliente

- **Type:** Code v2
- **Purpose:** Construye respuesta JSON final
- **Output:**

```json
{
  "success": true,
  "documentId": "uuid",
  "tenantId": "uuid",
  "filename": "ficha-tecnica.pdf",
  "fileUrl": "https://drive.google.com/file/d/1MxSzjmYcNzKcXUfQ6qANwEK_JCd0LZxA/view",
  "storageProvider": "gdrive",
  "version": 1,
  "versionId": "uuid",
  "gdriveFileId": "1MxSzjmYcNzKcXUfQ6qANwEK_JCd0LZxA",
  "gdriveFolder": "Biokool",
  "timestamp": "2026-08-01T20:22:00.000Z",
  "message": "Archivo subido a Google Drive y version registrada"
}
```

> El `fileSize`/`contentType` NO salen del workflow n8n actual; los persiste la app en Supabase (`document_versions`) a partir del archivo real en `src/app/api/documents/[id]/upload/route.ts`.

## Google Drive Folder Configuration

### From Dashboard

1. Go to **Knowledge** tab → **n8n** button
2. Enter **Carpeta Google Drive** field
3. Format: `Biokool/Documentos` (no leading/trailing slash)
4. Files will be saved to: `{folder}/{tenantId}/{documentId}/{timestamp}_{filename}`

### Without Folder

If no folder is specified, files are saved to:
`{tenantId}/{documentId}/{timestamp}_{filename}`

## Database Tables

### document_versions

```sql
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  version_number INT NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL,
  file_size INT,
  file_hash TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'gdrive',
  storage_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## API Endpoints

### `GET /api/n8n`

Get n8n configuration for current tenant.

### `POST /api/n8n`

Save n8n configuration.

```json
{
  "webhookUrl": "http://localhost:5678/webhook/upload-document",
  "webhookSecret": "optional-secret",
  "config": {
    "gdrive_folder": "Biokool/Documentos"
  }
}
```

### `DELETE /api/n8n`

Remove n8n configuration.

### `GET /api/documents/[id]/versions`

Get version history for a document.

## Environment Variables

```bash
# Optional: Secret for webhook authentication
DOCUMENT_UPLOAD_SECRET=your-secret-here
```

## Troubleshooting

### Upload fails with 500 error

- Check n8n workflow is active
- Check Google Drive OAuth2 is authorized
- Check PostgreSQL connection works
- Check n8n execution logs at http://localhost:5678/executions

### "relation document_versions does not exist"

- Node 4a creates the table automatically on first run
- Or run the migration: `src/infrastructure/database/migrations/006_n8n_integration.sql`

### "invalid input syntax for type uuid"

- Document IDs must be valid UUIDs
- Use format: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Google Drive upload fails

- Re-authorize OAuth2 at n8n → Settings → Credentials → Google Drive account
- Check Google Cloud Console: Drive API must be enabled

### Folder not created in Google Drive

- Ensure x-gdrive-folder header is sent
- Check n8n workflow is using the latest version
- Verify the header value is not empty

### Archivos subidos a GDrive como `text/plain` con `size: 0` (bug MIME)

**Síntoma:** el archivo llega a Google Drive vacío (`size: "0"`, `mimeType: "text/plain"`) aunque el upload se complete sin error y devuelva un `fileId`.

**Causa raíz (triple):**

1. **typeVersion del nodo GDrive.** El nodo usaba parámetros de V2 (`inputDataFieldName`) pero `typeVersion` 2, que ejecutaba el código **V1** (`GoogleDriveV1.node.js`) e ignoraba esos parámetros → caía en la rama `binaryData=false` de "text file" → subía un texto vacío con `text/plain`.
2. **Snapshot en `workflow_history`.** n8n ejecuta los webhooks activos desde la snapshot publicada (`workflow_history.versionId`), no desde `workflow_entity.nodes`. Cambiar `typeVersion` a 3 solo funcionó tras actualizar TAMBIÉN la fila de `workflow_history`.
3. **Bug real de n8n en V1** (`GoogleDriveV1.node.js` línea 2233): `if (metadata.mimeType) mimeType = binaryData.mimeType;` (asignaba el mime del fallback en vez de `metadata.mimeType`). Corregido a `mimeType = metadata.mimeType;`.

**Corrección aplicada:** `typeVersion` 2 → **3** en `workflow_entity.nodes` y en la snapshot de `workflow_history` (versionId `afc396e7-12d4-4af0-82f4-6d887e5261c0`). El nodo ejecuta ahora `GoogleDriveV2.node.js` → `upload.operation.js` → `utils.getItemBinaryData`, que usa `binaryData.id` (streaming) y respeta `metadata.mimeType`. También se parcheó el bug de la línea 2233 de V1 en el dist del contenedor.

**Verificación:** el `fileId` resultante debe reportar `mimeType: "application/pdf"` y `size` = bytes reales (ej. `381`). Archivos de referencia: `utils-current.js` (bug) vs `utils-patched.js` (fix) en esta carpeta.

**Advertencia:** el contenedor n8n usa **pnpm + files root-owned**; los parches a `node_modules` deben aplicarse vía `docker exec -u root n8n node <script>`, y se pierden si se recrea el contenedor (hay que re-aplicar o subir la versión de n8n con el fix upstream).
