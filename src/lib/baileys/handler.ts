import type { WASocket, BaileysEventMap } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  updateConversationPhone,
} from "../db";
import { UniversalAgent } from "@/lib/agent/universal-agent";
import { SupabaseMemoryProvider } from "@/lib/agent/memory";
import { SupabaseRAGProvider } from "@/lib/agent/providers/rag-provider";
import { DefaultToolProvider } from "@/lib/agent/providers/tool-provider";
import { OpenRouterLLMProvider } from "@/lib/agent/providers/openrouter-llm";
import { executeTool } from "@/lib/tools";
import { getCustomerServiceExpertise, getBusinessKnowledge } from "@/lib/system-prompt";
import { DEFAULT_TENANT_ID } from "@/core/types/database";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

let agent: UniversalAgent | null = null;

function getAgent(): UniversalAgent {
  if (agent) return agent;
  const memory = new SupabaseMemoryProvider(
    new OpenRouterLLMProvider({ conversationId: "summary", executeTool })
  );
  const llm = new OpenRouterLLMProvider({ conversationId: "runtime", executeTool });
  const rag = new SupabaseRAGProvider();
  const tools = new DefaultToolProvider();
  agent = new UniversalAgent({ llm, rag, memory, tools });
  return agent;
}

function resolveJid(remoteJid: string): { phone: string; isLid: boolean; jid: string } {
  const phone = remoteJid.split("@")[0].split(":")[0];
  const isLid = remoteJid.endsWith("@lid");
  return { phone, isLid, jid: remoteJid };
}

export async function handleIncomingMessages(
  sock: WASocket,
  event: BaileysEventMap["messages.upsert"]
): Promise<void> {
  if (event.type !== "notify") return;

  for (const msg of event.messages) {
    if (msg.key.fromMe) continue;

    const remoteJid = msg.key.remoteJid ?? "";

    if (
      remoteJid.endsWith("@g.us") ||
      remoteJid.endsWith("@broadcast") ||
      remoteJid.endsWith("@newsletter")
    ) {
      continue;
    }

    if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) continue;

    const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null;
    if (!text || text.trim() === "") continue;

    const { phone, isLid, jid } = resolveJid(remoteJid);
    const pushName = msg.pushName ?? undefined;

    let resolvedPhone = phone;
    if (isLid) {
      try {
        const storeContacts = (sock as any).store?.contacts;
        if (storeContacts) {
          const lidKey = remoteJid.split("@")[0];
          for (const [key, val] of Object.entries(storeContacts)) {
            const contact = val as any;
            if (contact.lid === lidKey || key === lidKey) {
              resolvedPhone = contact.phoneNumber ?? contact.phone ?? key;
              break;
            }
          }
        }
      } catch {
        // ignore store errors
      }
    }

    logger.info(
      `[bot] ← ${isLid ? "LID" : "phone"} ${resolvedPhone} (${pushName ?? "?"}): "${text.slice(0, 60)}"`
    );

    try {
      const convo = await getOrCreateConversation(resolvedPhone, pushName, jid);

      if (isLid && resolvedPhone !== phone && convo.phone === phone) {
        await updateConversationPhone(convo.id, resolvedPhone);
        convo.phone = resolvedPhone;
      }
      await insertMessage(convo.id, "user", text);

      const fresh = await getConversationById(convo.id);
      if (!fresh) continue;

      if (fresh.mode !== "AI") {
        logger.info(`[bot] conversación ${convo.id} en modo HUMAN, no respondo`);
        continue;
      }

      const start = Date.now();
      try {
        const a = getAgent();
        const memory = new SupabaseMemoryProvider(
          new OpenRouterLLMProvider({ conversationId: convo.id, executeTool })
        );
        const recent = await memory.getRecent(convo.id, 20);
        const summary = await memory.getSummary(convo.id);

        const ctx = {
          tenantId: DEFAULT_TENANT_ID,
          conversationId: convo.id,
          channel: "whatsapp",
          userPhone: resolvedPhone,
          userName: pushName,
          systemInstructions: getCustomerServiceExpertise(),
          businessKnowledge: getBusinessKnowledge(),
          ragContext: "",
          history: recent,
          conversationSummary: summary,
          nowIso: new Date().toISOString(),
        };

        const result = await a.process(ctx);

        if (result.action === "reject") {
          await insertMessage(convo.id, "assistant", result.reply);
          await sock.sendMessage(jid, { text: result.reply });
          logger.info(`[bot] → rechazado (${result.intent})`);
          continue;
        }

        if (result.reply && result.reply.trim() !== "") {
          await insertMessage(convo.id, "assistant", result.reply);
          await sock.sendMessage(jid, { text: result.reply });
        }

        const ms = Date.now() - start;
        logger.info(
          `[bot] ${result.action} en ${ms}ms (intent=${result.intent}, rag=${result.usedRag}, tools=${result.toolsUsed.join(",") || "-"})`
        );
      } catch (err: any) {
        logger.error(
          `[bot] error procesando mensaje de ${phone}: ${err?.message ?? String(err)}\n${err?.stack ?? ""}`
        );
      }
    } catch (err: any) {
      logger.error(
        `[bot] error fatal procesando mensaje de ${phone}: ${err?.message ?? String(err)}\n${err?.stack ?? ""}`
      );
    }
  }
}
