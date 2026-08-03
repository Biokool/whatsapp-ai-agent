// src/lib/tools/executor.ts
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutorDeps,
  ToolSpec,
} from "@/core/types/tool";
import { ToolError } from "@/core/types/tool";

function success(data?: Record<string, unknown>): ToolExecutionResult {
  return { status: "VALID", ok: true, data };
}

function failure(status: ToolExecutionResult["status"], error: string): ToolExecutionResult {
  return { status, ok: false, error };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new ToolError("TIMEOUT", `Exceeded ${timeoutMs}ms`)),
      timeoutMs
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export async function runTool(
  spec: ToolSpec,
  rawArgs: Record<string, unknown>,
  ctx: ToolExecutionContext,
  deps: ToolExecutorDeps
): Promise<ToolExecutionResult> {
  const parsed = spec.inputSchema.safeParse(rawArgs);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => i.message).join("; ");
    return failure("INVALID", issues);
  }
  const args = parsed.data as Record<string, unknown>;

  if (spec.permission && !(ctx.permissions ?? []).includes(spec.permission)) {
    return failure("UNAUTHORIZED", `Requiere permiso: ${spec.permission}`);
  }

  let idempotencyKey: string | undefined;
  if (spec.idempotencyKey) {
    idempotencyKey = spec.idempotencyKey(args, ctx);
    if (!deps.idempotencyStore) {
      return failure("FAILURE", "idempotencyStore requerido para esta tool");
    }
    if (await deps.idempotencyStore.has(idempotencyKey)) {
      return failure("DUPLICATE", `Operación duplicada: ${idempotencyKey}`);
    }
  }

  const timeoutMs = spec.timeoutMs ?? 15_000;
  const maxRetries = spec.maxRetries ?? 0;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let data: Record<string, unknown>;
    try {
      data = await withTimeout(spec.execute(args, ctx), timeoutMs);
    } catch (err) {
      lastError = err;
      if (err instanceof ToolError) {
        if (err.status === "TIMEOUT") break;
        if (err.status !== "FAILURE") break;
      }
      if (attempt >= maxRetries) break;
      continue;
    }

    await recordInfra(spec, args, ctx, deps, idempotencyKey);
    return success(data);
  }

  const message = lastError instanceof Error ? lastError.message : "Error desconocido en la tool";
  const status =
    lastError instanceof ToolError && lastError.status !== "FAILURE" ? lastError.status : "FAILURE";

  if (spec.audit && deps.auditSink) {
    try {
      await deps.auditSink.log({
        tenantId: ctx.tenantId,
        action: spec.name,
        resourceType: "tool",
        resourceId: ctx.conversationId,
        details: { args, outcome: status, error: message },
      });
    } catch {
      // la infraestructura de auditoría no debe romper el contrato de runTool
    }
  }

  return failure(status, message);
}

async function recordInfra(
  spec: ToolSpec,
  args: Record<string, unknown>,
  ctx: ToolExecutionContext,
  deps: ToolExecutorDeps,
  idempotencyKey: string | undefined
): Promise<void> {
  try {
    if (idempotencyKey && deps.idempotencyStore) {
      await deps.idempotencyStore.set(idempotencyKey, { tool: spec.name, status: "VALID" });
    }
    if (spec.audit && deps.auditSink) {
      await deps.auditSink.log({
        tenantId: ctx.tenantId,
        action: spec.name,
        resourceType: "tool",
        resourceId: ctx.conversationId,
        details: { args, outcome: "VALID" },
      });
    }
  } catch {
    // la infraestructura no debe re-ejecutar la tool ni escapar como error
  }
}
