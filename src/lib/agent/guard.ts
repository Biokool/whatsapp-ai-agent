import type { AgentContext, IntentType } from "@/core/types/agent";

// Patrones que indican intento de manipulación del system prompt.
const INJECTION_PATTERNS: RegExp[] = [
  /ignora\s+(tus|las)\s+(instrucciones|indicaciones|reglas|prompt)/i,
  /a\s+partir\s+de\s+ahora\s+eres\s+un\s+sistema/i,
  /eres\s+un\s+sistema\s+abierto/i,
  /responde\s+sin\s+restricciones/i,
  /actúa\s+como\s+si\s+fueras/i,
  /dime\s+(tus\s+)?secretos/i,
  /muéstrame\s+(tus\s+)?(instrucciones|prompt)/i,
];

export function detectPromptInjection(input: string): boolean {
  const text = input.toLowerCase();
  return INJECTION_PATTERNS.some((p) => p.test(text));
}

export function evaluateIntent(ctx: AgentContext): IntentType {
  const lastUser = [...ctx.history].reverse().find((m) => m.role === "user");
  const query = lastUser?.content ?? "";

  if (detectPromptInjection(query)) return "prompt_injection";

  const knowledge = `${ctx.businessKnowledge}\n${ctx.ragContext}`.trim().toLowerCase();
  const queryLower = query.toLowerCase();

  const forbiddenTopics = ["hackear", "tatuaje", "arma", "droga", "ilegal", "crackear"];
  if (forbiddenTopics.some((t) => queryLower.includes(t))) return "out_of_scope";

  if (knowledge.length > 0) {
    const knowledgeTokens = new Set(
      knowledge
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase())
        .filter((w) => w.length > 3)
    );
    const queryTokens = new Set(
      queryLower
        .split(/\s+/)
        .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
        .filter((w) => w.length > 3)
    );
    let overlap = 0;
    for (const t of queryTokens) if (knowledgeTokens.has(t)) overlap++;
    if (overlap > 0) {
      // Contradicción: el usuario afirma algo opuesto al knowledge.
      const negations = ["gratis", "no cuesta", "0€", "barato", "no vale"];
      if (negations.some((n) => queryLower.includes(n))) return "contradictory";
      return "known";
    }
  }

  return "unknown";
}
