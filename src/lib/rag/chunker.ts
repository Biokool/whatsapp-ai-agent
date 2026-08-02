export interface Chunk {
  content: string;
  metadata: { index: number; start: number; end: number };
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        metadata: { index, start, end },
      });
      index++;
    }

    start += chunkSize - overlap;
  }

  return chunks;
}
