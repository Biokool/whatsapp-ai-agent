import pino from "pino";

const logger = pino({ level: (process.env.LOG_LEVEL as pino.Level | undefined) ?? "info" });

/**
 * Extract text content from a URL (HTML page)
 * Uses basic HTML parsing without external dependencies
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WhatsAppAIAgent/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8",
      },
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    logger.info(`[url-scraper] extracted ${text.length} chars from ${url}`);
    return text;
  } catch (err: any) {
    logger.error({ err: err.message }, `[url-scraper] failed to extract from ${url}`);
    throw new Error(`Failed to extract content from URL: ${err.message}`);
  }
}

/**
 * Extract readable text from HTML content
 * Removes scripts, styles, and other non-content elements
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");

  // Remove nav, header, footer elements (usually not main content)
  cleaned = cleaned.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");

  // Convert common block elements to newlines
  cleaned = cleaned.replace(/<(div|p|h[1-6]|li|tr|br|hr)\b[^>]*>/gi, "\n");
  cleaned = cleaned.replace(/<\/(div|p|h[1-6]|li|tr)>/gi, "\n");

  // Remove all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, "");

  // Decode HTML entities
  cleaned = decodeHtmlEntities(cleaned);

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ");

  // Split by newlines and filter empty lines
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Join with newlines, preserving paragraph structure
  return lines.join("\n\n");
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&hellip;": "…",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "g"), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  result = result.replace(/&#x([0-9a-f]+);/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );

  return result;
}

/**
 * Validate if a URL is accessible
 */
export async function validateUrl(url: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { valid: false, error: "Only HTTP/HTTPS URLs are supported" };
    }

    // Use GET instead of HEAD to get actual content
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WhatsAppAIAgent/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { valid: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    // Allow any text-based content type (some sites don't set proper content-type in HEAD)
    const contentType = response.headers.get("content-type") || "";
    const isText =
      contentType.includes("text/") ||
      contentType.includes("application/json") ||
      contentType.includes("application/xml") ||
      contentType.includes("application/xhtml");

    // If no content-type header, assume it's valid (many sites don't set it properly)
    if (contentType && !isText) {
      return { valid: false, error: `Unsupported content type: ${contentType}` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
