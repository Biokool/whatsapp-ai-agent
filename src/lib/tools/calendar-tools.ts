import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import type { CalendarProvider } from "@/lib/calendar/types";

export function calendarToolSpecs(calendar: CalendarProvider): ToolSpec[] {
  return [
    {
      name: "getAvailability",
      description: "Devuelve los horarios disponibles del calendario para un rango de fechas.",
      inputSchema: z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        timezone: z.string().optional(),
        durationMinutes: z.number().int().positive().optional(),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: false,
      async execute(args) {
        const slots = await calendar.getAvailability({
          from: String(args.from),
          to: String(args.to),
          timezone: args.timezone as string | undefined,
          durationMinutes: args.durationMinutes as number | undefined,
        });
        return { slots };
      },
    },
    {
      name: "createAppointment",
      description: "Crea una cita en el calendario validando timezone y evitando doble reserva.",
      inputSchema: z.object({
        scheduledAt: z.string().min(1),
        timezone: z.string().optional(),
        notes: z.string().optional(),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      idempotencyKey: (args, ctx) => `appt:${ctx.conversationId}:${args.scheduledAt}`,
      audit: true,
      async execute(args) {
        const appointment = await calendar.createAppointment({
          scheduledAt: String(args.scheduledAt),
          timezone: args.timezone as string | undefined,
          notes: args.notes as string | undefined,
        });
        return { appointment };
      },
    },
    {
      name: "rescheduleAppointment",
      description: "Reagenda una cita existente a una nueva fecha.",
      inputSchema: z.object({
        appointmentId: z.string().min(1),
        scheduledAt: z.string().min(1),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: true,
      async execute(args) {
        const appointment = await calendar.reschedule(
          String(args.appointmentId),
          String(args.scheduledAt)
        );
        return { appointment };
      },
    },
    {
      name: "cancelAppointment",
      description: "Cancela una cita existente.",
      inputSchema: z.object({
        appointmentId: z.string().min(1),
      }),
      timeoutMs: 10_000,
      maxRetries: 1,
      audit: true,
      async execute(args) {
        const appointment = await calendar.cancel(String(args.appointmentId));
        return { appointment };
      },
    },
  ];
}
