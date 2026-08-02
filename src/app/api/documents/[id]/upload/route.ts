import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/infrastructure/database/supabase";
import { ingestDocument } from "@/lib/rag/ingest";
import { validateUrl } from "@/lib/rag/url-scraper";
import { getN8nConfig, uploadToN8n, saveDocumentVersion } from "@/lib/n8n/client";
import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import crypto from "node:crypto";

const logger = pino({ level: "info" });
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get document info first
    const supabase = getSupabase();
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("*, knowledge_bases!inner(tenant_id, chunk_size, chunk_overlap)")
      .eq("id", id)
      .single();

    if (docError || !doc) {
      logger.error({ docError }, "[upload] document not found");
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const kb = doc.knowledge_bases as any;
    const tenantId = kb.tenant_id;

    logger.info(`[upload] doc=${id} tenant=${tenantId} source=${doc.source_type}`);

    // Check if n8n is configured for this tenant
    const n8nConfig = await getN8nConfig(tenantId);
    const useN8n = n8nConfig && n8nConfig.isActive;
    logger.info(`[upload] n8n configured: ${useN8n}`);

    // Handle URL-based documents
    if (doc.source_type === "url" && doc.source_url) {
      // Validate URL
      const validation = await validateUrl(doc.source_url);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      // Trigger ingest in background with URL
      ingestDocument(
        id,
        doc.source_url,
        tenantId,
        doc.knowledge_base_id,
        kb.chunk_size,
        kb.chunk_overlap
      ).catch((err) => logger.error({ err: err.message }, "[upload] URL ingest failed"));

      return NextResponse.json({ ok: true, message: "URL received, processing started" });
    }

    // Handle file uploads
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

    // Calculate file hash
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Save file locally for RAG ingest
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const localPath = path.join(UPLOAD_DIR, `${id}.${ext || "pdf"}`);
    fs.writeFileSync(localPath, buffer);
    logger.info(`[upload] saved locally: ${localPath}`);

    if (useN8n) {
      // Upload to n8n for cloud storage
      logger.info(`[upload] calling n8n: ${n8nConfig!.webhookUrl}`);
      try {
        const uploadResult = await uploadToN8n(
          tenantId,
          id,
          doc.knowledge_base_id,
          buffer,
          file.name,
          file.type || `application/${ext}`
        );

        // Persist GDrive metadata in Supabase (source of truth)
        const version = await saveDocumentVersion({
          documentId: id,
          tenantId,
          fileUrl: uploadResult.fileUrl,
          fileSize: file.size,
          fileHash,
          storageProvider: uploadResult.storageProvider,
          storagePath: localPath,
          metadata: { filename: file.name, contentType: file.type || `application/${ext}` },
        });

        await supabase
          .from("documents")
          .update({
            external_url: uploadResult.fileUrl || null,
            storage_path: localPath,
            file_hash: fileHash,
            storage_provider: uploadResult.storageProvider,
            current_version: version?.version_number ?? uploadResult.version ?? 1,
          })
          .eq("id", id);

        logger.info(
          `[upload] n8n upload ok: provider=${uploadResult.storageProvider} fileUrl=${uploadResult.fileUrl} version=${version?.version_number}`
        );

        // Trigger ingest from local file (never from GDrive URL to avoid 401s)
        ingestDocument(
          id,
          localPath,
          tenantId,
          doc.knowledge_base_id,
          kb.chunk_size,
          kb.chunk_overlap
        ).catch((err) => logger.error({ err: err.message }, "[upload] ingest failed"));

        return NextResponse.json({
          ok: true,
          message: "Upload received, processing started",
          storageProvider: uploadResult.storageProvider,
          fileUrl: uploadResult.fileUrl,
          version: version?.version_number ?? uploadResult.version,
        });
      } catch (n8nError: any) {
        logger.error(
          { err: n8nError.message },
          "[upload] n8n upload failed, falling back to local"
        );
      }
    } else {
      logger.info("[upload] n8n not configured, using local storage");
    }

    // Local storage only - update document record
    await supabase
      .from("documents")
      .update({
        storage_path: localPath,
        file_hash: fileHash,
        storage_provider: "local",
      })
      .eq("id", id);

    // Trigger ingest in background
    ingestDocument(
      id,
      localPath,
      tenantId,
      doc.knowledge_base_id,
      kb.chunk_size,
      kb.chunk_overlap
    ).catch((err) => logger.error({ err: err.message }, "[upload] ingest failed"));

    return NextResponse.json({
      ok: true,
      message: "Upload received, processing started",
      storageProvider: "local",
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "[upload] unexpected error");
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
