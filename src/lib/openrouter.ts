import OpenAI from "openai";
import { buildSystemPrompt } from "./system-prompt";
import { toolDefinitions, executeTool } from "./tools";
import { checkRateLimit } from "./rate-limit";
import type { Message } from "./db";

const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "") {
    throw new Error(
      "OPENROUTER_API_KEY no configurada. Ejecuta /setup en Claude Code o edita .env.local manualmente."
    );
  }
  _client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/divisualproject/whatsapp-ai-agent-kit",
      "X-Title": "WhatsApp AI Agent Kit",
    },
  });
  return _client;
}

interface GenerateReplyInput {
  history: Message[];
  conversationId: number;
}

/**
 * Llama al LLM con el system prompt + el historial reciente.
 * Si el modelo decide ejecutar tools, las ejecuta y vuelve a llamar al LLM con los resultados.
 * Limite de 5 turnos para evitar loops infinitos.
 *
 * Incluye rate limiting por conversación para prevenir costos excesivos.
 */
export async function generateReply(input: GenerateReplyInput): Promise<string> {
  // Check rate limit before making LLM call
  const rateLimit = checkRateLimit(input.conversationId);
  if (!rateLimit.allowed) {
    return `Estoy recibiendo muchas consultas en este momento. Por favor, espera ${rateLimit.retryAfter} segundos antes de继续.`;
  }

  const client = getClient();
  const systemPrompt = buildSystemPrompt();

  // Mapeo de roles: 'human' (mensajes del dashboard) → 'assistant' para el LLM
  // El LLM los ve como sus propias respuestas previas
  const messagesForLLM: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...input.history.map((m): OpenAI.Chat.Completions.ChatCompletionMessageParam => {
      const role: "user" | "assistant" = m.role === "user" ? "user" : "assistant";
      return { role, content: m.content };
    }),
  ];

  const MAX_TURNS = 5;
  let turns = 0;

  while (turns < MAX_TURNS) {
    turns++;

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: messagesForLLM,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.4,
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    // Si NO hay tool calls, devolvemos la respuesta tal cual
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return msg.content ?? "";
    }

    // Si hay tool calls, ejecutarlas y meter los resultados en la conversación
    messagesForLLM.push({
      role: "assistant",
      content: msg.content ?? "",
      tool_calls: msg.tool_calls,
    });

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      const name = call.function.name;
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(call.function.arguments);
      } catch {
        parsed = {};
      }

      const result = await executeTool(name, parsed, {
        conversationId: input.conversationId,
      });

      messagesForLLM.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Si llegamos al límite de turnos sin respuesta, devolvemos algo neutro
  return "Déjame un momento — vuelvo contigo enseguida.";
}

/**
 * Validador para /setup: hace una llamada mínima para comprobar que la API key funciona.
 * Devuelve true si la key es válida, false si no.
 */
export async function validateApiKey(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getClient();
    await client.models.list();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
