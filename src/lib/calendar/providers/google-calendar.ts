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
    void _input;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async createAppointment(
    _input: CreateAppointmentInput
  ): Promise<{ id: string; scheduled_at: string; timezone: string; status: string }> {
    void _input;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async reschedule(
    _appointmentId: string,
    _scheduledAt: string
  ): Promise<{ id: string; scheduled_at: string; status: string }> {
    void _appointmentId;
    void _scheduledAt;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }

  async cancel(
    _appointmentId: string
  ): Promise<{ id: string; scheduled_at: string; status: string }> {
    void _appointmentId;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Google Calendar adapter en preparación: se integra con la API de Google Calendar en una fase posterior"
    );
  }
}
