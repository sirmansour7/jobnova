/**
 * General-purpose input sanitization for user-supplied text before it is
 * stored in the database or passed to external services.
 *
 * Complements llm-sanitize.util.ts (which targets LLM-specific injection
 * vectors). This utility focuses on XSS and HTML injection prevention.
 *
 * Steps applied in order:
 *  1. Strip HTML tags  e.g. <script>alert(1)</script> → alert(1)
 *  2. Remove stray < > that weren't part of a tag
 *  3. Trim leading/trailing whitespace
 *  4. Hard-truncate to maxLength (default 2000)
 */

const HTML_TAGS_RE = /<[^>]*>/g;
const ANGLE_BRACKETS_RE = /[<>]/g;

export function sanitizeInput(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(HTML_TAGS_RE, '')
    .replace(ANGLE_BRACKETS_RE, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Recursively sanitizes every string value inside a plain object or array.
 * Non-string primitives (numbers, booleans, null) are left untouched.
 * Used for sanitizing freeform JSON payloads such as CV data.
 */
export function sanitizeObjectStrings(
  value: unknown,
  maxLength = 2000,
): unknown {
  if (typeof value === 'string') {
    return sanitizeInput(value, maxLength);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObjectStrings(item, maxLength));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = sanitizeObjectStrings(v, maxLength);
    }
    return result;
  }
  return value;
}
