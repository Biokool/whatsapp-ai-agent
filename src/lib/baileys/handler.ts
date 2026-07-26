import type { WASocket, BaileysEventMap } from "@whiskeysockets/baileys";
import pino from "pino";
import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
} from "../db";
import { generateReply } from "../openrouter";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

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

    const phone = remoteJid.split("@")[0].split(":")[0];
    const pushName = msg.pushName ?? undefined;

    logger.info(`[bot] ← mensaje de ${phone}: "${text.slice(0, 60)}"`);

    const convo = await getOrCreateConversation(phone, pushName, remoteJid);
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

      const reply = await generateReply({ history, conversationId: convo.id });

      if (!reply || reply.trim() === "") {
        logger.warn("[bot] LLM devolvió respuesta vacía, ignorando");
        continue;
      }

      const ms = Date.now() - start;
      logger.info(`[bot] LLM respondió en ${ms}ms`);

      await insertMessage(convo.id, "assistant", reply);
      await sock.sendMessage(remoteJid, { text: reply });

      logger.info(`[bot] → enviado a ${phone}: "${reply.slice(0, 60)}"`);
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        `[bot] error procesando mensaje de ${phone}`
      );
    }
  }
}
