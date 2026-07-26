import type { ToolDefinition, ToolHandler } from "./index";

interface CalificarArgs {
  tieneNegocioActivo?: boolean;
  facturaMasDe5kMes?: boolean;
  dolorEncajaConPropuesta?: boolean;
  urgenciaAlta?: boolean;
  presupuestoConfirmado?: boolean;
}

export const calificarDefinition: ToolDefinition = {
  type: "function",
  function: {
    name: "calificar",
    description:
      "Calcula un score 1-10 del lead según los criterios del negocio. Llamar cuando tengas suficiente info recogida. Score >= 7 = lead bueno, procede a agendar. Score < 7 = lead no califica, responde cordialmente sin agendar.",
    parameters: {
      type: "object",
      properties: {
        tieneNegocioActivo: {
          type: "boolean",
          description: "¿El lead tiene negocio activo y operativo?",
        },
        facturaMasDe5kMes: {
          type: "boolean",
          description: "¿Factura más de 5.000 €/mes? (opcional, ajusta según tu nicho)",
        },
        dolorEncajaConPropuesta: {
          type: "boolean",
          description: "¿El dolor que describe el lead encaja con lo que tu negocio resuelve?",
        },
        urgenciaAlta: {
          type: "boolean",
          description: "¿Tiene urgencia alta (quiere empezar ya)?",
        },
        presupuestoConfirmado: {
          type: "boolean",
          description: "¿Ha confirmado que tiene presupuesto?",
        },
      },
    },
  },
};

export const calificarHandler: ToolHandler<CalificarArgs> = async (args) => {
  // TODO: Ajusta los pesos según los criterios reales de tu negocio.
  // Estos son valores por defecto sensatos para un agencia/freelance.
  // Si tu nicho es distinto, edita aquí (o pídele a Claude Code que lo adapte).

  let score = 0;
  if (args.tieneNegocioActivo) score += 3;
  if (args.facturaMasDe5kMes) score += 3;
  if (args.dolorEncajaConPropuesta) score += 2;
  if (args.urgenciaAlta) score += 1;
  if (args.presupuestoConfirmado) score += 1;

  const califica = score >= 7;

  return {
    ok: true,
    score,
    califica,
    mensaje: califica
      ? "Lead cualificado. Procede a agendar llamada."
      : "Lead NO cualificado. Responde cordialmente sin agendar.",
  };
};
