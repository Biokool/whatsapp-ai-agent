import { NextResponse, type NextRequest } from "next/server";
import { setMode, type ConversationMode } from "@/lib/db";
import { validateConversationId, validateMode } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { conversationId } = await params;

  // Validate conversation ID
  const idValidation = validateConversationId(conversationId);
  if (!idValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: idValidation.errors },
      { status: 400 }
    );
  }

  const id = parseInt(conversationId, 10);

  // Parse and validate body
  let body: { mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate mode
  const modeValidation = validateMode(body.mode);
  if (!modeValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid mode", details: modeValidation.errors },
      { status: 400 }
    );
  }

  setMode(id, body.mode as ConversationMode);
  return NextResponse.json({ ok: true });
}
