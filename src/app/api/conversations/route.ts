import { NextResponse } from "next/server";
import { listConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch {
    return NextResponse.json({ error: "Failed to list conversations" }, { status: 500 });
  }
}
