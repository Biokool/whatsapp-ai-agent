import { NextResponse } from "next/server";
import { checkDatabaseHealth, backupDatabase, getDatabaseStats } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Returns system health status including:
 * - Database health
 * - Database statistics
 * - System uptime
 *
 * POST /api/health
 *
 * Creates a database backup and returns status.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const health = checkDatabaseHealth();
    const stats = getDatabaseStats();

    return NextResponse.json({
      ok: true,
      status: health.status,
      database: {
        healthy: health.status === "healthy",
        path: health.path,
        sizeBytes: health.sizeBytes,
        walMode: health.walMode,
        foreignKeys: health.foreignKeys,
        conversations: health.conversations,
        messages: health.messages,
        outboxPending: health.outboxPending,
        stats,
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

export async function POST(): Promise<NextResponse> {
  try {
    const result = backupDatabase();

    if (result.success) {
      return NextResponse.json({
        ok: true,
        message: "Database backup created",
        backupPath: result.backupPath,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
