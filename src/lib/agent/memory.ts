import type { AgentMessage, LLMProvider, MemoryProvider } from "@/core/types/agent";
import { getMessages, getConversationSummary, updateConversationSummary } from "@/lib/db";

const SUMMARY_PROMPT = `Resume la conversación en 1-3 frases en español. Captura: tema, datos clave del cliente, decisiones y pendientes. No inventes datos.`;

export async function summarizeConversation(
  messages: AgentMessage[],
  llm: Pick<LLMProvider, "complete">
): Promise<string> {
  if (messages.length === 0) return "";
  const { content } = await llm.complete({
    systemPrompt: SUMMARY_PROMPT,
    messages,
    tools: undefined,
  });
  return content.trim();
}

export class SupabaseMemoryProvider implements MemoryProvider {
  async getRecent(conversationId: string, limit: number): Promise<AgentMessage[]> {
    const rows = await getMessages(conversationId, limit);
    return rows
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));
  }

  async getSummary(conversationId: string): Promise<string> {
    return getConversationSummary(conversationId);
  }

  async updateSummary(conversationId: string, messages: AgentMessage[]): Promise<string> {
    const summary = await summarizeConversation(messages, this.llm);
    await updateConversationSummary(conversationId, summary);
    return summary;
  }

  constructor(private readonly llm: Pick<LLMProvider, "complete">) {}
}
