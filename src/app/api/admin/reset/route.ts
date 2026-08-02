import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetConnectionState } from "@/infrastructure/cache/connection-state";
import { resetSupabase } from "@/infrastructure/database/supabase";

export const dynamic = "force-dynamic";

const AUTH_DIR = path.resolve(process.cwd(), "auth");
const DATA_DIR = path.resolve(process.cwd(), "data");
const RESTART_FLAG = path.join(DATA_DIR, ".restart");

/**
 * POST /api/admin/reset
 *
 * Force reset the bot session:
 * - Clears Baileys auth directory
 * - Resets connection state in Redis
 * - Resets Supabase client singleton
 * - Creates restart flag for the bot process
 *
 * Use this when the bot is stuck or you need a fresh QR code.
 */
export async function POST(): Promise<NextResponse> {
  try {
    // 1. Clear auth directory
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }

    // 2. Reset connection state in Redis
    await resetConnectionState();

    // 3. Reset Supabase client singleton
    resetSupabase();

    // 4. Create restart flag
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(RESTART_FLAG, "");

    return NextResponse.json({
      ok: true,
      message: "Session reset. Bot will restart and generate a new QR code.",
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
