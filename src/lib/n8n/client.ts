import pino from "pino";

const logger = pino({ level: "info" });

export interface N8nConfig {
  webhookUrl: string;
  webhookSecret?: string;
  isActive: boolean;
  config: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  documentId: string;
  fileUrl: string;
  storageProvider: string;
  version: number;
  message: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  tenant_id: string;
  version_number: number;
  file_url: string;
  file_size: number | null;
  file_hash: string | null;
  storage_provider: string;
  storage_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Registra una versión de documento en Supabase (document_versions).
 * Crea la fila si no existe la tabla (idempotente con supabase).
 */
export async function saveDocumentVersion(input: {
  documentId: string;
  tenantId: string;
  fileUrl: string;
  fileSize?: number;
  fileHash?: string;
  storageProvider?: string;
  storagePath?: string;
  metadata?: Record<string, unknown>;
}): Promise<DocumentVersion | null> {
  const { getSupabase } = await import("@/infrastructure/database/supabase");
  const supabase = getSupabase();

  // Calcular el siguiente version_number
  const { data: last } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", input.documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (last?.version_number ?? 0) + 1;

  const { data, error } = await supabase
    .from("document_versions")
    .insert({
      document_id: input.documentId,
      tenant_id: input.tenantId,
      version_number: nextVersion,
      file_url: input.fileUrl,
      file_size: input.fileSize ?? null,
      file_hash: input.fileHash ?? null,
      storage_provider: input.storageProvider ?? "gdrive",
      storage_path: input.storagePath ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error.message }, "[n8n] saveDocumentVersion failed");
    return null;
  }

  return data as DocumentVersion;
}

/**
 * Get document version history for a document
 */
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const { getSupabase } = await import("@/infrastructure/database/supabase");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });

  if (error) {
    logger.warn({ err: error.message }, "[n8n] getDocumentVersions failed");
    return [];
  }

  return (data as DocumentVersion[]) ?? [];
}

/**
 * Get n8n configuration for a tenant
 */
export async function getN8nConfig(tenantId: string): Promise<N8nConfig | null> {
  const { getSupabase } = await import("@/infrastructure/database/supabase");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("n8n_config")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    logger.warn(`[n8n] no config found for tenant ${tenantId}`);
    return null;
  }

  return {
    webhookUrl: data.webhook_url,
    webhookSecret: data.webhook_secret,
    isActive: data.is_active,
    config: data.config || {},
  };
}

/**
 * Upload file to n8n webhook
 */
export async function uploadToN8n(
  tenantId: string,
  documentId: string,
  knowledgeBaseId: string,
  file: File | Buffer,
  filename: string,
  contentType: string
): Promise<UploadResult> {
  const config = await getN8nConfig(tenantId);
  if (!config) {
    throw new Error("n8n not configured for this tenant");
  }

  // Create form data with just the file
  const formData = new FormData();

  if (file instanceof File) {
    formData.append("file", file, filename);
  } else {
    // Buffer - convert to Uint8Array for Blob
    const uint8Array = new Uint8Array(file);
    const blob = new Blob([uint8Array], { type: contentType });
    formData.append("file", blob, filename);
  }

  // Send to n8n - metadata goes in headers only
  const headers: Record<string, string> = {};
  if (config.webhookSecret) {
    headers["x-webhook-secret"] = config.webhookSecret;
  }
  headers["x-tenant-id"] = tenantId;
  headers["x-document-id"] = documentId;
  headers["x-knowledge-base-id"] = knowledgeBaseId;
  if (config.config?.gdrive_folder) {
    headers["x-gdrive-folder"] = String(config.config.gdrive_folder);
  }

  logger.info(`[n8n] uploading ${filename} to ${config.webhookUrl}`);

  const response = await fetch(config.webhookUrl, {
    method: "POST",
    headers,
    body: formData,
    signal: AbortSignal.timeout(60000), // 60 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n upload failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  logger.info(`[n8n] upload response: ${JSON.stringify(result)}`);

  return {
    success: true,
    documentId: result.documentId || documentId,
    fileUrl: result.fileUrl || "",
    storageProvider: result.storageProvider || "n8n",
    version: result.version || 1,
    message: result.message || "Upload successful",
  };
}
