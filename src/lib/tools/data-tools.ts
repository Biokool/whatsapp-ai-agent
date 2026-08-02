// src/lib/tools/data-tools.ts
import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import { retrieveContext } from "@/lib/rag/retrieval";
import {
  createFollowUp,
  createLeadRow,
  listContacts,
  updateLeadRow,
  upsertContact,
} from "@/lib/db";

export const dataToolSpecs: ToolSpec[] = [
  {
    name: "searchKnowledge",
    description:
      "Busca en la base de conocimiento del negocio y devuelve el contexto relevante para responder.",
    inputSchema: z.object({ query: z.string().min(1) }),
    timeoutMs: 10_000,
    maxRetries: 1,
    audit: false,
    async execute(args, ctx) {
      const context = await retrieveContext(ctx.tenantId, String(args.query));
      if (!context || context.trim() === "") {
        return { found: false, context: "" };
      }
      return { found: true, context };
    },
  },
  {
    name: "getContact",
    description: "Busca un contacto por teléfono en el CRM del negocio.",
    inputSchema: z.object({ phone: z.string().min(7) }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: false,
    async execute(args) {
      const contacts = await listContacts();
      const contact = contacts.find((c) => c.phone === args.phone);
      if (!contact) {
        return { found: false, contact: null };
      }
      return { found: true, contact };
    },
  },
  {
    name: "updateContact",
    description:
      "Crea o actualiza un contacto por teléfono con nombre, email y metadatos. Upsert idempotente por teléfono.",
    inputSchema: z.object({
      phone: z.string().min(7),
      name: z.string().optional(),
      email: z.string().email().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    idempotencyKey: (args) => `contact:${args.phone}:${args.name ?? ""}:${args.email ?? ""}`,
    audit: true,
    async execute(args) {
      const contact = await upsertContact({
        phone: String(args.phone),
        name: args.name as string | undefined,
        email: args.email as string | undefined,
        metadata: args.metadata as Record<string, unknown> | undefined,
      });
      return { contact };
    },
  },
  {
    name: "createLead",
    description: "Registra un lead asociado a un contacto con score y estado inicial.",
    inputSchema: z.object({
      contactId: z.string().min(1),
      score: z.number().int().min(0).max(10).optional(),
      status: z.enum(["new", "qualified", "disqualified", "converted"]).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: true,
    async execute(args) {
      const lead = await createLeadRow({
        contactId: String(args.contactId),
        score: args.score as number | undefined,
        criteria: {},
      });
      if (args.status && args.status !== "new") {
        await updateLeadRow(lead.id, { status: args.status as never });
      }
      return { lead };
    },
  },
  {
    name: "updateLead",
    description: "Actualiza el score, estado o criterios de un lead existente.",
    inputSchema: z.object({
      leadId: z.string().min(1),
      score: z.number().int().min(0).max(10).optional(),
      status: z.enum(["new", "qualified", "disqualified", "converted"]).optional(),
      criteria: z.record(z.string(), z.unknown()).optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    audit: true,
    async execute(args) {
      const lead = await updateLeadRow(String(args.leadId), {
        score: args.score as number | undefined,
        status: args.status as never,
        criteria: args.criteria as Record<string, unknown> | undefined,
      });
      return { lead };
    },
  },
  {
    name: "createFollowUp",
    description:
      "Crea un recordatorio de seguimiento (follow-up) para una fecha futura, independiente de la conversación activa.",
    inputSchema: z.object({
      scheduledAt: z.string().min(1),
      note: z.string().optional(),
      contactId: z.string().optional(),
      leadId: z.string().optional(),
    }),
    timeoutMs: 8_000,
    maxRetries: 1,
    idempotencyKey: (args, ctx) =>
      `followup:${ctx.conversationId}:${args.scheduledAt}:${args.note ?? ""}`,
    audit: true,
    async execute(args, ctx) {
      const followUp = await createFollowUp({
        conversationId: ctx.conversationId,
        contactId: args.contactId as string | undefined,
        leadId: args.leadId as string | undefined,
        scheduledAt: String(args.scheduledAt),
        note: args.note as string | undefined,
      });
      return { followUp };
    },
  },
];
