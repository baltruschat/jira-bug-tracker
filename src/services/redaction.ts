import { SENSITIVE_HEADERS, SENSITIVE_FIELD_PATTERNS } from '../utils/constants';

const REDACTED = '[REDACTED]';

/**
 * Redact sensitive headers from a header map.
 * Strips Authorization, Cookie, Set-Cookie, X-API-Key.
 */
export function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
      result[key] = REDACTED;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Truncate a body string to the given max size in bytes.
 * Returns null if input is null/undefined.
 */
export function truncateBody(
  body: string | null | undefined,
  maxSize: number,
): string | null {
  if (body == null) return null;
  if (body.length <= maxSize) return body;
  return body.slice(0, maxSize) + `... [truncated at ${maxSize} bytes]`;
}

/**
 * Check if a form field name matches known sensitive patterns.
 */
export function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldName));
}

/**
 * Redact sensitive form values in a key-value map.
 */
export function redactFormValues(
  formData: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (isSensitiveField(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = value;
    }
  }
  return result;
}
