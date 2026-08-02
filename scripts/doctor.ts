// Diagnóstico de errores comunes del kit.
// Ejecutar con: npm run doctor
// Cross-platform.

import "./env-loader";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

const issues: string[] = [];

function check(label: string, ok: boolean, fix?: string): void {
  const icon = ok ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
  console.log(`  ${icon} ${label}`);
  if (!ok && fix) {
    console.log(`    ${COLORS.yellow}→ ${fix}${COLORS.reset}`);
    issues.push(`${label}: ${fix}`);
  }
}

console.log("");
console.log(`${COLORS.bold}${COLORS.blue}Diagnóstico del kit${COLORS.reset}`);
console.log(`${COLORS.dim}Buscando los 10 errores conocidos del agente WhatsApp...${COLORS.reset}`);
console.log("");

// ============================================================
// 1. .env.local existe y tiene OPENROUTER_API_KEY
// ============================================================
console.log(`${COLORS.bold}1. Variables de entorno${COLORS.reset}`);
{
  const envLocal = path.resolve(process.cwd(), ".env.local");
  const exists = fs.existsSync(envLocal);
  check(
    ".env.local existe",
    exists,
    "Ejecuta /setup en Claude Code o copia .env.example a .env.local"
  );

  if (exists) {
    const hasKey = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "";
    check(
      "OPENROUTER_API_KEY configurada",
      hasKey,
      "Pega tu API key de OpenRouter en .env.local (la sacas de openrouter.ai/keys)"
    );

    const model = process.env.OPENROUTER_MODEL ?? "";
    const isFreeModel = model.endsWith(":free");
    check(
      `Modelo: ${model || "(por defecto)"}`,
      !isFreeModel,
      isFreeModel
        ? "Los modelos :free están saturados en producción. Cambia a openai/gpt-4o-mini en .env.local"
        : undefined
    );
  }
}

// ============================================================
// 2. node_modules instalado y TypeScript pasa
// ============================================================
console.log("");
console.log(`${COLORS.bold}2. Dependencias${COLORS.reset}`);
{
  const installed = fs.existsSync(path.resolve(process.cwd(), "node_modules"));
  check("node_modules instalado", installed, "Ejecuta: npm install");

  if (installed) {
    try {
      execSync("npx tsc --noEmit", { stdio: "pipe" });
      check("TypeScript pasa (npx tsc --noEmit)", true);
    } catch {
      check("TypeScript", false, "Hay errores de tipos. Ejecuta 'npx tsc --noEmit' para verlos");
    }
  }
}

// ============================================================
// 3. Estado de conexión WhatsApp
// ============================================================
console.log("");
console.log(`${COLORS.bold}3. Conexión WhatsApp${COLORS.reset}`);
{
  const dbPath = path.resolve(process.cwd(), "data", "messages.db");
  const dbExists = fs.existsSync(dbPath);
  check(
    "Base de datos existe (data/messages.db)",
    dbExists,
    "La base de datos se crea automáticamente la primera vez que arranques el bot (npm run start:bot)"
  );

  if (dbExists) {
    try {
      // No importamos db.ts aquí para no ejecutar todo el DDL en este script.
      // Usamos sqlite a través de better-sqlite3 directamente con read-only.
      const Database = require("better-sqlite3");
      const db = new Database(dbPath, { readonly: true });
      const row = db
        .prepare("SELECT status, phone, qr_string FROM connection_state WHERE id = 1")
        .get() as { status: string; phone: string | null; qr_string: string | null } | undefined;
      db.close();

      if (!row) {
        check("Estado de conexión", false, "Tabla connection_state vacía. Arranca el bot.");
      } else {
        const states = {
          connected: { ok: true, msg: `Conectado como ${row.phone ?? "?"}` },
          qr: { ok: false, msg: "Esperando que escanees el QR en localhost:3000" },
          connecting: { ok: false, msg: "Conectando... espera unos segundos" },
          disconnected: { ok: false, msg: "Desconectado. Arranca el bot: npm run start:bot" },
        } as const;
        const info = states[row.status as keyof typeof states] ?? {
          ok: false,
          msg: `Estado desconocido: ${row.status}`,
        };
        check(`Estado: ${row.status}`, info.ok, info.ok ? undefined : info.msg);
      }
    } catch (err) {
      check(
        "Lectura de DB",
        false,
        `Error: ${err instanceof Error ? err.message : String(err)}. ¿Está el bot corriendo y bloqueando la DB?`
      );
    }
  }
}

// ============================================================
// 4. Carpetas runtime
// ============================================================
console.log("");
console.log(`${COLORS.bold}4. Carpetas runtime${COLORS.reset}`);
{
  const authExists = fs.existsSync(path.resolve(process.cwd(), "auth"));
  check(
    "Carpeta auth/ existe",
    authExists,
    "La sesión Baileys se guarda aquí. Si no existe, escanea QR la primera vez"
  );

  const promptsNegocio = fs.existsSync(path.resolve(process.cwd(), "prompts", "negocio.md"));
  check(
    "prompts/negocio.md (personalizado)",
    promptsNegocio,
    "Ejecuta /personaliza en Claude Code para adaptar el agente a tu negocio"
  );
}

// ============================================================
// 5. Procesos zombies (solo Windows)
// ============================================================
if (process.platform === "win32") {
  console.log("");
  console.log(`${COLORS.bold}5. Procesos zombies (Windows)${COLORS.reset}`);
  try {
    const output = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', {
      encoding: "utf-8",
    });
    const nodeCount = (output.match(/node\.exe/g) ?? []).length;
    check(
      `Procesos node.exe activos: ${nodeCount}`,
      nodeCount <= 3,
      nodeCount > 3
        ? `Demasiados procesos node corriendo. Posibles zombies de tsx. Mata con: tasklist | findstr node, luego taskkill /PID <X> /F`
        : undefined
    );
  } catch {
    // Ignorar si tasklist no está disponible
  }
}

// ============================================================
// Cierre
// ============================================================
console.log("");
if (issues.length === 0) {
  console.log(`${COLORS.green}${COLORS.bold}Diagnóstico OK.${COLORS.reset} El kit está sano.`);
  process.exit(0);
} else {
  console.log(
    `${COLORS.red}${COLORS.bold}${issues.length} problema(s) detectado(s).${COLORS.reset}`
  );
  console.log(`${COLORS.dim}Sigue las flechas amarillas (→) para arreglarlos.${COLORS.reset}`);
  console.log("");
  console.log(
    `Si te quedas atascado, escribe ${COLORS.bold}/setup${COLORS.reset} en Claude Code o pide ayuda en las sesiones del domingo.`
  );
  process.exit(1);
}
