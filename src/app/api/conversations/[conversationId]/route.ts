import { NextResponse, type NextRequest } from "next/server";
import { deleteConversation } from "@/lib/db";
import { validateConversationId } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { conversationId } = await params;

  const validation = validateConversationId(conversationId);
  if (!validation.valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid conversation ID", details: validation.errors },
      { status: 400 }
    );
  }

  await deleteConversation(conversationId);
  return NextResponse.json({ ok: true });
}
