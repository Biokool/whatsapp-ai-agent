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
