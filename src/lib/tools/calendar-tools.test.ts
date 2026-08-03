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

function makeDeps() {
  return {
    idempotencyStore: {
      has: vi.fn().mockResolvedValue(false),
      set: vi.fn().mockResolvedValue(undefined),
    },
  };
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
    expect((result.data?.slots as any)?.length).toBeGreaterThan(0);
  });

  it("createAppointment creates via calendar provider", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "createAppointment");
    const result = await runTool(
      spec,
      { scheduledAt: "2026-08-10T10:00:00Z", timezone: "America/Mexico_City" },
      ctx,
      makeDeps()
    );
    expect(result.status).toBe("VALID");
    expect((result.data?.appointment as any)?.id).toBe("a1");
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
    expect((result.data?.appointment as any)?.scheduled_at).toContain("2026-08-11");
  });

  it("cancelAppointment cancels", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "cancelAppointment");
    const result = await runTool(spec, { appointmentId: "a1" }, ctx, {});
    expect(result.status).toBe("VALID");
    expect((result.data?.appointment as any)?.status).toBe("cancelled");
  });

  it("createAppointment returns INVALID without scheduledAt", async () => {
    const calendar = makeCalendar();
    const spec = findSpec(calendar, "createAppointment");
    const result = await runTool(spec, {}, ctx, {});
    expect(result.status).toBe("INVALID");
  });
});
