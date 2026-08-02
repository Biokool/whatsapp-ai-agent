import type { ToolDefinition } from "@/lib/tools";

/** Rol canónico dentro del agente (independiente de canal). */
export type AgentRole = "user" | "assistant";

/** Mensaje normalizado que el agente entiende, sin importar el canal. */
export interface AgentMessage {
  role: AgentRole;
  content: string;
}

export type IntentType =
  | "known" // la consulta encaja con business knowledge disponible
  | "unknown" // no se encontró información relevante
  | "ambiguous" // la consulta es ambigua
  | "out_of_scope" // solicitud fuera del alcance del negocio
  | "contradictory" // la consulta contradice el business knowledge
  | "prompt_injection" // intento de manipular al agente
  | "escalation"; // requiere derivar a un humano

/** Contexto completo que el agente recibe en cada invocación. Independiente de canal/LLM/RAG/negocio. */
export interface AgentContext {
  tenantId: string;
  conversationId: string;
  channel: string; // "whatsapp" | "web" | ...
  userPhone: string;
  userName?: string;
  /** Instrucciones de sistema del proveedor (CUSTOMER SERVICE EXPERTISE). */
  systemInstructions: string;
  /** Datos del negocio (BUSINESS KNOWLEDGE), ej. prompts/negocio.md. */
  businessKnowledge: string;
  /** Contexto recuperado por RAG (vacío si no hay). */
  ragContext: string;
  /** Historial reciente normalizado. */
  history: AgentMessage[];
  /** Resumen de la conversación hasta ahora (memoria). Puede ser vacío. */
  conversationSummary: string;
  /** Momento actual en ISO (para el agente). */
  nowIso: string;
}

export type AgentAction = "reply" | "escalate" | "reject";

export interface AgentResult {
  action: AgentAction;
  reply: string;
  intent: IntentType;
  /** Tools ejecutadas durante el turno. */
  toolsUsed: string[];
  /** true si se usó contexto RAG en el turno. */
  usedRag: boolean;
}

/** Port del proveedor LLM. */
export interface LLMProvider {
  complete(params: {
    systemPrompt: string;
    messages: AgentMessage[];
    tools?: ToolDefinition[];
  }): Promise<LLMCompletion>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMCompletion {
  content: string;
  toolCalls: ToolCall[];
}

/** Port del proveedor RAG. */
export interface RAGProvider {
  retrieve(tenantId: string, query: string): Promise<string>;
}

/** Port de la memoria de conversación. */
export interface MemoryProvider {
  getRecent(conversationId: string, limit: number): Promise<AgentMessage[]>;
  getSummary(conversationId: string): Promise<string>;
  /** Actualiza el resumen acumulado de la conversación. */
  updateSummary(conversationId: string, messages: AgentMessage[]): Promise<string>;
}

/** Port de las tools del agente. */
export interface ToolProvider {
  list(): ToolDefinition[];
  execute(
    name: string,
    args: Record<string, unknown>,
    context: { conversationId: string; tenantId: string }
  ): Promise<Record<string, unknown>>;
}
