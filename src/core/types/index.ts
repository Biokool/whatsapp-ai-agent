export type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected" | "unknown";

export interface ConnectionPayload {
  status: ConnectionStatus;
  qrPng?: string;
  phone?: string | null;
}

export type MessageRole = "user" | "assistant" | "human";

export interface Conversation {
  id: string;
  phone: string;
  name: string | null;
  jid: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: string | null;
  last_message_preview: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}
