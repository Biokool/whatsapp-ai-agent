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
