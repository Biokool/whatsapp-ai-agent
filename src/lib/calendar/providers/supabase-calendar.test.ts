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
