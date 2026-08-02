import { NextRequest, NextResponse } from "next/server";
import { getDocumentVersions } from "@/lib/n8n/client";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const versions = await getDocumentVersions(id);
    return NextResponse.json(versions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
