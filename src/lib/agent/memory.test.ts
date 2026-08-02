import { describe, it, expect, vi } from "vitest";
import { summarizeConversation } from "./memory";

describe("summarizeConversation", () => {
  it("calls llm with the last messages and returns trimmed summary", async () => {
    const llm = {
      complete: vi.fn().mockResolvedValue({
        content: "Cliente preguntó precios de cremas. Interesado en la facial.",
        toolCalls: [],
      }),
    };
    const messages = [
      { role: "user" as const, content: "Hola, ¿qué venden?" },
      { role: "assistant" as const, content: "Cosmética natural." },
    ];
    const summary = await summarizeConversation(messages, llm as any);
    expect(summary).toContain("cremas");
    expect(llm.complete).toHaveBeenCalledTimes(1);
  });

  it("returns empty string for empty messages", async () => {
    const summary = await summarizeConversation([], { complete: vi.fn() } as any);
    expect(summary).toBe("");
  });
});
