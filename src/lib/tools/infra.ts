// src/lib/tools/infra.ts
import { hasToolExecution, insertAuditLog, recordToolExecution } from "@/lib/db";
import type { ToolExecutorDeps } from "@/core/types/tool";

export class SupabaseIdempotencyStore implements NonNullable<ToolExecutorDeps["idempotencyStore"]> {
  constructor(private readonly tenantId = "00000000-0000-0000-0000-000000000001") {}

  async has(key: string): Promise<boolean> {
    return hasToolExecution(this.tenantId, "*", key);
  }

  async set(key: string, value: unknown): Promise<void> {
    await recordToolExecution({
      tenantId: this.tenantId,
      toolName: "*",
      idempotencyKey: key,
      status: "VALID",
      output: value as Record<string, unknown>,
    });
  }
}

export class SupabaseAuditSink implements NonNullable<ToolExecutorDeps["auditSink"]> {
  async log(entry: {
    tenantId: string;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown>;
  }): Promise<void> {
    await insertAuditLog({
      tenantId: entry.tenantId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? undefined,
      details: entry.details,
    });
  }
}
