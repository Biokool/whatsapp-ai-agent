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
    void _input;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }

  async createAppointment(
    _input: CreateAppointmentInput
  ): Promise<{ id: string; scheduled_at: string; timezone: string; status: string }> {
    void _input;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
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
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }

  async cancel(
    _appointmentId: string
  ): Promise<{ id: string; scheduled_at: string; status: string }> {
    void _appointmentId;
    this.assertConfigured();
    throw new ToolError(
      "FAILURE",
      "Cal.com adapter en preparación: se integra con la API de Cal.com en una fase posterior"
    );
  }
}
