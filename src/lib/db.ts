// ============================================================
// db.ts — Supabase (PostgreSQL) Data Layer
// ============================================================

import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";
import {
  DEFAULT_TENANT_ID,
  type Appointment,
  type Contact,
  type Conversation,
  type ConversationListItem,
  type FollowUp,
  type Lead,
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
// Conversation Summary (memoria mínima viable)
// ============================================================

const CONVERSATION_SUMMARY_MAX_CHARS = 1200;

export async function getConversationSummary(conversationId: string): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("conversations")
    .select("summary")
    .eq("id", conversationId)
    .single();
  return (data?.summary as string | null) ?? "";
}

export async function updateConversationSummary(
  conversationId: string,
  summary: string
): Promise<void> {
  const supabase = getSupabase();
  const trimmed = summary.slice(0, CONVERSATION_SUMMARY_MAX_CHARS);
  await supabase.from("conversations").update({ summary: trimmed }).eq("id", conversationId);
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

// ============================================================
// Contacts / Leads / Follow-ups / Appointments / Tool executions
// ============================================================

export async function listContacts(): Promise<Contact[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("created_at", { ascending: false });
  return (data as Contact[]) ?? [];
}

export async function upsertContact(input: {
  phone: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}): Promise<Contact> {
  const supabase = getSupabase();
  const existing = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("phone", input.phone)
    .maybeSingle();
  if (existing.data) {
    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: input.name ?? existing.data.name,
        email: input.email ?? existing.data.email,
        metadata: input.metadata ?? existing.data.metadata,
      })
      .eq("id", existing.data.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update contact: ${error.message}`);
    return data as Contact;
  }
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      phone: input.phone,
      name: input.name ?? null,
      email: input.email ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data as Contact;
}

export async function createLeadRow(input: {
  contactId: string;
  score?: number;
  criteria?: Record<string, unknown>;
}): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      contact_id: input.contactId,
      score: input.score ?? 0,
      criteria: input.criteria ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return data as Lead;
}

export async function updateLeadRow(
  leadId: string,
  patch: Partial<Pick<Lead, "score" | "status" | "criteria">>
): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  return data as Lead;
}

export async function listFollowUps(): Promise<FollowUp[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("scheduled_at", { ascending: true });
  return (data as FollowUp[]) ?? [];
}

export async function createFollowUp(input: {
  conversationId?: string;
  contactId?: string;
  leadId?: string;
  scheduledAt: string;
  note?: string;
}): Promise<FollowUp> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      conversation_id: input.conversationId ?? null,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      scheduled_at: input.scheduledAt,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create follow-up: ${error.message}`);
  return data as FollowUp;
}

export async function createAppointmentRow(input: {
  leadId: string;
  scheduledAt: string;
  timezone?: string;
  notes?: string;
  externalEventId?: string;
}): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      lead_id: input.leadId,
      scheduled_at: input.scheduledAt,
      timezone: input.timezone ?? "UTC",
      notes: input.notes ?? null,
      external_event_id: input.externalEventId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create appointment: ${error.message}`);
  return data as Appointment;
}

export async function listAppointmentsInRange(from: string, to: string): Promise<Appointment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to);
  return (data as Appointment[]) ?? [];
}

export async function rescheduleAppointmentRow(
  appointmentId: string,
  scheduledAt: string
): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .update({ scheduled_at: scheduledAt })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to reschedule appointment: ${error.message}`);
  return data as Appointment;
}

export async function cancelAppointmentRow(appointmentId: string): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to cancel appointment: ${error.message}`);
  return data as Appointment;
}

// ============================================================
// Tool executions (idempotencia + auditoría)
// ============================================================

export async function hasToolExecution(
  tenantId: string,
  toolName: string,
  key: string
): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("tool_executions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("tool_name", toolName)
    .eq("idempotency_key", key)
    .maybeSingle();
  return Boolean(data);
}

export async function recordToolExecution(input: {
  tenantId: string;
  toolName: string;
  idempotencyKey?: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("tool_executions").insert({
    tenant_id: input.tenantId,
    tool_name: input.toolName,
    idempotency_key: input.idempotencyKey ?? null,
    status: input.status,
    input: input.input ?? null,
    output: input.output ?? null,
    error: input.error ?? null,
  });
}

export async function insertAuditLog(input: {
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("audit_logs").insert({
    tenant_id: input.tenantId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    details: input.details ?? {},
  });
}
