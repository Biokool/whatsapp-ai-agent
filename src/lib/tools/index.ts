// src/lib/tools/index.ts (final)
import { guardarLeadDefinition, guardarLeadHandler } from "./guardar-lead";
import { calificarDefinition, calificarHandler } from "./calificar";
import { agendarDefinition, agendarHandler } from "./agendar";
import { derivarHumanoDefinition, derivarHumanoHandler } from "./derivar-humano";
import { SupabaseCalendarProvider } from "@/lib/calendar/providers/supabase-calendar";
import { SupabaseIdempotencyStore, SupabaseAuditSink } from "./infra";
import { buildRegistry } from "./registry";

// ============================================================
// Tipos compartidos
// ============================================================

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export type ToolHandler<TArgs = Record<string, unknown>> = (
  args: TArgs & { conversationId?: string }
) => Promise<Record<string, unknown>>;

type GenericHandler = (
  args: Record<string, unknown> & { conversationId?: string }
) => Promise<Record<string, unknown>>;

const legacyDefinitions: ToolDefinition[] = [
  guardarLeadDefinition,
  calificarDefinition,
  agendarDefinition,
  derivarHumanoDefinition,
];

const legacyHandlers: Record<string, GenericHandler> = {
  guardarLead: (args) =>
    guardarLeadHandler(args as unknown as Parameters<typeof guardarLeadHandler>[0]),
  calificar: (args) => calificarHandler(args as unknown as Parameters<typeof calificarHandler>[0]),
  agendar: (args) => agendarHandler(args as unknown as Parameters<typeof agendarHandler>[0]),
  derivarHumano: (args) =>
    derivarHumanoHandler(args as unknown as Parameters<typeof derivarHumanoHandler>[0]),
};

// Registry principal del proyecto (MVP: Supabase como calendario).
const defaultRegistry = buildRegistry(
  new SupabaseCalendarProvider({
    tenantId: process.env.DEFAULT_TENANT_ID ?? "00000000-0000-0000-0000-000000000001",
    leadId: "unknown",
  })
);

const defaultDeps = {
  idempotencyStore: new SupabaseIdempotencyStore(),
  auditSink: new SupabaseAuditSink(),
};

export const toolDefinitions: ToolDefinition[] = [
  ...legacyDefinitions,
  ...defaultRegistry.definitions(),
];

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: { conversationId: string; tenantId?: string }
): Promise<Record<string, unknown>> {
  const legacyHandler = legacyHandlers[toolName];
  if (legacyHandler) {
    return legacyHandler({ ...args, conversationId: context.conversationId });
  }

  const result = await defaultRegistry.run(
    toolName,
    args,
    {
      tenantId: context.tenantId ?? "00000000-0000-0000-0000-000000000001",
      conversationId: context.conversationId,
      actor: undefined,
      permissions: [],
    },
    defaultDeps
  );

  return {
    ok: result.ok,
    status: result.status,
    ...(result.data ?? {}),
    ...(result.error ? { error: result.error } : {}),
  };
}
