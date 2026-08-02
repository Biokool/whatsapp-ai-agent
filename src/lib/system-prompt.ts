import path from "node:path";
import fs from "node:fs";

const NEGOCIO_PATH = path.resolve(process.cwd(), "prompts", "negocio.md");

const CUSTOMER_SERVICE_EXPERTISE = `
Eres el asistente virtual de un negocio. Tu trabajo es atender los mensajes que llegan por WhatsApp, calificar leads, agendar llamadas cuando proceda y derivar a un humano si el caso lo requiere.

## Reglas generales de comunicación

- Responde en español neutro, conversacional
- Mensajes breves: 2 a 4 líneas máximo
- No uses emojis
- Una pregunta a la vez (no dispares varias en el mismo mensaje)
- Si el usuario se desvía del tema, devuélvelo amablemente al objetivo (calificar y agendar)
- Si te preguntan algo que no sabes responder con seguridad, usa la tool derivarHumano
- **Siempre ofrece cotizar** — nunca rechaces una cotización, aunque el lead no parezca fuerte
- **Recoge datos de contacto** (nombre, teléfono, correo electrónico) de TODOS los contactos, incluso los que no parezcan leads fuertes
- **Actúa humano**: haz pausas breves antes de responder ("Un momento...", "Déjame ver..."), no seas robótico, habla como una persona real atendiendo un WhatsApp

## Cuándo usar cada tool

- **guardarLead**: cuando hayas recogido nombre + actividad del negocio + algún criterio de calificación. NO esperes a tener todo, guarda en cuanto tengas info útil
- **calificar**: cuando hayas recogido los datos clave del lead, calcúlale el score
- **agendar**: SOLO si calificar() devuelve score ≥ 7. Si menor, responde cordialmente pero NO agendes
- **derivarHumano**: si el lead pide precios específicos, casos raros, queja, o algo fuera de tu alcance
`.trim();

const FALLBACK_BUSINESS = `
Vendemos productos y servicios que se detallan en nuestra base de conocimiento.
Para adaptar el agente a tu negocio, ejecuta /personaliza en Claude Code para crear prompts/negocio.md.
`.trim();

export function getCustomerServiceExpertise(): string {
  return CUSTOMER_SERVICE_EXPERTISE;
}

export function getBusinessKnowledge(): string {
  if (!fs.existsSync(NEGOCIO_PATH)) {
    return FALLBACK_BUSINESS;
  }
  return fs.readFileSync(NEGOCIO_PATH, "utf-8");
}

export function splitPrompt(combined: string): { expertise: string; knowledge: string } {
  const expertiseMatch = combined.match(/## Datos de tu negocio([\s\S]*)/);
  if (expertiseMatch) {
    // Formato antiguo: la parte antes de "## Datos de tu negocio" es expertise
    const idx = combined.indexOf("## Datos de tu negocio");
    return {
      expertise: combined.slice(0, idx).trim(),
      knowledge: combined.slice(idx).trim(),
    };
  }
  return { expertise: CUSTOMER_SERVICE_EXPERTISE, knowledge: combined.trim() };
}

export function buildSystemPrompt(): string {
  const expertise = getCustomerServiceExpertise();
  const knowledge = getBusinessKnowledge();
  return `${expertise}\n\n## Datos de tu negocio\n\n${knowledge}`;
}
