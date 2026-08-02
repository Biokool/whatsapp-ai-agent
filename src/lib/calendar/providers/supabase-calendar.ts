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
      throw new ToolError("INVALID", `Zona horaria inválida: timezone "${input.timezone}"`);
    }
    const durationMinutes = input.durationMinutes ?? 60;
    const appointments = await listAppointmentsInRange(input.from, input.to);
    const active = appointments.filter((a) => a.status === "scheduled" || a.status === "confirmed");
    return buildSlots(input.from, input.to, durationMinutes, active);
  }

  async createAppointment(input: CreateAppointmentInput) {
    const timezone = input.timezone ?? "UTC";
    if (!isValidTimezone(timezone)) {
      throw new ToolError("INVALID", `Zona horaria inválida: timezone "${timezone}"`);
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
