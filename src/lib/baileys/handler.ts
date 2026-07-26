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
  // type: 'notify' = mensajes nuevos (los que nos interesan)
  // 'append' y 'replace' son históricos de sincronización
  if (event.type !== "notify") return;

  for (const msg of event.messages) {
    // Filtrar mensajes propios (los que YO envío desde el móvil del negocio)
    if (msg.key.fromMe) continue;

    const remoteJid = msg.key.remoteJid ?? "";

    // Filtrar grupos, listas de difusión/estados y newsletters — fuera del scope v1
    if (
      remoteJid.endsWith("@g.us") ||
      remoteJid.endsWith("@broadcast") ||
      remoteJid.endsWith("@newsletter")
    ) {
      continue;
    }

    // Solo conversaciones 1:1. WhatsApp usa DOS formatos de dirección:
    //   - @s.whatsapp.net : número de teléfono (formato clásico)
    //   - @lid            : identificador de privacidad LID (desplegado por WhatsApp 2025-2026)
    // Hay que aceptar AMBOS o se pierden los mensajes de cuentas con LID activado.
    if (!remoteJid.endsWith("@s.whatsapp.net") && !remoteJid.endsWith("@lid")) continue;

    // Extraer texto: conversation (mensaje plano) o extendedTextMessage (cuando hay reply, etc.)
    const text =
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      null;

    if (!text || text.trim() === "") {
      // Sin texto: audio, imagen, sticker, etc. Fuera del scope v1.
      continue;
    }

    // Identificador estable de la conversación: el número (o el LID si la cuenta
    // usa el nuevo formato), sin el sufijo del dominio ni el id de dispositivo (:NN).
    const phone = remoteJid.split("@")[0].split(":")[0];
    const pushName = msg.pushName ?? undefined;

    logger.info(`[bot] ← mensaje de ${phone}: "${text.slice(0, 60)}"`);

    // Persistir el mensaje entrante. Guardamos también el remoteJid completo
    // para poder responder por el dominio correcto (@s.whatsapp.net o @lid).
    const convo = getOrCreateConversation(phone, pushName, remoteJid);
    insertMessage(convo.id, "user", text);

    // Re-leer la conversación: el modo pudo cambiar entre creación y este check
    const fresh = getConversationById(convo.id);
    if (!fresh) continue;

    if (fresh.mode !== "AI") {
      // Modo HUMAN: solo guardar, NO responder. El humano contestará desde el dashboard.
      logger.info(`[bot] conversación ${convo.id} en modo HUMAN, no respondo`);
      continue;
    }

    // Modo AI: pedir respuesta al LLM
    const start = Date.now();
    try {
      const history = getRecentHistory(convo.id, 20);
      logger.info(`[bot] llamando al LLM con ${history.length} mensajes...`);

      const reply = await generateReply({ history, conversationId: convo.id });

      if (!reply || reply.trim() === "") {
        logger.warn("[bot] LLM devolvió respuesta vacía, ignorando");
        continue;
      }

      const ms = Date.now() - start;
      logger.info(`[bot] LLM respondió en ${ms}ms`);

      // Guardar la respuesta y enviarla
      insertMessage(convo.id, "assistant", reply);
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
