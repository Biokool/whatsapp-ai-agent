import type { WASocket } from "@whiskeysockets/baileys";
import type { RealtimeChannel } from "@supabase/supabase-js";
import pino from "pino";
import { getSupabase } from "@/infrastructure/database/supabase";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

let channel: RealtimeChannel | null = null;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastPollTimestamp: string = new Date().toISOString();

async function processHumanMessage(
  supabase: ReturnType<typeof getSupabase>,
  sock: WASocket,
  msg: { id: string; conversation_id: string; role: string; content: string; created_at: string }
) {
  logger.info(`[bot] ← outbox: message ${msg.id}`);

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

function startPolling(sock: WASocket) {
  if (pollInterval) return;

  lastPollTimestamp = new Date().toISOString();
  pollInterval = setInterval(async () => {
    try {
      const supabase = getSupabase();
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .eq("role", "human")
        .gte("created_at", lastPollTimestamp)
        .order("created_at", { ascending: true })
        .limit(10);

      if (error) {
        logger.warn({ error: error.message }, "[bot] poll query failed");
        return;
      }

      if (messages && messages.length > 0) {
        for (const msg of messages) {
          await processHumanMessage(supabase, sock, msg);
        }
        lastPollTimestamp = messages[messages.length - 1].created_at;
      }
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "[bot] poll cycle failed"
      );
    }
  }, 2000);

  logger.info("[bot] outbox polling started (2s interval)");
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    logger.info("[bot] outbox polling stopped");
  }
}

/**
 * Subscribe to Supabase Realtime for outgoing messages.
 * Falls back to polling if Realtime is not available.
 */
export function startOutboxListener(sock: WASocket): void {
  if (channel || pollInterval) return;

  try {
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
            created_at: string;
          };
          await processHumanMessage(supabase, sock, msg);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          logger.info("[bot] outbox Realtime subscribed");
          stopPolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          logger.warn(`[bot] outbox Realtime status: ${status} — falling back to polling`);
          channel = null;
          startPolling(sock);
        }
      });

    logger.info("[bot] outbox listener started (Supabase Realtime)");
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "[bot] outbox Realtime failed, falling back to polling"
    );
    startPolling(sock);
  }
}

export function stopOutboxListener(): void {
  if (channel) {
    const supabase = getSupabase();
    supabase.removeChannel(channel);
    channel = null;
    logger.info("[bot] outbox listener stopped");
  }
  stopPolling();
}
