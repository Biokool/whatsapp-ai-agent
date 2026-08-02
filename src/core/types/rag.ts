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
