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
