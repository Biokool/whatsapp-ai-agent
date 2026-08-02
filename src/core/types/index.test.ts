import { describe, it, expect } from "vitest";
import type { Conversation, Message, ConnectionPayload, MessageRole } from "./index";

describe("Core Types", () => {
  it("Conversation has required fields", () => {
    const conversation: Conversation = {
      id: "00000000-0000-0000-0000-000000000001",
      phone: "5215664436277",
      name: "Test User",
      jid: "5215664436277@s.whatsapp.net",
      mode: "AI",
      last_message_at: new Date().toISOString(),
      last_message_preview: "Hello",
    };

    expect(conversation.id).toBe("00000000-0000-0000-0000-000000000001");
    expect(conversation.phone).toBe("5215664436277");
    expect(conversation.mode).toBe("AI");
  });

  it("Message has required fields", () => {
    const message: Message = {
      id: "00000000-0000-0000-0000-000000000002",
      conversation_id: "00000000-0000-0000-0000-000000000001",
      role: "assistant",
      content: "Hello!",
      created_at: new Date().toISOString(),
    };

    expect(message.role).toBe("assistant");
    expect(message.content).toBe("Hello!");
  });

  it("ConnectionPayload has required fields", () => {
    const payload: ConnectionPayload = {
      status: "connected",
      phone: "5215664436277",
    };

    expect(payload.status).toBe("connected");
  });

  it("MessageRole accepts all valid roles", () => {
    const roles: MessageRole[] = ["user", "assistant", "human"];
    expect(roles).toHaveLength(3);
  });

  it("Conversation mode is AI or HUMAN", () => {
    const ai: Conversation["mode"] = "AI";
    const human: Conversation["mode"] = "HUMAN";
    expect(["AI", "HUMAN"]).toContain(ai);
    expect(["AI", "HUMAN"]).toContain(human);
  });
});
