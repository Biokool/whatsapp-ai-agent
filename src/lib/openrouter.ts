import OpenAI from "openai";
import { buildSystemPrompt } from "./system-prompt";
import { executeTool } from "./tools";
import { OpenRouterLLMProvider } from "./agent/providers/openrouter-llm";
import type { AgentMessage, LLMCompletion } from "@/core/types/agent";
import type { Message } from "@/core/types/database";

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
  conversationId: string;
  ragContext?: string;
}

export async function generateReply(input: GenerateReplyInput): Promise<string> {
  const systemPrompt = buildSystemPrompt();
  const systemPromptWithRag =
    input.ragContext && input.ragContext.trim().length > 0
      ? `${systemPrompt}\n\nCONEXTO DEL CATÁLOGO Y DOCUMENTACIÓN:\n${input.ragContext}\n\nUsa esta información para responder preguntas sobre productos, servicios, precios y especificaciones técnicas.`
      : systemPrompt;

  const messages: AgentMessage[] = input.history.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const provider = new OpenRouterLLMProvider({
    conversationId: input.conversationId,
    executeTool,
  });

  const completion: LLMCompletion = await provider.complete({
    systemPrompt: systemPromptWithRag,
    messages,
    tools: undefined, // generateReply no expone tools por compatibilidad; el handler de Baileys usa el agente completo
  });

  return completion.content;
}

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
