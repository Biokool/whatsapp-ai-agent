import type { ToolDefinition, ToolHandler } from "./index";

interface GuardarLeadArgs {
  nombre: string;
  telefono: string;
  negocio?: string;
  facturacion?: string;
  dolor?: string;
}

export const guardarLeadDefinition: ToolDefinition = {
  type: "function",
  function: {
    name: "guardarLead",
    description:
      "Guarda los datos del lead en una hoja de cálculo. Úsala en cuanto tengas al menos el nombre y a qué se dedica. No esperes a tener todo.",
    parameters: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del lead" },
        telefono: {
          type: "string",
          description: "Teléfono del lead (formato internacional)",
        },
        negocio: { type: "string", description: "A qué se dedica" },
        facturacion: { type: "string", description: "Rango de facturación si lo ha dicho" },
        dolor: { type: "string", description: "Dolor o necesidad principal" },
      },
      required: ["nombre", "telefono"],
    },
  },
};

export const guardarLeadHandler: ToolHandler<GuardarLeadArgs> = async (args) => {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl === "") {
    // TODO: Configurar GOOGLE_SHEETS_WEBHOOK_URL en .env.local
    // Guía: docs/04-configurar-tools.md
    // Por ahora, el lead se guarda solo en la base de datos local (conversaciones)
    return {
      ok: false,
      message:
        "Tool no configurada. El admin tiene que añadir GOOGLE_SHEETS_WEBHOOK_URL en .env.local (ver docs/04-configurar-tools.md)",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: args.nombre,
        telefono: args.telefono,
        negocio: args.negocio ?? "",
        facturacion: args.facturacion ?? "",
        dolor: args.dolor ?? "",
        fecha: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return { ok: false, message: `Webhook respondió ${response.status}` };
    }

    return { ok: true, message: "Lead guardado en Google Sheets" };
  } catch (err) {
    return {
      ok: false,
      message: `Error al guardar lead: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
};
