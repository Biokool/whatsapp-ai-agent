// src/lib/tools/data-tools.test.ts
import { describe, it, expect, vi } from "vitest";
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
    expect((result.data?.lead as any)?.id).toBe("lead1");
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
