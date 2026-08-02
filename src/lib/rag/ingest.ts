import fs from "node:fs";
import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";
import { updateDocumentStatus } from "../db";
import { chunkText } from "./chunker";
import { generateEmbeddings } from "./embeddings";
import { extractTextFromUrl } from "./url-scraper";
import { extractText } from "unpdf";

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

    // 1. Extract text from file or URL
    let text: string;
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      // URL-based document
      text = await extractTextFromUrl(filePath);
    } else if (filePath.endsWith(".pdf")) {
      // PDF file - use unpdf (works in Node.js without DOMMatrix)
      const buffer = fs.readFileSync(filePath);
      const { text: pages } = await extractText(new Uint8Array(buffer));
      text = Array.isArray(pages) ? pages.join("\n\n") : pages;
    } else {
      // Text file (txt, md, etc.)
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
