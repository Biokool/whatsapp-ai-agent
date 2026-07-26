import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

interface DocFile {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  children?: DocFile[];
}

function getDocsTree(dir: string, relativeTo: string): DocFile[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: DocFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(relativeTo, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      const children = getDocsTree(fullPath, relativeTo);
      if (children.length > 0) {
        files.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          isDirectory: true,
          children,
        });
      }
    } else if (entry.name.endsWith(".md")) {
      files.push({
        name: entry.name.replace(/\.md$/, ""),
        path: fullPath,
        relativePath,
        isDirectory: false,
      });
    }
  }

  return files.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET() {
  const docsDir = path.resolve(process.cwd(), "docs");

  if (!fs.existsSync(docsDir)) {
    return NextResponse.json({ files: [] });
  }

  const files = getDocsTree(docsDir, docsDir);
  return NextResponse.json({ files });
}
