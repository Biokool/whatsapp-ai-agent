// src/lib/tools/registry.test.ts
import { describe, it, expect, vi } from "vitest";
import { buildRegistry } from "./registry";
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
