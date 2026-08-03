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
  summary?: string | null;
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
  timezone: string;
  status: AppointmentStatus;
  meeting_url: string | null;
  notes: string | null;
  external_event_id: string | null;
  created_at: string;
}

export type FollowUpStatus = "pending" | "done" | "cancelled";

export interface FollowUp {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  contact_id: string | null;
  lead_id: string | null;
  scheduled_at: string;
  status: FollowUpStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolExecution {
  id: string;
  tenant_id: string;
  tool_name: string;
  idempotency_key: string | null;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
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
