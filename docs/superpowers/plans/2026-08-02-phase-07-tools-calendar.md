# Phase 07: Tools + Calendar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir acciones externas mediante herramientas con validación completa (input, permisos, errores, timeout, retry, idempotencia, auditoría) y un `CalendarProvider` desacoplado con adaptadores pluggables, sin modificar el Agent Core.

**Architecture:** Un framework de tools (specs + executor) envuelve cada herramienta con validación zod, chequeo de permisos, idempotencia, timeout/retry y auditoría, exponiendo resultados tipados `ToolExecutionResult` con estados `VALID/INVALID/UNAUTHORIZED/TIMEOUT/FAILURE/DUPLICATE`. El calendario usa una interfaz `CalendarProvider` con `SupabaseCalendarProvider` como MVP (persistencia en la tabla `appointments` con validación de timezone IANA y doble reserva) y adaptadores Google Calendar/Cal.com preparados para plug-in sin tocar Agent Core.

**Tech Stack:** TypeScript strict, Next.js 16, Supabase (PostgreSQL), Vitest 4, zod v4, pino.

## Global Constraints

- Ejecutar SOLO la Fase 07. No avanzar a la 08.
- El Agent Core (`src/lib/agent/universal-agent.ts`, `src/lib/baileys/handler.ts`) NO debe modificar su firma ni su lógica de orquestación.
- Cambiar de proveedor de calendario debe requerir 0 cambios en el Agent Core.
- Tests en `src/lib/tools/**` y `src/lib/calendar/**` con TDD (test primero, falla, implementa, pasa).
- `npm run typecheck` debe pasar con 0 errores en cada task.
- `npm run test` suite completa verde en cada task.
- NO añadir comentarios al código salvo que el plan los incluya.
- Idiomas: strings de usuario/respuesta en español; identificadores en inglés.
- Commit por task con mensaje descriptivo tras verificación.

---

### Task 1: Core types de tools (ToolStatus, ToolError, ToolSpec, ToolExecutionResult)

**Files:**

- Create: `src/core/types/tool.ts`

**Interfaces:**

- Produces: `ToolStatus`, `ToolExecutionResult`, `ToolError` (class con `status`), `ToolSpec`, `ToolExecutionContext`, `ToolExecutorDeps`

- [ ] **Step 1: Write the type definitions**

```ts
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
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/core/types/tool.ts
git commit -m "feat(tools): add core tool types, ToolError and ToolSpec contract"
```

---

### Task 2: ToolExecutor — validación, permisos, timeout, retry, idempotencia y auditoría

**Files:**

- Create: `src/lib/tools/executor.ts`
- Test: `src/lib/tools/executor.test.ts`

**Interfaces:**

- Consumes: `ToolSpec`, `ToolExecutionContext`, `ToolExecutionResult`, `ToolError`, `ToolExecutorDeps` from `@/core/types/tool`
- Produces: `runTool(spec, rawArgs, ctx, deps): Promise<ToolExecutionResult>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tools/executor.test.ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { runTool } from "./executor";
import { ToolError } from "@/core/types/tool";
import type { ToolExecutorDeps, ToolExecutionContext, ToolSpec } from "@/core/types/tool";

const ctx: ToolExecutionContext = {
  tenantId: "t1",
  conversationId: "c1",
  actor: "5215555555",
  permissions: [],
};

function makeSpec(overrides: Partial<ToolSpec> = {}): ToolSpec {
  return {
    name: "testTool",
    description: "Test tool",
    inputSchema: z.object({ email: z.string().email() }),
    execute: async () => ({ ok: true }),
    ...overrides,
  };
}

describe("runTool", () => {
  it("returns VALID when input and execution succeed", async () => {
    const result = await runTool(
      makeSpec({ execute: async () => ({ saved: true }) }),
      { email: "a@b.com" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ saved: true });
  });

  it("returns INVALID when input fails schema validation", async () => {
    const result = await runTool(makeSpec(), { email: "not-an-email" }, ctx, {});
    expect(result.status).toBe("INVALID");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns UNAUTHORIZED when permission is required but not granted", async () => {
    const result = await runTool(makeSpec({ permission: "admin" }), { email: "a@b.com" }, ctx, {});
    expect(result.status).toBe("UNAUTHORIZED");
  });

  it("executes when permission is granted", async () => {
    const grantedCtx: ToolExecutionContext = {
      ...ctx,
      permissions: ["admin"],
    };
    const result = await runTool(
      makeSpec({ permission: "admin" }),
      { email: "a@b.com" },
      grantedCtx,
      {}
    );
    expect(result.status).toBe("VALID");
  });

  it("returns FAILURE when execute throws ToolError", async () => {
    const result = await runTool(
      makeSpec({
        execute: async () => {
          throw new ToolError("FAILURE", "upstream broke");
        },
      }),
      { email: "a@b.com" },
      ctx,
      {}
    );
    expect(result.status).toBe("FAILURE");
    expect(result.error).toContain("upstream broke");
  });

  it("returns TIMEOUT when execute exceeds timeoutMs", async () => {
    const result = await runTool(
      makeSpec({
        timeoutMs: 50,
        execute: async () => {
          await new Promise((r) => setTimeout(r, 300));
          return { ok: true };
        },
      }),
      { email: "a@b.com" },
      ctx,
      {}
    );
    expect(result.status).toBe("TIMEOUT");
  });

  it("retries on transient failure and succeeds", async () => {
    let calls = 0;
    const result = await runTool(
      makeSpec({
        maxRetries: 2,
        execute: async () => {
          calls++;
          if (calls < 2) throw new ToolError("FAILURE", "transient");
          return { ok: true };
        },
      }),
      { email: "a@b.com" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(calls).toBe(2);
  });

  it("returns DUPLICATE when idempotency key already used", async () => {
    const store = {
      has: vi.fn().mockResolvedValue(true),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const result = await runTool(
      makeSpec({ idempotencyKey: () => "k1" }),
      { email: "a@b.com" },
      ctx,
      { idempotencyStore: store }
    );
    expect(result.status).toBe("DUPLICATE");
    expect(store.has).toHaveBeenCalledWith("k1");
  });

  it("stores idempotency key when not present and succeeds", async () => {
    const store = {
      has: vi.fn().mockResolvedValue(false),
      set: vi.fn().mockResolvedValue(undefined),
    };
    const result = await runTool(
      makeSpec({ idempotencyKey: () => "k1" }),
      { email: "a@b.com" },
      ctx,
      { idempotencyStore: store }
    );
    expect(result.status).toBe("VALID");
    expect(store.set).toHaveBeenCalledWith("k1", expect.anything());
  });

  it("writes audit log when audit is enabled", async () => {
    const auditSink: NonNullable<ToolExecutorDeps["auditSink"]> = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    const result = await runTool(makeSpec({ audit: true }), { email: "a@b.com" }, ctx, {
      auditSink,
    });
    expect(result.status).toBe("VALID");
    expect(auditSink.log).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "t1", action: "testTool" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tools/executor.test.ts`
Expected: FAIL with "Cannot find module './executor'"

- [ ] **Step 3: Write minimal implementation**

```ts
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
    try {
      const data = await withTimeout(spec.execute(args, ctx), timeoutMs);
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
      return success(data);
    } catch (err) {
      lastError = err;
      if (err instanceof ToolError && err.status !== "TIMEOUT") {
        // error tipado no transitorio salvo FAILURE (que sí se reintenta)
        if (attempt >= maxRetries) break;
        continue;
      }
      if (err instanceof ToolError && err.status === "TIMEOUT") {
        break;
      }
      // error inesperado: reintentar
      if (attempt >= maxRetries) break;
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Error desconocido en la tool";
  const status =
    lastError instanceof ToolError && lastError.status !== "FAILURE" ? lastError.status : "FAILURE";

  if (spec.audit && deps.auditSink) {
    await deps.auditSink.log({
      tenantId: ctx.tenantId,
      action: spec.name,
      resourceType: "tool",
      resourceId: ctx.conversationId,
      details: { args, outcome: status, error: message },
    });
  }

  return failure(status, message);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tools/executor.test.ts`
Expected: PASS (10 tests)

- [ ] **Step 5: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run test`
Expected: PASS (8 files + executor.test.ts = 9 files)

- [ ] **Step 6: Commit**

```bash
git add src/lib/tools/executor.ts src/lib/tools/executor.test.ts
git commit -m "feat(tools): add tool executor with validation, auth, timeout, retry, idempotency and audit"
```

---

### Task 3: Migración DB 007 (follow_ups, tool_executions) + funciones db de CRM/calendar

**Files:**

- Create: `src/infrastructure/database/migrations/007_tools_calendar.sql`
- Modify: `src/core/types/database.ts`
- Modify: `src/lib/db.ts`

**Interfaces:**

- Produces: tablas `follow_ups`, `tool_executions`; tipos `FollowUp`; funciones `listFollowUps`, `createFollowUp`, `createAppointmentRow`, `listAppointmentsInRange`, `rescheduleAppointmentRow`, `cancelAppointmentRow`, `listContacts`, `upsertContact`, `createLeadRow`, `updateLeadRow`, `recordToolExecution`, `hasToolExecution`, `insertAuditLog`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 007_tools_calendar.sql
-- Fase 07: Tools + Calendar

-- ============================================================
-- Follow-ups (recordatorios independientes de la conversación)
-- ============================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT CHECK(status IN ('pending','done','cancelled')) NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_tenant ON follow_ups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled ON follow_ups(tenant_id, scheduled_at);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY follow_ups_tenant_isolation ON follow_ups
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================
-- Tool executions (idempotencia + rastro)
-- ============================================================
CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, tool_name, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tenant ON tool_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_key ON tool_executions(tenant_id, idempotency_key);

ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tool_executions_tenant_isolation ON tool_executions
  FOR ALL USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- ============================================================
-- Appointments: añadir timezone y external_id (multi-proveedor)
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS external_event_id TEXT;

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

- [ ] **Step 2: Add types to database.ts**

```ts
// añadir tras interface Appointment (dentro de src/core/types/database.ts)

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
```

> **CORRECCIÓN del plan (aprobada por el humano):** la migración 007 añade `timezone` y `external_event_id` a `appointments`, por lo que la interface `Appointment` existente en `src/core/types/database.ts` DEBE ampliarse en esta misma task. Editar la interface existente para incluir los dos campos nuevos:

```ts
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
```

- [ ] **Step 3: Add CRM + calendar + idempotency + audit functions to db.ts**

Añadir estas funciones al final de `src/lib/db.ts`, tras `checkDatabaseHealth`:

```ts
// ============================================================
// Contacts / Leads / Follow-ups / Appointments / Tool executions
// ============================================================

export async function listContacts(): Promise<Contact[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("created_at", { ascending: false });
  return (data as Contact[]) ?? [];
}

export async function upsertContact(input: {
  phone: string;
  name?: string;
  email?: string;
  metadata?: Record<string, unknown>;
}): Promise<Contact> {
  const supabase = getSupabase();
  const existing = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("phone", input.phone)
    .maybeSingle();
  if (existing.data) {
    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: input.name ?? existing.data.name,
        email: input.email ?? existing.data.email,
        metadata: input.metadata ?? existing.data.metadata,
      })
      .eq("id", existing.data.id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update contact: ${error.message}`);
    return data as Contact;
  }
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      phone: input.phone,
      name: input.name ?? null,
      email: input.email ?? null,
      metadata: input.metadata ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return data as Contact;
}

export async function createLeadRow(input: {
  contactId: string;
  score?: number;
  criteria?: Record<string, unknown>;
}): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      contact_id: input.contactId,
      score: input.score ?? 0,
      criteria: input.criteria ?? {},
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return data as Lead;
}

export async function updateLeadRow(
  leadId: string,
  patch: Partial<Pick<Lead, "score" | "status" | "criteria">>
): Promise<Lead> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
  return data as Lead;
}

export async function listFollowUps(): Promise<FollowUp[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .order("scheduled_at", { ascending: true });
  return (data as FollowUp[]) ?? [];
}

export async function createFollowUp(input: {
  conversationId?: string;
  contactId?: string;
  leadId?: string;
  scheduledAt: string;
  note?: string;
}): Promise<FollowUp> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      conversation_id: input.conversationId ?? null,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
      scheduled_at: input.scheduledAt,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create follow-up: ${error.message}`);
  return data as FollowUp;
}

export async function createAppointmentRow(input: {
  leadId: string;
  scheduledAt: string;
  timezone?: string;
  notes?: string;
  externalEventId?: string;
}): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      tenant_id: DEFAULT_TENANT_ID,
      lead_id: input.leadId,
      scheduled_at: input.scheduledAt,
      timezone: input.timezone ?? "UTC",
      notes: input.notes ?? null,
      external_event_id: input.externalEventId ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to create appointment: ${error.message}`);
  return data as Appointment;
}

export async function listAppointmentsInRange(from: string, to: string): Promise<Appointment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to);
  return (data as Appointment[]) ?? [];
}

export async function rescheduleAppointmentRow(
  appointmentId: string,
  scheduledAt: string
): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .update({ scheduled_at: scheduledAt })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to reschedule appointment: ${error.message}`);
  return data as Appointment;
}

export async function cancelAppointmentRow(appointmentId: string): Promise<Appointment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointmentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to cancel appointment: ${error.message}`);
  return data as Appointment;
}

// ============================================================
// Tool executions (idempotencia + auditoría)
// ============================================================

export async function hasToolExecution(
  tenantId: string,
  toolName: string,
  key: string
): Promise<boolean> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("tool_executions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("tool_name", toolName)
    .eq("idempotency_key", key)
    .maybeSingle();
  return Boolean(data);
}

export async function recordToolExecution(input: {
  tenantId: string;
  toolName: string;
  idempotencyKey?: string;
  status: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("tool_executions").insert({
    tenant_id: input.tenantId,
    tool_name: input.toolName,
    idempotency_key: input.idempotencyKey ?? null,
    status: input.status,
    input: input.input ?? null,
    output: input.output ?? null,
    error: input.error ?? null,
  });
}

export async function insertAuditLog(input: {
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("audit_logs").insert({
    tenant_id: input.tenantId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    details: input.details ?? {},
  });
}
```

- [ ] **Step 4: Add imports to db.ts**

En la cabecera de `src/lib/db.ts`, extender el import de `@/core/types/database`:

```ts
import {
  DEFAULT_TENANT_ID,
  type Appointment,
  type Contact,
  type Conversation,
  type ConversationListItem,
  type FollowUp,
  type Lead,
  type Message,
  type ConversationMode,
  type MessageRole,
} from "@/core/types/database";
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/database/migrations/007_tools_calendar.sql src/core/types/database.ts src/lib/db.ts
git commit -m "feat(tools): add DB migration 007, follow-ups, tool executions and CRM/calendar data functions"
```

---

### Task 4: CalendarProvider (types) + SupabaseCalendarProvider (MVP) con timezone y doble reserva

**Files:**

- Create: `src/lib/calendar/types.ts`
- Create: `src/lib/calendar/providers/supabase-calendar.ts`
- Test: `src/lib/calendar/providers/supabase-calendar.test.ts`

**Interfaces:**

- Consumes: `listAppointmentsInRange`, `createAppointmentRow`, `rescheduleAppointmentRow`, `cancelAppointmentRow` from `@/lib/db`
- Produces: `CalendarSlot`, `GetAvailabilityInput`, `CreateAppointmentInput`, `CalendarProvider` interface, `SupabaseCalendarProvider` class

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/calendar/providers/supabase-calendar.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseCalendarProvider } from "./supabase-calendar";

vi.mock("@/lib/db", () => ({
  listAppointmentsInRange: vi.fn(),
  createAppointmentRow: vi.fn(),
  rescheduleAppointmentRow: vi.fn(),
  cancelAppointmentRow: vi.fn(),
}));

import {
  listAppointmentsInRange,
  createAppointmentRow,
  rescheduleAppointmentRow,
  cancelAppointmentRow,
} from "@/lib/db";

const mocked = {
  list: vi.mocked(listAppointmentsInRange),
  create: vi.mocked(createAppointmentRow),
  reschedule: vi.mocked(rescheduleAppointmentRow),
  cancel: vi.mocked(cancelAppointmentRow),
};

function makeProvider() {
  return new SupabaseCalendarProvider({ tenantId: "t1", leadId: "lead-1" });
}

const START = "2026-08-10T09:00:00.000Z";
const END = "2026-08-10T10:00:00.000Z";

describe("SupabaseCalendarProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns available slots with no bookings", async () => {
    mocked.list.mockResolvedValue([]);
    const provider = makeProvider();
    const slots = await provider.getAvailability({
      from: START,
      to: END,
      timezone: "America/Mexico_City",
      durationMinutes: 60,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("marks slots overlapping existing appointments as unavailable", async () => {
    mocked.list.mockResolvedValue([
      {
        id: "a1",
        tenant_id: "t1",
        lead_id: "lead-1",
        scheduled_at: "2026-08-10T09:30:00.000Z",
        timezone: "America/Mexico_City",
        status: "scheduled",
        meeting_url: null,
        notes: null,
        created_at: "2026-08-01T00:00:00Z",
        external_event_id: null,
      } as any,
    ]);
    const provider = makeProvider();
    const slots = await provider.getAvailability({
      from: START,
      to: END,
      timezone: "America/Mexico_City",
      durationMinutes: 60,
    });
    const overlapping = slots.filter(
      (s) =>
        new Date(s.start).getTime() < new Date("2026-08-10T10:00:00.000Z").getTime() &&
        new Date(s.end).getTime() > new Date("2026-08-10T09:00:00.000Z").getTime()
    );
    expect(overlapping.every((s) => !s.available)).toBe(true);
  });

  it("rejects invalid IANA timezone with FAILURE", async () => {
    const provider = makeProvider();
    await expect(
      provider.createAppointment({
        scheduledAt: "2026-08-10T10:00:00.000Z",
        timezone: "Mars/Olympus",
      })
    ).rejects.toThrow(/timezone/i);
  });

  it("creates appointment when no double-booking", async () => {
    mocked.list.mockResolvedValue([]);
    mocked.create.mockResolvedValue({
      id: "a-new",
      tenant_id: "t1",
      lead_id: "lead-1",
      scheduled_at: "2026-08-10T10:00:00.000Z",
      timezone: "America/Mexico_City",
      status: "scheduled",
      meeting_url: null,
      notes: null,
      created_at: "2026-08-01T00:00:00Z",
      external_event_id: null,
    } as any);
    const provider = makeProvider();
    const created = await provider.createAppointment({
      scheduledAt: "2026-08-10T10:00:00.000Z",
      timezone: "America/Mexico_City",
    });
    expect(created.id).toBe("a-new");
    expect(mocked.create).toHaveBeenCalledTimes(1);
  });

  it("rejects double-booking (DUPLICATE) when slot already taken", async () => {
    mocked.list.mockResolvedValue([
      {
        id: "a1",
        tenant_id: "t1",
        lead_id: "lead-1",
        scheduled_at: "2026-08-10T10:00:00.000Z",
        timezone: "America/Mexico_City",
        status: "scheduled",
        meeting_url: null,
        notes: null,
        created_at: "2026-08-01T00:00:00Z",
        external_event_id: null,
      } as any,
    ]);
    const provider = makeProvider();
    await expect(
      provider.createAppointment({
        scheduledAt: "2026-08-10T10:00:00.000Z",
        timezone: "America/Mexico_City",
      })
    ).rejects.toThrow(/ya existe|doble reserva|duplicado/i);
  });

  it("reschedules and cancels via row functions", async () => {
    mocked.reschedule.mockResolvedValue({
      id: "a1",
      tenant_id: "t1",
      lead_id: "lead-1",
      scheduled_at: "2026-08-11T10:00:00.000Z",
      timezone: "America/Mexico_City",
      status: "scheduled",
      meeting_url: null,
      notes: null,
      created_at: "2026-08-01T00:00:00Z",
      external_event_id: null,
    } as any);
    mocked.cancel.mockResolvedValue({
      id: "a1",
      tenant_id: "t1",
      lead_id: "lead-1",
      scheduled_at: "2026-08-11T10:00:00.000Z",
      timezone: "America/Mexico_City",
      status: "cancelled",
      meeting_url: null,
      notes: null,
      created_at: "2026-08-01T00:00:00Z",
      external_event_id: null,
    } as any);
    const provider = makeProvider();
    const rescheduled = await provider.reschedule("a1", "2026-08-11T10:00:00.000Z");
    expect(rescheduled.scheduled_at).toContain("2026-08-11");
    const cancelled = await provider.cancel("a1");
    expect(cancelled.status).toBe("cancelled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendar/providers/supabase-calendar.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write the types**

```ts
// src/lib/calendar/types.ts
export interface CalendarSlot {
  start: string; // ISO
  end: string; // ISO
  available: boolean;
}

export interface GetAvailabilityInput {
  from: string; // ISO
  to: string; // ISO
  timezone?: string;
  durationMinutes?: number;
}

export interface CreateAppointmentInput {
  scheduledAt: string; // ISO
  timezone?: string;
  notes?: string;
  externalEventId?: string;
}

export interface CalendarProvider {
  readonly name: string;
  getAvailability(input: GetAvailabilityInput): Promise<CalendarSlot[]>;
  createAppointment(input: CreateAppointmentInput): Promise<{
    id: string;
    scheduled_at: string;
    timezone: string;
    status: string;
  }>;
  reschedule(
    appointmentId: string,
    scheduledAt: string
  ): Promise<{
    id: string;
    scheduled_at: string;
    status: string;
  }>;
  cancel(appointmentId: string): Promise<{
    id: string;
    scheduled_at: string;
    status: string;
  }>;
}
```

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/calendar/providers/supabase-calendar.ts
import { ToolError } from "@/core/types/tool";
import {
  cancelAppointmentRow,
  createAppointmentRow,
  listAppointmentsInRange,
  rescheduleAppointmentRow,
} from "@/lib/db";
import type {
  CalendarProvider,
  CalendarSlot,
  CreateAppointmentInput,
  GetAvailabilityInput,
} from "../types";

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function buildSlots(
  fromIso: string,
  toIso: string,
  durationMinutes: number,
  booked: { scheduled_at: string }[]
): CalendarSlot[] {
  const slots: CalendarSlot[] = [];
  const stepMs = durationMinutes * 60_000;
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const bookedTimes = booked.map((b) => new Date(b.scheduled_at).getTime());

  for (let t = from; t < to; t += stepMs) {
    const slotStart = t;
    const slotEnd = t + stepMs;
    const isBooked = bookedTimes.some((bStart) =>
      overlaps(slotStart, slotEnd, bStart, bStart + stepMs)
    );
    slots.push({
      start: new Date(slotStart).toISOString(),
      end: new Date(slotEnd).toISOString(),
      available: !isBooked,
    });
  }
  return slots;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export class SupabaseCalendarProvider implements CalendarProvider {
  readonly name = "supabase";

  constructor(private readonly scope: { tenantId: string; leadId: string }) {}

  async getAvailability(input: GetAvailabilityInput): Promise<CalendarSlot[]> {
    if (input.timezone && !isValidTimezone(input.timezone)) {
      throw new ToolError("INVALID", `Zona horaria inválida: ${input.timezone}`);
    }
    const durationMinutes = input.durationMinutes ?? 60;
    const appointments = await listAppointmentsInRange(input.from, input.to);
    const active = appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed");
    return buildSlots(input.from, input.to, durationMinutes, active);
  }

  async createAppointment(input: CreateAppointmentInput) {
    const timezone = input.timezone ?? "UTC";
    if (!isValidTimezone(timezone)) {
      throw new ToolError("INVALID", `Zona horaria inválida: ${timezone}`);
    }

    const target = new Date(input.scheduledAt).getTime();
    const windowStart = new Date(target - 60 * 60_000).toISOString();
    const windowEnd = new Date(target + 60 * 60_000).toISOString();
    const existing = await listAppointmentsInRange(windowStart, windowEnd);
    const active = existing.filter((a) => a.status === "scheduled" || a.status === "confirmed");

    const targetEnd = target + 60 * 60_000;
    for (const appt of active) {
      const apptStart = new Date(appt.scheduled_at).getTime();
      if (overlaps(target, targetEnd, apptStart, apptStart + 60 * 60_000)) {
        throw new ToolError("DUPLICATE", `Ya existe una cita en ese horario (doble reserva)`);
      }
    }

    const created = await createAppointmentRow({
      leadId: this.scope.leadId,
      scheduledAt: input.scheduledAt,
      timezone,
      notes: input.notes,
      externalEventId: input.externalEventId,
    });

    return {
      id: created.id,
      scheduled_at: created.scheduled_at,
      timezone: created.timezone,
      status: created.status,
    };
  }

  async reschedule(appointmentId: string, scheduledAt: string) {
    const updated = await rescheduleAppointmentRow(appointmentId, scheduledAt);
    return { id: updated.id, scheduled_at: updated.scheduled_at, status: updated.status };
  }

  async cancel(appointmentId: string) {
    const updated = await cancelAppointmentRow(appointmentId);
    return { id: updated.id, scheduled_at: updated.scheduled_at, status: updated.status };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/calendar/providers/supabase-calendar.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS (verificar que `Appointment` tipo tenga `timezone` — lo añadimos en Task 3)

Run: `npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/calendar/types.ts src/lib/calendar/providers/supabase-calendar.ts src/lib/calendar/providers/supabase-calendar.test.ts
git commit -m "feat(calendar): add CalendarProvider interface and Supabase MVP with timezone and double-booking validation"
```

---

### Task 5: Adaptadores Calendar preparados (Google Calendar + Cal.com) pluggables sin tocar Agent Core

**Files:**

- Create: `src/lib/calendar/providers/google-calendar.ts`
- Create: `src/lib/calendar/providers/cal-com.ts`
- Test: `src/lib/calendar/providers/adapters.test.ts`

**Interfaces:**

- Consumes: `CalendarProvider`, `GetAvailabilityInput`, `CreateAppointmentInput` from `../types`; `ToolError` from `@/core/types/tool`
- Produces: `GoogleCalendarProvider`, `CalComProvider` — ambos implementan `CalendarProvider` y se pueden intercambiar sin modificar Agent Core

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/calendar/providers/adapters.test.ts
import { describe, it, expect } from "vitest";
import { GoogleCalendarProvider } from "./google-calendar";
import { CalComProvider } from "./cal-com";
import type { CalendarProvider } from "../types";

describe("calendar adapters are pluggable", () => {
  it("GoogleCalendarProvider implements CalendarProvider contract", () => {
    const provider: CalendarProvider = new GoogleCalendarProvider({
      apiKey: "test",
      calendarId: "primary",
    });
    expect(provider.name).toBe("google-calendar");
    expect(typeof provider.getAvailability).toBe("function");
    expect(typeof provider.createAppointment).toBe("function");
    expect(typeof provider.reschedule).toBe("function");
    expect(typeof provider.cancel).toBe("function");
  });

  it("CalComProvider implements CalendarProvider contract", () => {
    const provider: CalendarProvider = new CalComProvider({
      apiKey: "test",
      eventTypeId: 1,
      baseUrl: "https://api.cal.com/v1",
    });
    expect(provider.name).toBe("calcom");
    expect(typeof provider.getAvailability).toBe("function");
    expect(typeof provider.createAppointment).toBe("function");
    expect(typeof provider.reschedule).toBe("function");
    expect(typeof provider.cancel).toBe("function");
  });

  it("GoogleCalendarProvider throws FAILURE when not configured", async () => {
    const provider = new GoogleCalendarProvider({ apiKey: "", calendarId: "" });
    await expect(
      provider.createAppointment({ scheduledAt: "2026-08-10T10:00:00.000Z", timezone: "UTC" })
    ).rejects.toThrow(/no configurado|configuraci/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/calendar/providers/adapters.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write Google Calendar adapter**

```ts
// src/lib/calendar/providers/google-calendar.ts
import { ToolError } from "@/core/types/tool";
import type {
  CalendarProvider,
  CalendarSlot,
  CreateAppointmentInput,
  GetAvailabilityInput,
} from "../types";

interface GoogleCalendarConfig {
  apiKey: string;
  calendarId: string;
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google-calendar";

  constructor(private readonly config: GoogleCalendarConfig) {}

  private assertConfigured(): void {
    if (!this.config.apiKey || !this.config.calendarId) {
      throw new ToolError(
        "FAILURE",
        "Google Calendar no configurado. Añade GOOGLE_CALENDAR_API_KEY y GOOGLE_CALENDAR_ID en .env.local"
      );
    }
  }

  async getAvailability(_input: GetAvailabilityInput): Promise<CalendarSlot[]> {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async createAppointment(_input: CreateAppointmentInput) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async reschedule(_appointmentId: string, _scheduledAt: string) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async cancel(_appointmentId: string) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }
}
```

- [ ] **Step 4: Write Cal.com adapter**

```ts
// src/lib/calendar/providers/cal-com.ts
import { ToolError } from "@/core/types/tool";
import type {
  CalendarProvider,
  CalendarSlot,
  CreateAppointmentInput,
  GetAvailabilityInput,
} from "../types";

interface CalComConfig {
  apiKey: string;
  eventTypeId: number;
  baseUrl?: string;
}

export class CalComProvider implements CalendarProvider {
  readonly name = "calcom";

  constructor(private readonly config: CalComConfig) {}

  private assertConfigured(): void {
    if (!this.config.apiKey || !this.config.eventTypeId) {
      throw new ToolError(
        "FAILURE",
        "Cal.com no configurado. Añade CALCOM_API_KEY y CALCOM_EVENT_TYPE_ID en .env.local"
      );
    }
  }

  async getAvailability(_input: GetAvailabilityInput): Promise<CalendarSlot[]> {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }

  async createAppointment(_input: CreateAppointmentInput) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }

  async reschedule(_appointmentId: string, _scheduledAt: string) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }

  async cancel(_appointmentId: string) {
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/calendar/providers/adapters.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/calendar/providers/google-calendar.ts src/lib/calendar/providers/cal-com.ts src/lib/calendar/providers/adapters.test.ts
git commit -m "feat(calendar): add Google Calendar and Cal.com adapters (pluggable, no Agent Core changes)"
```

---

### Task 6: Herramientas de datos (searchKnowledge, getContact, updateContact, createLead, updateLead, createFollowUp)

**Files:**

- Create: `src/lib/tools/data-tools.ts`
- Test: `src/lib/tools/data-tools.test.ts`

**Interfaces:**

- Consumes: `runTool` from `./executor`; `ToolSpec` from `@/core/types/tool`; `retrieveContext` from `@/lib/rag/retrieval`; `listContacts`, `upsertContact`, `createLeadRow`, `updateLeadRow`, `createFollowUp` from `@/lib/db`
- Produces: `dataToolSpecs: ToolSpec[]` — `searchKnowledge`, `getContact`, `updateContact`, `createLead`, `updateLead`, `createFollowUp`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tools/data-tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { dataToolSpecs } from "./data-tools";
import { runTool } from "./executor";
import type { ToolExecutionContext } from "@/core/types/tool";

vi.mock("@/lib/rag/retrieval", () => ({ retrieveContext: vi.fn() }));
vi.mock("@/lib/db", () => ({
  listContacts: vi.fn(),
  upsertContact: vi.fn(),
  createLeadRow: vi.fn(),
  updateLeadRow: vi.fn(),
  createFollowUp: vi.fn(),
}));

import { retrieveContext } from "@/lib/rag/retrieval";
import {
  listContacts,
  upsertContact,
  createLeadRow,
  updateLeadRow,
  createFollowUp,
} from "@/lib/db";

const ctx: ToolExecutionContext = {
  tenantId: "t1",
  conversationId: "c1",
  actor: "5215555555",
  permissions: [],
};

function findSpec(name: string) {
  const spec = dataToolSpecs.find((s) => s.name === name);
  if (!spec) throw new Error(`spec ${name} not found`);
  return spec;
}

function makeDeps() {
  return {
    idempotencyStore: {
      has: vi.fn().mockResolvedValue(false),
      set: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("data tools", () => {
  it("searchKnowledge returns retrieved context", async () => {
    vi.mocked(retrieveContext).mockResolvedValue("Crema facial 25€.");
    const spec = findSpec("searchKnowledge");
    const result = await runTool(spec, { query: "precio crema" }, ctx, {});
    expect(result.status).toBe("VALID");
    expect(result.data?.context).toContain("25€");
  });

  it("searchKnowledge returns INVALID without query", async () => {
    const spec = findSpec("searchKnowledge");
    const result = await runTool(spec, {}, ctx, {});
    expect(result.status).toBe("INVALID");
  });

  it("getContact returns contact data", async () => {
    vi.mocked(listContacts).mockResolvedValue([
      { id: "ct1", phone: "5215555555", name: "Ana", email: null, metadata: {} } as any,
    ]);
    const spec = findSpec("getContact");
    const result = await runTool(spec, { phone: "5215555555" }, ctx, {});
    expect(result.status).toBe("VALID");
    expect(result.data?.contact).toBeTruthy();
  });

  it("updateContact upserts and returns the contact", async () => {
    vi.mocked(upsertContact).mockResolvedValue({
      id: "ct1",
      phone: "5215555555",
      name: "Ana",
      email: "ana@x.com",
      metadata: {},
    } as any);
    const spec = findSpec("updateContact");
    const result = await runTool(
      spec,
      { phone: "5215555555", name: "Ana", email: "ana@x.com" },
      ctx,
      makeDeps()
    );
    expect(result.status).toBe("VALID");
    expect(upsertContact).toHaveBeenCalled();
  });

  it("createLead creates a lead for a contact", async () => {
    vi.mocked(createLeadRow).mockResolvedValue({
      id: "lead1",
      tenant_id: "t1",
      contact_id: "ct1",
      score: 8,
      status: "qualified",
      criteria: {},
      created_at: "2026-08-01T00:00:00Z",
    } as any);
    const spec = findSpec("createLead");
    const result = await runTool(
      spec,
      { contactId: "ct1", score: 8, status: "qualified" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(result.data?.lead?.id).toBe("lead1");
  });

  it("updateLead updates score and status", async () => {
    vi.mocked(updateLeadRow).mockResolvedValue({
      id: "lead1",
      tenant_id: "t1",
      contact_id: "ct1",
      score: 9,
      status: "converted",
      criteria: {},
      created_at: "2026-08-01T00:00:00Z",
    } as any);
    const spec = findSpec("updateLead");
    const result = await runTool(spec, { leadId: "lead1", score: 9, status: "converted" }, ctx, {});
    expect(result.status).toBe("VALID");
    expect(updateLeadRow).toHaveBeenCalledWith("lead1", expect.objectContaining({ score: 9 }));
  });

  it("createFollowUp creates a follow-up", async () => {
    vi.mocked(createFollowUp).mockResolvedValue({
      id: "fu1",
      tenant_id: "t1",
      conversation_id: "c1",
      contact_id: null,
      lead_id: "lead1",
      scheduled_at: "2026-08-11T10:00:00Z",
      status: "pending",
      note: "llamar",
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    } as any);
    const spec = findSpec("createFollowUp");
    const result = await runTool(
      spec,
      { scheduledAt: "2026-08-11T10:00:00Z", note: "llamar" },
      ctx,
      makeDeps()
    );
    expect(result.status).toBe("VALID");
    expect(createFollowUp).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tools/data-tools.test.ts`
Expected: FAIL with "Cannot find module './data-tools'"

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/tools/data-tools.ts
import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import { retrieveContext } from "@/lib/rag/retrieval";
import {
  createFollowUp,
  createLeadRow,
  listContacts,
  updateLeadRow,
  upsertContact,
} from "@/lib/db";

export const dataToolSpecs: ToolSpec[] = [
  {
    name: "searchKnowledge",
    description:
      "Busca en la base de conocimiento del negocio y devuelve el contexto relevante para responder.",
    inputSchema: z.object({ query: z.string().min(1) }),
    timeoutMs: 10_000,
    maxRetries: 1,
    audit: false,
    async execute(args, ctx) {
      const context = await retrieveContext(ctx.tenantId, String(args.query));
      if (!context || context.trim() === "") {
        return { found: false, context: "" };
      }
      return { found: true, context };
    },
  },
  {
    name: "getContact",
    description: "Busca un contacto por teléfono en el CRM del negocio.",
    inputSchema: z.object({ phone: z.string().min(7) }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: false,
    async execute(args) {
      const contacts = await listContacts();
      const contact = contacts.find((c) => c.phone === args.phone);
      if (!contact) {
        return { found: false, contact: null };
      }
      return { found: true, contact };
    },
  },
  {
    name: "updateContact",
    description:
      "Crea o actualiza un contacto por teléfono con nombre, email y metadatos. Upsert idempotente por teléfono.",
    inputSchema: z.object({
      phone: z.string().min(7),
      name: z.string().optional(),
      email: z.string().email().optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    idempotencyKey: (args) => `contact:${args.phone}:${args.name ?? ""}:${args.email ?? ""}`,
    audit: true,
    async execute(args) {
      const contact = await upsertContact({
        phone: String(args.phone),
        name: args.name as string | undefined,
        email: args.email as string | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      });
      return { contact };
    },
  },
  {
    name: "createLead",
    description: "Registra un lead asociado a un contacto con score y estado inicial.",
    inputSchema: z.object({
      contactId: z.string().min(1),
      score: z.number().int().min(0).max(10).optional(),
      status: z.enum(["new", "qualified", "disqualified", "converted"]).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: true,
    async execute(args) {
      const lead = await createLeadRow({
        contactId: String(args.contactId),
        score: args.score as number | undefined,
        criteria: {},
      });
      if (args.status && args.status !== "new") {
        await updateLeadRow(lead.id, { status: args.status as never });
      }
      return { lead };
    },
  },
  {
    name: "updateLead",
    description: "Actualiza el score, estado o criterios de un lead existente.",
    inputSchema: z.object({
      leadId: z.string().min(1),
      score: z.number().int().min(0).max(10).optional(),
      status: z.enum(["new", "qualified", "disqualified", "converted"]).optional(),
      criteria: z.record(z.unknown()).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: true,
    async execute(args) {
      const lead = await updateLeadRow(String(args.leadId), {
        score: args.score as number | undefined,
        status: args.status as never,
        criteria: args.criteria as Record<string, unknown> | undefined,
      });
      return { lead };
    },
  },
  {
    name: "createFollowUp",
    description:
      "Crea un recordatorio de seguimiento (follow-up) para una fecha futura, independiente de la conversación activa.",
    inputSchema: z.object({
      scheduledAt: z.string().min(1),
      note: z.string().optional(),
      contactId: z.string().optional(),
      leadId: z.string().optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    idempotencyKey: (args, ctx) =>
      `followup:${ctx.conversationId}:${args.scheduledAt}:${args.note ?? ""}`,
    audit: true,
    async execute(args, ctx) {
      const followUp = await createFollowUp({
        conversationId: ctx.conversationId,
        contactId: args.contactId as string | undefined,
        leadId: args.leadId as string | undefined,
        scheduledAt: String(args.scheduledAt),
        note: args.note as string | undefined,
      });
      return { followUp };
    },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tools/data-tools.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tools/data-tools.ts src/lib/tools/data-tools.test.ts
git commit -m "feat(tools): add data tools (searchKnowledge, contact, lead, follow-up) via ToolSpec framework"
```

---

### Task 7: Herramientas de calendario (getAvailability, createAppointment, rescheduleAppointment, cancelAppointment)

**Files:**

- Create: `src/lib/tools/calendar-tools.ts`
- Test: `src/lib/tools/calendar-tools.test.ts`

**Interfaces:**

- Consumes: `runTool` from `./executor`; `ToolSpec` from `@/core/types/tool`; `CalendarProvider` from `@/lib/calendar/types`
- Produces: `calendarToolSpecs(calendar: CalendarProvider): ToolSpec[]` — factory que recibe el provider (inyección de dependencias)

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tools/calendar-tools.test.ts
import { describe, it, expect, vi } from "vitest";
import { calendarToolSpecs } from "./calendar-tools";
import { runTool } from "./executor";
import type { CalendarProvider } from "@/lib/calendar/types";
import type { ToolExecutionContext } from "@/core/types/tool";

const ctx: ToolExecutionContext = {
  tenantId: "t1",
  conversationId: "c1",
  actor: "5215555555",
  permissions: [],
};

function makeCalendar(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    name: "mock",
    getAvailability: vi
      .fn()
      .mockResolvedValue([
        { start: "2026-08-10T09:00:00.000Z", end: "2026-08-10T10:00:00.000Z", available: true },
      ]),
    createAppointment: vi.fn().mockResolvedValue({
      id: "a1",
      scheduled_at: "2026-08-10T10:00:00.000Z",
      timezone: "UTC",
      status: "scheduled",
    }),
    reschedule: vi.fn().mockResolvedValue({
      id: "a1",
      scheduled_at: "2026-08-11T10:00:00.000Z",
      status: "scheduled",
    }),
    cancel: vi.fn().mockResolvedValue({
      id: "a1",
      scheduled_at: "2026-08-11T10:00:00.000Z",
      status: "cancelled",
    }),
    ...overrides,
  };
}

function findSpec(calendar: CalendarProvider, name: string) {
  const spec = calendarToolSpecs(calendar).find((s) => s.name === name);
  if (!spec) throw new Error(`spec ${name} not found`);
  return spec;
}

describe("calendar tools", () => {
  it("getAvailability returns slots", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "getAvailability");
    const result = await runTool(
      spec,
      { from: "2026-08-10T09:00:00Z", to: "2026-08-10T10:00:00Z", timezone: "America/Mexico_City" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(result.data?.slots?.length).toBeGreaterThan(0);
  });

  it("createAppointment creates via calendar provider", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "createAppointment");
    const result = await runTool(
      spec,
      { scheduledAt: "2026-08-10T10:00:00Z", timezone: "America/Mexico_City" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(result.data?.appointment?.id).toBe("a1");
  });

  it("rescheduleAppointment reschedules", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "rescheduleAppointment");
    const result = await runTool(
      spec,
      { appointmentId: "a1", scheduledAt: "2026-08-11T10:00:00Z" },
      ctx,
      {}
    );
    expect(result.status).toBe("VALID");
    expect(result.data?.appointment?.scheduled_at).toContain("2026-08-11");
  });

  it("cancelAppointment cancels", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "cancelAppointment");
    const result = await runTool(spec, { appointmentId: "a1" }, ctx, {});
    expect(result.status).toBe("VALID");
    expect(result.data?.appointment?.status).toBe("cancelled");
  });

  it("createAppointment returns INVALID without scheduledAt", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "createAppointment");
    const result = await runTool(spec, {}, ctx, {});
    expect(result.status).toBe("INVALID");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tools/calendar-tools.test.ts`
Expected: FAIL with "Cannot find module './calendar-tools'"

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/tools/calendar-tools.ts
import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import type { CalendarProvider } from "@/lib/calendar/types";

export function calendarToolSpecs(calendar: CalendarProvider): ToolSpec[] {
  return [
    {
      name: "getAvailability",
      description: "Devuelve los horarios disponibles del calendario para un rango de fechas.",
      inputSchema: z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        timezone: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: false,
      async execute(args) {
        const slots = await calendar.getAvailability({
          from: String(args.from),
          to: String(args.to),
          timezone: args.timezone as string | undefined,
          durationMinutes: args.durationMinutes as number | undefined,
        });
        return { slots };
      },
    },
    {
      name: "createAppointment",
      description: "Crea una cita en el calendario validando timezone y evitando doble reserva.",
      inputSchema: z.object({
        scheduledAt: z.string().min(1),
        timezone: z.string().optional(),
        notes: z.string().optional(),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      idempotencyKey: (args, ctx) => `appt:${ctx.conversationId}:${args.scheduledAt}`,
      audit: true,
      async execute(args) {
        const appointment = await calendar.createAppointment({
          scheduledAt: String(args.scheduledAt),
          timezone: args.timezone as string | undefined,
          notes: args.notes as string | undefined,
        });
        return { appointment };
      },
    },
    {
      name: "rescheduleAppointment",
      description: "Reagenda una cita existente a una nueva fecha.",
      inputSchema: z.object({
        appointmentId: z.string().min(1),
        scheduledAt: z.string().min(1),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: true,
      async execute(args) {
        const appointment = await calendar.reschedule(
          String(args.appointmentId),
          String(args.scheduledAt)
        );
        return { appointment };
      },
    },
    {
      name: "cancelAppointment",
      description: "Cancela una cita existente.",
      inputSchema: z.object({
        appointmentId: z.string().min(1),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: true,
      async execute(args) {
        const appointment = await calendar.cancel(String(args.appointmentId));
        return { appointment };
      },
    },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tools/calendar-tools.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/tools/calendar-tools.ts src/lib/tools/calendar-tools.test.ts
git commit -m "feat(tools): add calendar tools (availability, create, reschedule, cancel) via injected CalendarProvider"
```

---

### Task 8: transferToHuman + registro de todas las tools en el registry

**Files:**

- Create: `src/lib/tools/registry.ts`
- Create: `src/lib/tools/transfer-to-human.ts`
- Modify: `src/lib/tools/index.ts` (registrar las nuevas tools en toolDefinitions y el nuevo executeTool)
- Test: `src/lib/tools/registry.test.ts`

**Interfaces:**

- Consumes: `ToolSpec`, `ToolExecutionContext`, `ToolExecutionResult`, `ToolExecutorDeps` from `@/core/types/tool`; `runTool` from `./executor`; `dataToolSpecs` from `./data-tools`; `calendarToolSpecs` from `./calendar-tools`; `setMode` from `@/lib/db`; `ToolDefinition` from `./index`
- Produces: `buildToolDefinition(spec): ToolDefinition` (convierte spec zod a formato OpenAI), `ToolRegistry` class con `register`, `definitions()`, `run(name, args, ctx, deps)`, `buildRegistry(calendar)` singleton factory

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tools/registry.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildToolDefinition, buildRegistry } from "./registry";
import { runTool } from "./executor";
import type { CalendarProvider } from "@/lib/calendar/types";
import type { ToolExecutionContext } from "@/core/types/tool";

vi.mock("@/lib/rag/retrieval", () => ({ retrieveContext: vi.fn().mockResolvedValue("ctx") }));
vi.mock("@/lib/db", () => ({
  listContacts: vi.fn().mockResolvedValue([]),
  upsertContact: vi.fn(),
  createLeadRow: vi.fn(),
  updateLeadRow: vi.fn(),
  createFollowUp: vi.fn(),
  setMode: vi.fn(),
}));

function makeCalendar(): CalendarProvider {
  return {
    name: "mock",
    getAvailability: vi.fn().mockResolvedValue([]),
    createAppointment: vi
      .fn()
      .mockResolvedValue({ id: "a1", scheduled_at: "x", timezone: "UTC", status: "scheduled" }),
    reschedule: vi.fn().mockResolvedValue({ id: "a1", scheduled_at: "x", status: "scheduled" }),
    cancel: vi.fn().mockResolvedValue({ id: "a1", scheduled_at: "x", status: "cancelled" }),
  };
}

const ctx: ToolExecutionContext = {
  tenantId: "t1",
  conversationId: "c1",
  actor: "5215555555",
  permissions: [],
};

describe("tool registry", () => {
  it("buildToolDefinition converts a spec into OpenAI format", () => {
    const registry = buildRegistry(makeCalendar());
    const defs = registry.definitions();
    const search = defs.find((d) => d.function.name === "searchKnowledge");
    expect(search).toBeTruthy();
    expect(search!.function.parameters.type).toBe("object");
  });

  it("registry contains all data + calendar + transfer tools", () => {
    const registry = buildRegistry(makeCalendar());
    const names = registry.definitions().map((d) => d.function.name);
    const expected = [
      "searchKnowledge",
      "getContact",
      "updateContact",
      "createLead",
      "updateLead",
      "createFollowUp",
      "getAvailability",
      "createAppointment",
      "rescheduleAppointment",
      "cancelAppointment",
      "transferToHuman",
    ];
    for (const name of expected) {
      expect(names).toContain(name);
    }
  });

  it("registry.run executes transferToHuman via setMode", async () => {
    const registry = buildRegistry(makeCalendar());
    const result = await registry.run("transferToHuman", { razon: "queja" }, ctx, {});
    expect(result.status).toBe("VALID");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tools/registry.test.ts`
Expected: FAIL with "Cannot find module './registry'"

- [ ] **Step 3: Write transfer-to-human spec**

```ts
// src/lib/tools/transfer-to-human.ts
import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import { setMode } from "@/lib/db";

export const transferToHumanSpec: ToolSpec = {
  name: "transferToHuman",
  description:
    "Cambia la conversación a modo HUMAN. Úsala cuando el lead pida algo que no puedes resolver: precios específicos, casos raros, quejas o peticiones fuera del scope. La conversación queda silenciada para el bot.",
  inputSchema: z.object({ razon: z.string().min(1) }),
  timeoutMs: 8_000,
  maxRetries: 1,
  audit: true,
  async execute(args, ctx) {
    await setMode(ctx.conversationId, "HUMAN");
    return {
      ok: true,
      message: `Conversación derivada a HUMAN. Razón: ${args.razon}`,
      instruccion:
        "Responde al usuario: 'Voy a derivarte con un compañero. Te responderá lo antes posible.' No respondas más en esta conversación.",
    };
  },
};
```

- [ ] **Step 4: Write the registry**

```ts
// src/lib/tools/registry.ts
import { z } from "zod";
import type {
  ToolExecutionContext,
  ToolExecutionResult,
  ToolExecutorDeps,
  ToolSpec,
} from "@/core/types/tool";
import type { CalendarProvider } from "@/lib/calendar/types";
import type { ToolDefinition } from "./index";
import { runTool } from "./executor";
import { dataToolSpecs } from "./data-tools";
import { calendarToolSpecs } from "./calendar-tools";
import { transferToHumanSpec } from "./transfer-to-human";

export function buildToolDefinition(spec: ToolSpec): ToolDefinition {
  return {
    type: "function",
    function: {
      name: spec.name,
      description: spec.description,
      parameters: z.toJSONSchema(spec.inputSchema) as ToolDefinition["function"]["parameters"],
    },
  };
}

export class ToolRegistry {
  private readonly specs = new Map<string, ToolSpec>();

  constructor(initial: ToolSpec[] = []) {
    for (const spec of initial) this.specs.set(spec.name, spec);
  }

  register(spec: ToolSpec): void {
    this.specs.set(spec.name, spec);
  }

  definitions(): ToolDefinition[] {
    return [...this.specs.values()].map(buildToolDefinition);
  }

  async run(
    name: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
    deps: ToolExecutorDeps = {}
  ): Promise<ToolExecutionResult> {
    const spec = this.specs.get(name);
    if (!spec) {
      return { status: "FAILURE", ok: false, error: `Tool desconocida: ${name}` };
    }
    return runTool(spec, args, ctx, deps);
  }
}

export function buildRegistry(calendar: CalendarProvider): ToolRegistry {
  const registry = new ToolRegistry();
  for (const spec of dataToolSpecs) registry.register(spec);
  for (const spec of calendarToolSpecs(calendar)) registry.register(spec);
  registry.register(transferToHumanSpec);
  return registry;
}
```

- [ ] **Step 5: Wire into tools/index.ts (merge legacy + registry)**

> **CORRECCIÓN del plan (aprobada por el humano):** el registry no sustituye a las tools legacy. `toolDefinitions` debe ser la concatenación de las definitions legacy (`guardarLead`, `calificar`, `agendar`, `derivarHumano`) más las del registry, y `executeTool` debe despachar primero a los handlers legacy y, si no existe, al registry. Así se cumple Step 9 (no romper el handler).

Editar `src/lib/tools/index.ts` para que quede así (reemplaza la sección actual de `toolDefinitions`/`executeTool`; los imports legacy existentes y el tipo `ToolDefinition`/`ToolHandler` se conservan):

```ts
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
```

- [ ] **Step 6: Write the infra (idempotency store + audit sink sobre Supabase)**

```ts
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
      resourceId: entry.resourceId,
      details: entry.details,
    });
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/lib/tools/registry.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 8: Run typecheck and full suite**

Run: `npm run typecheck`
Expected: PASS (ajustar tipos de `parameters` si `z.toJSONSchema` difiere)

Run: `npm run test`
Expected: PASS

- [ ] **Step 9: Verify existing tools still resolve**

Ejecutar un chequeo rápido de que las tools legacy (`guardarLead`, `calificar`, `agendar`, `derivarHumano`) se mantienen en `toolDefinitions` para no romper el handler:

```bash
npx tsx -e "const {toolDefinitions}=await import('./src/lib/tools/index.ts'); console.log(toolDefinitions.map(d=>d.function.name).join(','));"
```

Expected: imprime lista incluyendo `guardarLead`, `calificar`, `agendar`, `derivarHumano` + las 11 nuevas.

- [ ] **Step 10: Commit**

```bash
git add src/lib/tools/registry.ts src/lib/tools/transfer-to-human.ts src/lib/tools/registry.test.ts src/lib/tools/infra.ts src/lib/tools/index.ts
git commit -m "feat(tools): add tool registry, transferToHuman and wire all tools into the default registry"
```

---

### Task 9: Checkpoint fase 07 + actualizar AI-BOS-STATE.md

**Files:**

- Create: `docs/admin/checkpoints/phase-07.md`
- Modify: `AI-BOS-STATE.md`

**Interfaces:**

- Consumes: resultados de tasks 1-8 (tests, archivos, commits)

- [ ] **Step 1: Run full validation**

Run: `npm run typecheck`
Expected: PASS, 0 errores

Run: `npm run test`
Expected: PASS (conteo final de archivos y tests)

Run: `docker compose -f docker-compose.local.yml up -d --build`
Expected: imagen construida y bot conectado como 5215664436277

- [ ] **Step 2: Write checkpoint doc**

Crear `docs/admin/checkpoints/phase-07.md` con el mismo formato que `phase-06.md`:

- `phase: "PHASE 07"`, `status: "COMPLETED"`
- `implemented`: framework de tools (executor con VALID/INVALID/UNAUTHORIZED/TIMEOUT/FAILURE/DUPLICATE), CalendarProvider (Supabase MVP + adaptadores Google/Cal.com), tools de datos y calendario, transferToHuman, migración 007, idempotencia y auditoría
- `files_created`: todos los archivos nuevos
- `files_modified`: `src/core/types/database.ts`, `src/lib/db.ts`, `src/lib/tools/index.ts`
- `database_changes`: tablas `follow_ups`, `tool_executions`, `appointments.timezone`, `appointments.external_event_id`
- `tests`: ejecutados y pasados (conteo real)
- `validation`: typecheck + suite + bot en vivo
- `evidence`: comandos y salidas
- `known_issues`: adaptadores Google/Cal.com en preparación (stubs), `SupabaseCalendarProvider` usa `leadId: "unknown"` como fallback hasta que se conecte con el lead real
- `risks`: R-009 (adaptadores externos pendientes de credenciales), R-010 (leadId fallback)
- `ready_for_next_phase: true`, `human_approval_required: true`

- [ ] **Step 3: Update AI-BOS-STATE.md**

- `execution.current_phase: "07"`, `last_completed_phase: "07"`, `status: "PHASE_07_COMPLETED"`, añadir `"07"` a `phases_completed`
- `validation.last_validated_phase: "07"`, `total_tests_executed/passed` actualizados
- `approval.approved_phase: "07"`
- `next_action: "Phase 08: Omnichannel"`
- Tabla de fases: fila 07 → COMPLETED
- `artifacts.phase_07`: listar archivos
- `statistics`: `phases_completed: 8`, `phases_pending: 7`, `completion_percentage: 53.3`, `risks_identified`/`risks_open` actualizados

- [ ] **Step 4: Commit**

```bash
git add docs/admin/checkpoints/phase-07.md AI-BOS-STATE.md
git commit -m "docs(phase-07): add Tools + Calendar checkpoint and update project state"
```

---

## Self-Review

**1. Spec coverage:**

- Interfaces abstractas para tools → Task 1 (ToolSpec) + Task 2 (executor). ✅
- Validación input/permisos/errores/timeout/retry/idempotencia/auditoría → Task 2 + deps en Task 8 (infra.ts). ✅
- Crear CalendarProvider → Task 4. ✅
- Adaptadores Google Calendar + Cal.com preparados → Task 5. ✅
- Implementar solo el proveedor MVP → Task 4 (SupabaseCalendarProvider) + Task 5 (stubs). ✅
- Segundo proveedor sin modificar Agent Core → Task 5 + Task 8 (registry inyecta CalendarProvider; Agent Core no se toca). ✅
- Probar VALID/INVALID/UNAUTHORIZED/TIMEOUT/FAILURE/DUPLICATE → Task 2 tests. ✅
- Validar timezone y doble reserva → Task 4 tests. ✅
- Tools iniciales (11) → Task 6, 7, 8. ✅
- Generar CHECKPOINT → Task 9. ✅
- Actualizar AI-BOS-STATE.md → Task 9. ✅

**2. Placeholder scan:** Todo paso tiene código o comando concreto. El plan no contiene "TBD" ni "implement later".

**3. Type consistency:**

- `ToolSpec.inputSchema` es `z.ZodTypeAny` → `z.toJSONSchema` se usa en Task 8. ✅
- `runTool` firma `(spec, rawArgs, ctx, deps)` consistente en Tasks 2, 6, 7, 8. ✅
- `CalendarProvider` interface idéntica en Tasks 4, 5, 7, 8. ✅
- `ToolDefinition` importado desde `./index` en registry.ts — el tipo ya existe en `src/lib/tools/index.ts`. ✅
- `SupabaseCalendarProvider` constructor `{ tenantId, leadId }` consistente en Task 4 y Task 8. ✅
- `z.record(z.unknown())` y `z.enum([...])` son API de zod v4 (instalado 4.4.3). ✅
