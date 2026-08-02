// ============================================================
// db.ts — Supabase (PostgreSQL) Data Layer
// ============================================================

import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";
import {
  DEFAULT_TENANT_ID,
  type Conversation,
  type ConversationListItem,
  type Message,
  type ConversationMode,
  type MessageRole,
} from "@/core/types/database";
import type { KnowledgeBase, Document, KnowledgeBaseWithStats } from "@/core/types/rag";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

// ============================================================
// Conversations
// ============================================================

export async function getOrCreateConversation(
  phone: string,
  name?: string,
  jid?: string
): Promise<Conversation> {
  const supabase = getSupabase();

  // Try to find existing conversation
  const { data: existing, error: findErr } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("phone", phone)
    .single();

  if (findErr && findErr.code !== "PGRST116") {
    // PGRST116 = no rows found (expected for new conversations)
    logger.error(`[db] find conversation error: ${findErr.message} code=${findErr.code}`);
  }

  if (existing) {
    // Update name if missing
    if (name && (!existing.name || existing.name === "")) {
      await supabase.from("conversations").update({ name }).eq("id", existing.id);
      existing.name = name;
    }
    // Update jid if changed
    if (jid && existing.jid !== jid) {
      await supabase.from("conversations").update({ jid }).eq("id", existing.id);
      existing.jid = jid;
    }
    return existing as Conversation;
  }

  // Create new conversation
  logger.info(`[db] creating conversation for phone=${phone} jid=${jid}`);
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      phone,
      name: name ?? null,
      jid: jid ?? null,
      mode: "AI",
    })
    .select()
    .single();

  if (error) {
    logger.error(
      `[db] create conversation FAILED: ${error.message} code=${error.code} details=${error.details} hint=${error.hint}`
    );
    throw new Error(`Failed to create conversation: ${error.message} (code=${error.code})`);
  }
  logger.info(`[db] created conversation ${created.id}`);
  return created as Conversation;
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("conversations").select("*").eq("id", id).single();
  return (data as Conversation) ?? null;
}

export async function listConversations(): Promise<ConversationListItem[]> {
  const supabase = getSupabase();

  const { data: conversations } = await supabase
    .from("conversations")
    .select(
      `
      *,
      messages(content, created_at)
    `
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!conversations) return [];

  return conversations.map((conv: any) => {
    // Messages llegan sin orden garantizado: tomar el más reciente por created_at
    const lastMsg =
      [...(conv.messages ?? [])].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null;

    // Remove the messages array from the result
    const { messages: _messages, ...rest } = conv;

    return {
      ...rest,
      last_message_preview: lastMsg?.content ?? null,
    };
  }) as ConversationListItem[];
}

export async function setMode(conversationId: string, mode: ConversationMode): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("conversations").update({ mode }).eq("id", conversationId);
}

export async function updateConversationPhone(
  conversationId: string,
  phone: string
): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("conversations").update({ phone }).eq("id", conversationId);
}

// ============================================================
// Messages
// ============================================================

export async function insertMessage(
  conversationId: string,
  role: MessageRole,
  content: string
): Promise<string> {
  const supabase = getSupabase();

  // Insert message
  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to insert message: ${error.message}`);

  // Update last_message_at
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return msg.id;
}

export async function getMessages(conversationId: string, limit = 50): Promise<Message[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as Message[]) ?? []).reverse();
}

export async function getRecentHistory(conversationId: string, limit = 20): Promise<Message[]> {
  return getMessages(conversationId, limit);
}

// ============================================================
// Delete Conversation (cascade handled by FK)
// ============================================================

export async function deleteConversation(conversationId: string): Promise<void> {
  const supabase = getSupabase();

  // Delete messages first (cascade should handle this, but being explicit)
  await supabase.from("messages").delete().eq("conversation_id", conversationId);

  // Delete conversation
  await supabase.from("conversations").delete().eq("id", conversationId);
}

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

// ============================================================
// Health Check
// ============================================================

export interface DatabaseHealth {
  status: "healthy" | "degraded" | "unhealthy";
  conversations: number;
  messages: number;
  uptime: number;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const supabase = getSupabase();

  const [convResult, msgResult] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }),
    supabase.from("messages").select("id", { count: "exact", head: true }),
  ]);

  const conversations = convResult.count ?? 0;
  const messages = msgResult.count ?? 0;

  return {
    status: "healthy",
    conversations,
    messages,
    uptime: process.uptime(),
  };
}
