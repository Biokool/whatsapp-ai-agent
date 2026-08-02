// IMPORTANTE: env-loader debe ser el PRIMER import.
// Los ES module imports se hoistean al inicio del archivo, así que cualquier
// import que lea process.env en su top-level necesita que el .env.local
// se haya cargado YA. env-loader.ts es side-effect only y puebla process.env
// antes de que se evalúen el resto de imports.
import "./env-loader";

import pino from "pino";
import { start, watchRestartFlag } from "../src/lib/baileys/client";
import fs from "node:fs";
import path from "node:path";

const logger = pino({
  level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info",
});

const LOCK_FILE = path.join(process.cwd(), "data", ".bot.lock");

function acquireLock(): boolean {
  try {
    if (!fs.existsSync(path.dirname(LOCK_FILE))) {
      fs.mkdirSync(path.dirname(LOCK_FILE), { recursive: true });
    }
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (!isNaN(pid) && pid !== process.pid) {
        try {
          process.kill(pid, 0);
          logger.error(`[bot] another bot instance is already running (PID ${pid}). Exiting.`);
          return false;
        } catch {
          logger.info(`[bot] stale lock file found (PID ${pid} dead). Removing.`);
          fs.unlinkSync(LOCK_FILE);
        }
      } else {
        logger.info(`[bot] stale lock file (PID ${pid}) matches current process. Removing.`);
        fs.unlinkSync(LOCK_FILE);
      }
    }
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  } catch (err) {
    logger.warn({ err }, "[bot] could not acquire lock, continuing anyway");
    return true;
  }
}

function releaseLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE, "utf-8").trim(), 10);
      if (pid === process.pid) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {
    // ignore
  }
}

async function main(): Promise<void> {
  logger.info("[bot] arrancando agente WhatsApp...");

  if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === "") {
    logger.error(
      "[bot] OPENROUTER_API_KEY no está configurada. Edita .env.local o ejecuta /setup en Claude Code."
    );
    process.exit(1);
  }

  if (!acquireLock()) {
    process.exit(1);
  }

  try {
    await start();
    watchRestartFlag();
    logger.info("[bot] esperando QR scan en el dashboard (localhost:3000)...");
  } catch (err) {
    logger.error({ err }, "[bot] error fatal al arrancar");
    releaseLock();
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error({ err }, "[bot] error no capturado");
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("[bot] SIGINT recibido, cerrando...");
  releaseLock();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("[bot] SIGTERM recibido, cerrando...");
  releaseLock();
  process.exit(0);
});

process.on("exit", () => {
  releaseLock();
});
