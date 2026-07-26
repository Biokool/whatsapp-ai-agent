import {
  guardarLeadDefinition,
  guardarLeadHandler,
} from "./guardar-lead";
import {
  calificarDefinition,
  calificarHandler,
} from "./calificar";
import {
  agendarDefinition,
  agendarHandler,
} from "./agendar";
import {
  derivarHumanoDefinition,
  derivarHumanoHandler,
} from "./derivar-humano";

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

// El handler de cada tool define sus propios argumentos.
// Aquí trabajamos con un wrapper que acepta unknown args (los validamos al entrar).
export type ToolHandler<TArgs = Record<string, unknown>> = (
  args: TArgs & { conversationId?: number }
) => Promise<Record<string, unknown>>;

// ============================================================
// Registry — usamos wrappers que aceptan unknown y delegan a los handlers tipados
// ============================================================

export const toolDefinitions: ToolDefinition[] = [
  guardarLeadDefinition,
  calificarDefinition,
  agendarDefinition,
  derivarHumanoDefinition,
];

type GenericHandler = (
  args: Record<string, unknown> & { conversationId?: number }
) => Promise<Record<string, unknown>>;

const handlers: Record<string, GenericHandler> = {
  guardarLead: (args) =>
    guardarLeadHandler(args as unknown as Parameters<typeof guardarLeadHandler>[0]),
  calificar: (args) =>
    calificarHandler(args as unknown as Parameters<typeof calificarHandler>[0]),
  agendar: (args) =>
    agendarHandler(args as unknown as Parameters<typeof agendarHandler>[0]),
  derivarHumano: (args) =>
    derivarHumanoHandler(
      args as unknown as Parameters<typeof derivarHumanoHandler>[0]
    ),
};

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  context: { conversationId: number }
): Promise<Record<string, unknown>> {
  const handler = handlers[toolName];
  if (!handler) {
    return { ok: false, message: `Tool desconocida: ${toolName}` };
  }
  return handler({ ...args, conversationId: context.conversationId });
}
