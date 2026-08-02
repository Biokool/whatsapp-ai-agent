// src/core/types/tool.ts
import type { z } from "zod";

export type ToolStatus = "VALID" | "INVALID" | "UNAUTHORIZED" | "TIMEOUT" | "FAILURE" | "DUPLICATE";

export interface ToolExecutionResult {
  status: ToolStatus;
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export type ToolFailureStatus = Exclude<ToolStatus, "VALID">;

export class ToolError extends Error {
  constructor(
    public readonly status: ToolFailureStatus,
    message: string
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export interface ToolExecutionContext {
  tenantId: string;
  conversationId: string;
  /** Identificador del actor (userPhone del lead o id de admin). */
  actor?: string;
  /** Permisos del actor. Vacío = sin privilegios extra. */
  permissions?: string[];
}

export interface ToolSpec {
  name: string;
  description: string;
  /** Schema zod del input esperado. */
  inputSchema: z.ZodTypeAny;
  /** Permiso requerido para ejecutar. Ausente = cualquiera. */
  permission?: string;
  timeoutMs?: number;
  maxRetries?: number;
  /** Función que genera la key de idempotencia. Ausente = sin idempotencia. */
  idempotencyKey?: (args: Record<string, unknown>, ctx: ToolExecutionContext) => string;
  audit?: boolean;
  /** Ejecuta la acción real. Debe lanzar ToolError para fallos tipados. */
  execute(
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<Record<string, unknown>>;
}

export interface ToolExecutorDeps {
  /** Almacén de idempotencia. Requerido para specs con idempotencyKey. */
  idempotencyStore?: {
    has(key: string): Promise<boolean>;
    set(key: string, value: unknown): Promise<void>;
  };
  /** Sink de auditoría. Requerido para specs con audit: true. */
  auditSink?: {
    log(entry: {
      tenantId: string;
      action: string;
      resourceType: string;
      resourceId: string | null;
      details: Record<string, unknown>;
    }): Promise<void>;
  };
}
