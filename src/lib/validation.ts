/**
 * Input validation utilities for API routes
 *
 * Provides simple, lightweight validation without external dependencies.
 * For production, consider using Zod or similar library.
 */

// ============================================================
// Types
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================
// Validation Functions
// ============================================================

/**
 * Validate that a value is a non-empty string
 */
export function isNonEmptyString(
  value: unknown,
  fieldName: string,
  maxLength: number = 10000
): ValidationError | null {
  if (typeof value !== "string") {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }

  if (value.trim().length === 0) {
    return { field: fieldName, message: `${fieldName} cannot be empty` };
  }

  if (value.length > maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} exceeds maximum length of ${maxLength}`,
    };
  }

  return null;
}

/**
 * Validate that a value is a positive integer
 */
export function isPositiveInteger(
  value: unknown,
  fieldName: string
): ValidationError | null {
  const num = Number(value);

  if (Number.isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { field: fieldName, message: `${fieldName} must be a positive integer` };
  }

  return null;
}

/**
 * Validate that a value is one of allowed values
 */
export function isOneOf(
  value: unknown,
  fieldName: string,
  allowed: unknown[]
): ValidationError | null {
  if (!allowed.includes(value)) {
    return {
      field: fieldName,
      message: `${fieldName} must be one of: ${allowed.join(", ")}`,
    };
  }

  return null;
}

/**
 * Sanitize text input by removing potentially dangerous characters
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    // Remove null bytes
    .replace(/\0/g, "")
    // Limit consecutive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Validate conversation ID parameter (UUID format)
 */
export function validateConversationId(
  id: unknown
): ValidationResult {
  const errors: string[] = [];

  if (id === undefined || id === null) {
    errors.push("conversationId is required");
    return { valid: false, errors };
  }

  const str = String(id);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(str)) {
    errors.push("conversationId must be a valid UUID");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate message content
 */
export function validateMessageContent(
  content: unknown
): ValidationResult {
  const errors: string[] = [];

  if (content === undefined || content === null) {
    errors.push("content is required");
    return { valid: false, errors };
  }

  if (typeof content !== "string") {
    errors.push("content must be a string");
    return { valid: false, errors };
  }

  const sanitized = sanitizeText(content);
  if (sanitized.length === 0) {
    errors.push("content cannot be empty");
  }

  if (sanitized.length > 10000) {
    errors.push("content exceeds maximum length of 10000 characters");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate mode value
 */
export function validateMode(
  mode: unknown
): ValidationResult {
  const errors: string[] = [];

  if (mode === undefined || mode === null) {
    errors.push("mode is required");
    return { valid: false, errors };
  }

  if (!["AI", "HUMAN"].includes(mode as string)) {
    errors.push("mode must be 'AI' or 'HUMAN'");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a validation error response
 */
export function validationErrorResponse(
  errors: string[],
  status: number = 400
): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "Validation failed",
      details: errors,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
}
