// ============================================================
// db.ts — Supabase (PostgreSQL) Data Layer
// ============================================================

import { getSupabase } from "@/infrastructure/database/supabase";
import {
  DEFAULT_TENANT_ID,
  type Conversation,
  type ConversationListItem,
  type Message,
  type ConversationMode,
  type MessageRole,
} from "@/core/types/database";

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
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("phone", phone)
    .single();

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

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
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
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!conversations) return [];

  // Get last message preview for each conversation
  const result: ConversationListItem[] = [];
  for (const conv of conversations) {
    const { data: lastMsg } = await supabase
      .from("messages")
      .select("content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    result.push({
      ...(conv as Conversation),
      last_message_preview: lastMsg?.content ?? null,
    });
  }

  return result;
}

export async function setMode(conversationId: string, mode: ConversationMode): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("conversations").update({ mode }).eq("id", conversationId);
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
