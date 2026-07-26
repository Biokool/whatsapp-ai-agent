// ============================================================
// Database Types — Supabase (PostgreSQL)
// ============================================================

export type ConversationMode = "AI" | "HUMAN";
export type MessageRole = "user" | "assistant" | "human";
export type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected";
export type ConversationStatus = "active" | "closed" | "archived";
export type LeadStatus = "new" | "qualified" | "disqualified" | "converted";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled";

export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  config: Record<string, unknown>;
  created_at: string; // TIMESTAMPTZ
  updated_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string; // UUID
  tenant_id: string;
  phone: string;
  name: string | null;
  jid: string | null;
  mode: ConversationMode;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
}

export interface ConversationListItem extends Conversation {
  last_message_preview: string | null;
}

export interface Message {
  id: string; // UUID
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  contact_id: string;
  score: number;
  status: LeadStatus;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  scheduled_at: string;
  status: AppointmentStatus;
  meeting_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// Default tenant ID for single-tenant mode
export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
