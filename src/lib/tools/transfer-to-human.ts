// src/lib/tools/transfer-to-human.ts
import { z } from "zod";
import type { ToolSpec } from "@/core/types/tool";
import { setMode } from "@/lib/db";

export const transferToHumanSpec: ToolSpec = {
  name: "transferToHuman",
  description:
    "Cambia la conversación a modo HUMAN. Úsala cuando el lead pida algo que no puedes resolver: precios específicos, casos raros, quejas o peticiones fuera del scope. La conversación queda silenciada para el bot.",
  inputSchema: z.object({ razon: z.string().min(1) }),
  timeoutMs: 8_000,
  maxRetries: 1,
  audit: true,
  async execute(args, ctx) {
    await setMode(ctx.conversationId, "HUMAN");
    return {
      ok: true,
      message: `Conversación derivada a HUMAN. Razón: ${args.razon}`,
      instruccion:
        "Responde al usuario: 'Voy a derivarte con un compañero. Te responderá lo antes posible.' No respondas más en esta conversación.",
    };
  },
};
