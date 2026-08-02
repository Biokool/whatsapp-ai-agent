import { NextRequest, NextResponse } from "next/server";
import { listKnowledgeBases, createKnowledgeBase } from "@/lib/db";

export async function GET() {
  try {
    const kbs = await listKnowledgeBases();
    return NextResponse.json(kbs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const kb = await createKnowledgeBase(name, description);
    return NextResponse.json(kb, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
