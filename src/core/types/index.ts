export type ConnectionStatus = "disconnected" | "qr" | "connecting" | "connected" | "unknown";

export interface ConnectionPayload {
  status: ConnectionStatus;
  qrPng?: string;
  phone?: string | null;
}

export type MessageRole = "user" | "assistant" | "human";

export interface Conversation {
  id: number;
  phone: string;
  name: string | null;
  mode: "AI" | "HUMAN";
  last_message_at: number | null;
  last_message_preview: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: MessageRole;
  content: string;
  created_at: number;
}
