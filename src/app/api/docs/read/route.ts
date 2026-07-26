import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  const docsDir = path.resolve(process.cwd(), "docs");
  const resolvedPath = path.resolve(process.cwd(), "docs", filePath);

  // Security: ensure the resolved path is within the docs directory
  if (!resolvedPath.startsWith(docsDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(resolvedPath, "utf-8");
  const stat = fs.statSync(resolvedPath);

  return NextResponse.json({
    content,
    lastModified: stat.mtime.toISOString(),
    size: stat.size,
  });
}
