import { NextRequest, NextResponse } from "next/server";
import { listDocuments, createDocument } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docs = await listDocuments(id);
    return NextResponse.json(docs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, source_type, source_url } = await req.json();
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    // Validate URL if source_type is url
    if (source_type === "url" && !source_url) {
      return NextResponse.json({ error: "source_url required for URL documents" }, { status: 400 });
    }

    const doc = await createDocument(id, title, source_type || "pdf", undefined, source_url);
    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
