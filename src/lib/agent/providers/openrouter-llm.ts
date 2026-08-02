import OpenAI from "openai";
import type { AgentMessage, LLMCompletion, LLMProvider, ToolCall } from "@/core/types/agent";
import type { ToolDefinition } from "@/lib/tools";
import { checkRateLimit } from "@/lib/rate-limit";

const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
const MAX_TURNS = 5;

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

function mapMessages(
  messages: AgentMessage[]
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export class OpenRouterLLMProvider implements LLMProvider {
  constructor(
    private readonly opts: {
      executeTool: (
        name: string,
        args: Record<string, unknown>,
        ctx: { conversationId: string }
      ) => Promise<Record<string, unknown>>;
      conversationId: string;
    }
  ) {}

  async complete(params: {
    systemPrompt: string;
    messages: AgentMessage[];
    tools?: ToolDefinition[];
  }): Promise<LLMCompletion> {
    const rateLimit = checkRateLimit(this.opts.conversationId);
    if (!rateLimit.allowed) {
      return {
        content: `Estoy recibiendo muchas consultas en este momento. Por favor, espera ${rateLimit.retryAfter} segundos antes de continuar.`,
        toolCalls: [],
      };
    }

    const client = getClient();
    const messagesForLLM: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: params.systemPrompt },
      ...mapMessages(params.messages),
    ];

    let turns = 0;
    while (turns < MAX_TURNS) {
      turns++;
      const completion = await client.chat.completions.create({
        model: MODEL,
        messages: messagesForLLM,
        tools: params.tools && params.tools.length > 0 ? params.tools : undefined,
        tool_choice: params.tools && params.tools.length > 0 ? "auto" : undefined,
        temperature: 0.4,
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        return { content: msg.content ?? "", toolCalls: [] };
      }

      const toolCalls: ToolCall[] = msg.tool_calls
        .filter((c) => c.type === "function")
        .map((c) => {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(c.function.arguments ?? "{}");
          } catch {
            args = {};
          }
          return { id: c.id, name: c.function.name, arguments: args };
        });

      messagesForLLM.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls as any,
      });

      for (const call of toolCalls) {
        const result = await this.opts.executeTool(call.name, call.arguments, {
          conversationId: this.opts.conversationId,
        });
        messagesForLLM.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return { content: "Déjame un momento — vuelvo contigo enseguida.", toolCalls: [] };
  }
}
