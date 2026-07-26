/**
 * Rate Limiter for LLM API Calls
 *
 * Provides per-conversation rate limiting to prevent cost runaway.
 * Uses in-memory storage (resets on restart).
 *
 * Configuration via environment variables:
 * - LLM_RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 10)
 * - LLM_RATE_LIMIT_WINDOW_MS: Window duration in milliseconds (default: 60000 = 1 minute)
 */

// ============================================================
// Types
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ============================================================
// Configuration
// ============================================================

const MAX_REQUESTS = parseInt(process.env.LLM_RATE_LIMIT_MAX_REQUESTS ?? "10", 10);
const WINDOW_MS = parseInt(process.env.LLM_RATE_LIMIT_WINDOW_MS ?? "60000", 10);

// ============================================================
// Storage
// ============================================================

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 60000); // Clean up every minute

// ============================================================
// Rate Limiter
// ============================================================

/**
 * Check if a request is allowed for a given conversation
 */
export function checkRateLimit(conversationId: number): RateLimitResult {
  const key = `llm:${conversationId}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window or expired window
    store.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit status without incrementing
 */
export function getRateLimitStatus(conversationId: number): RateLimitResult {
  const key = `llm:${conversationId}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    return {
      allowed: true,
      remaining: MAX_REQUESTS,
      resetAt: now + WINDOW_MS,
    };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a conversation
 */
export function resetRateLimit(conversationId: number): void {
  const key = `llm:${conversationId}`;
  store.delete(key);
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
  }

  return headers;
}
