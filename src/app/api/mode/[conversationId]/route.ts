import { NextResponse, type NextRequest } from "next/server";
import { setMode } from "@/lib/db";
import type { ConversationMode } from "@/core/types/database";
import { validateConversationId, validateMode } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { conversationId } = await params;

  const idValidation = validateConversationId(conversationId);
  if (!idValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: idValidation.errors },
      { status: 400 }
    );
  }

  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const modeValidation = validateMode(body.mode);
  if (!modeValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid mode", details: modeValidation.errors },
      { status: 400 }
    );
  }

  await setMode(conversationId, body.mode as ConversationMode);
  return NextResponse.json({ ok: true });
}
