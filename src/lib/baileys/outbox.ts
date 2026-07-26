import type { WASocket } from "@whiskeysockets/baileys";
import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

let channel: ReturnType<typeof getSupabase>["channel"] | null = null;

/**
 * Subscribe to Supabase Realtime for outgoing messages.
 * When a human sends a message from the dashboard, it's inserted into
 * the `messages` table with role='human'. Baileys listens for these
 * inserts and sends them via WhatsApp.
 */
export function startOutboxListener(sock: WASocket): void {
  if (channel) return;

  const supabase = getSupabase();

  channel = supabase
    .channel("outbox")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: "role=eq.human",
      },
      async (payload) => {
        const msg = payload.new as {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
        };

        logger.info(`[bot] ← outbox realtime: message ${msg.id}`);

        // Get conversation to find the JID
        const { data: convo } = await supabase
          .from("conversations")
          .select("jid, phone")
          .eq("id", msg.conversation_id)
          .single();

        if (!convo) {
          logger.warn(`[bot] conversation ${msg.conversation_id} not found`);
          return;
        }

        const jid = convo.jid ?? `${convo.phone}@s.whatsapp.net`;

        try {
          await sock.sendMessage(jid, { text: msg.content });
          logger.info(`[bot] → outbox enviado a ${convo.phone}: "${msg.content.slice(0, 40)}..."`);
        } catch (err) {
          logger.warn(
            { err: err instanceof Error ? err.message : String(err) },
            `[bot] outbox message ${msg.id} falló`
          );
        }
      }
    )
    .subscribe();

  logger.info("[bot] outbox listener started (Supabase Realtime)");
}

export function stopOutboxListener(): void {
  if (channel) {
    const supabase = getSupabase();
    supabase.removeChannel(channel);
    channel = null;
    logger.info("[bot] outbox listener stopped");
  }
}
