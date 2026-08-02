import type { RAGProvider } from "@/core/types/agent";
import { retrieveContext } from "@/lib/rag/retrieval";

export class SupabaseRAGProvider implements RAGProvider {
  async retrieve(tenantId: string, query: string): Promise<string> {
    return retrieveContext(tenantId, query);
  }
}
