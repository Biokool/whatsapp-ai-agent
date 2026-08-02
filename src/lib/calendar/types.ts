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
