import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import path from "node:path";
import fs from "node:fs";
import {
  getConnectionState,
  setConnectionState,
  resetConnectionState,
} from "@/infrastructure/cache/connection-state";
import { handleIncomingMessages } from "./handler";
import { startOutboxListener, stopOutboxListener } from "./outbox";

const AUTH_DIR = path.resolve(process.cwd(), "auth");
const DATA_DIR = path.resolve(process.cwd(), "data");
const RESTART_FLAG = path.join(DATA_DIR, ".restart");

let handle: { sock: WASocket; shutdown: () => Promise<void> } | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });
const baileysLogger = pino({ level: "silent" });

function scheduleReconnect(code: number | undefined) {
  if (reconnectTimer) return;

  const delay = code === 440 ? 15000 : 5000;

  logger.info(`[bot] reconectando en ${delay / 1000}s (code=${code ?? "?"})`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (handle) {
      try {
        handle.sock.end(undefined);
      } catch {
        // ignorar
      }
      handle = null;
    }
    void start();
  }, delay);
}

export async function start(): Promise<void> {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
    logger.info(`[bot] usando Baileys version ${version.join(".")}`);
  } catch (err) {
    logger.warn({ err }, "[bot] no se pudo obtener la última versión de Baileys");
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger: baileysLogger,
    browser: Browsers.macOS("Desktop"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  // Mark current state
  const current = await getConnectionState();
  if (current.status === "disconnected") {
    await setConnectionState({ status: "connecting" });
  }

  // Eventos
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("[bot] QR generado");
      await setConnectionState({ status: "qr", qr_string: qr, phone: null });
      qrcodeTerminal.generate(qr, { small: true });
    }

    if (connection === "connecting") {
      const state = await getConnectionState();
      if (state.status === "disconnected") {
        await setConnectionState({ status: "connecting" });
      }
    }

    if (connection === "open") {
      const userId = sock.user?.id ?? "";
      const phone = userId.split(":")[0].split("@")[0] || null;
      await setConnectionState({ status: "connected", qr_string: null, phone });
      logger.info(`[bot] ✓ conectado como ${phone}`);
      startOutboxListener(sock);
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as unknown;
      const code =
        error && typeof error === "object" && "output" in error
          ? // @ts-expect-error: Boom error structure
            (error.output?.statusCode as number | undefined)
          : undefined;

      stopOutboxListener();

      if (code === DisconnectReason.loggedOut) {
        stopOutboxListener();
        await resetConnectionState();
        // Limpiar sesión vieja y reconectar con QR nuevo
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          logger.info("[bot] sesión cerrada desde el móvil. Sesión borrada, reconectando...");
        }
        scheduleReconnect(code);
        return;
      }

      logger.warn(`[bot] conexión cerrada (code=${code ?? "?"}). Reconectando...`);
      scheduleReconnect(code);
    }
  });

  sock.ev.on("messages.upsert", async (event) => {
    await handleIncomingMessages(sock, event);
  });

  handle = {
    sock,
    shutdown: async () => {
      try {
        sock.end(undefined);
      } catch {
        // ignorar
      }
    },
  };
}

export function watchRestartFlag(): void {
  setInterval(() => {
    if (fs.existsSync(RESTART_FLAG)) {
      logger.info("[bot] flag de restart detectado");
      try {
        fs.unlinkSync(RESTART_FLAG);
      } catch {
        // ignorar
      }
      void (async () => {
        if (handle) {
          await handle.shutdown();
          handle = null;
        }
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        await start();
      })();
    }
  }, 1000);
}
