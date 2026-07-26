import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationById,
  getMessages,
  insertMessage,
} from "@/lib/db";
import {
  validateConversationId,
  validateMessageContent,
  sanitizeText,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { conversationId } = await params;

  const validation = validateConversationId(conversationId);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: validation.errors },
      { status: 400 }
    );
  }

  const messages = await getMessages(conversationId, 200);
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  const { conversationId } = await params;

  const idValidation = validateConversationId(conversationId);
  if (!idValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: idValidation.errors },
      { status: 400 }
    );
  }

  const conv = await getConversationById(conversationId);
  if (!conv) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found" },
      { status: 404 }
    );
  }

  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const contentValidation = validateMessageContent(body.content);
  if (!contentValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid content", details: contentValidation.errors },
      { status: 400 }
    );
  }

  const content = sanitizeText(body.content!);

  // Insert message as 'human' — Supabase Realtime will trigger Baileys to send it
  const messageId = await insertMessage(conversationId, "human", content);

  return NextResponse.json({ ok: true, messageId });
}
