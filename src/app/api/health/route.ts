import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const health = await checkDatabaseHealth();

    return NextResponse.json({
      ok: true,
      status: health.status,
      database: {
        healthy: health.status === "healthy",
        conversations: health.conversations,
        messages: health.messages,
      },
      uptime: health.uptime,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
