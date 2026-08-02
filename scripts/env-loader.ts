// Carga .env.local en process.env ANTES de cualquier otro import.
// Side effect puro — debe importarse como primer módulo en start-bot.ts.

import path from "node:path";
import fs from "node:fs";

const envPath = path.resolve(process.cwd(), ".env.local");

if (!fs.existsSync(envPath)) {
  throw new Error(`.env.local not found at ${envPath}`);
}

const text = fs.readFileSync(envPath, "utf-8");
for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 0) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  // ALWAYS set the value — overwrite anything that was there before
  process.env[key] = value;
}

// Verify critical vars are loaded
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL not loaded from .env.local");
}
