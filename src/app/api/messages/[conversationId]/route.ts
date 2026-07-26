import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationById,
  getMessages,
  insertMessage,
  enqueueOutbox,
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

  // Validate conversation ID
  const validation = validateConversationId(conversationId);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: validation.errors },
      { status: 400 }
    );
  }

  const id = parseInt(conversationId, 10);
  const messages = getMessages(id, 200);
  return NextResponse.json({ messages });
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

  const conv = getConversationById(id);
  if (!conv) {
    return NextResponse.json(
      { ok: false, error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Parse and validate body
  let body: { content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Validate content
  const contentValidation = validateMessageContent(body.content);
  if (!contentValidation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid content", details: contentValidation.errors },
      { status: 400 }
    );
  }

  // Sanitize content
  const content = sanitizeText(body.content!);

  // 1) Insert the message as 'human' (visible immediately in dashboard)
  const messageId = insertMessage(id, "human", content);

  // 2) Enqueue in outbox for the bot to send via WhatsApp
  enqueueOutbox(id, conv.phone, content);

  return NextResponse.json({ ok: true, messageId });
}
