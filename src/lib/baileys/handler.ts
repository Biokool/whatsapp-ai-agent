import type { WASocket, BaileysEventMap } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  updateConversationPhone,
} from "../db";
import { generateReply } from "../openrouter";
import { retrieveContext } from "../rag/retrieval";
import { DEFAULT_TENANT_ID } from "@/core/types/database";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

/**
 * Resolve a WhatsApp JID to a usable identifier.
 * - @s.whatsapp.net → phone number (standard)
 * - @lid → Linked Device ID (not a phone). Use pushName for display.
 */
function resolveJid(remoteJid: string): {
  phone: string;
  isLid: boolean;
  jid: string;
} {
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

    // For LID contacts, try to find the real phone number from Baileys store
    let resolvedPhone = phone;
    if (isLid) {
      try {
        // Check if store has a LID-to-phone mapping
        const storeContacts = (sock as any).store?.contacts;
        if (storeContacts) {
          const lidKey = remoteJid.split("@")[0];
          for (const [key, val] of Object.entries(storeContacts)) {
            const contact = val as any;
            if (contact.lid === lidKey || key === lidKey) {
              resolvedPhone = contact.phoneNumber ?? contact.phone ?? key;
              logger.info(`[bot] LID resolved: ${lidKey} → ${resolvedPhone} (from store)`);
              break;
            }
          }
        }
      } catch (e) {
        // ignore store errors
      }
    }

    logger.info(
      `[bot] ← ${isLid ? "LID" : "phone"} ${resolvedPhone} (${pushName ?? "?"}): "${text.slice(0, 60)}"`
    );

    try {
      const convo = await getOrCreateConversation(resolvedPhone, pushName, jid);

      // If we resolved a better phone number, update it
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
        const history = await getRecentHistory(convo.id, 20);
        logger.info(`[bot] llamando al LLM con ${history.length} mensajes...`);

        // Retrieve RAG context if available
        const ragContext = await retrieveContext(DEFAULT_TENANT_ID, text);

        const reply = await generateReply({ history, conversationId: convo.id, ragContext });

        if (!reply || reply.trim() === "") {
          logger.warn("[bot] LLM devolvió respuesta vacía, ignorando");
          continue;
        }

        const ms = Date.now() - start;
        logger.info(`[bot] LLM respondió en ${ms}ms`);

        await insertMessage(convo.id, "assistant", reply);
        // Send reply using the original JID — Baileys handles both @s.whatsapp.net and @lid
        await sock.sendMessage(jid, { text: reply });

        logger.info(`[bot] → enviado a ${phone}: "${reply.slice(0, 60)}"`);
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
