import type { NetworkRequest, HarDocument, HarEntry } from '../models/types';
import { HTTP_STATUS_TEXT } from '../utils/constants';
import { isSensitiveField } from './redaction';

const CREATOR_NAME = 'Jira Bug Tracker';
const CREATOR_VERSION = '0.1.0';

/**
 * Convert an array of NetworkRequest objects into a HAR 1.2 JSON string.
 */
export function buildHarFile(requests: NetworkRequest[]): string {
  const har: HarDocument = {
    log: {
      version: '1.2',
      creator: {
        name: CREATOR_NAME,
        version: CREATOR_VERSION,
      },
      entries: requests.map(buildEntry),
    },
  };

  return JSON.stringify(har);
}

function buildEntry(req: NetworkRequest): HarEntry {
  const statusCode = req.statusCode ?? 0;
  const duration = Math.max(0, req.duration ?? 0);
  const redactedRequestBody = redactBody(req.requestBody);
  const redactedResponseBody = redactBody(req.responseBody);

  return {
    startedDateTime: new Date(req.startTime).toISOString(),
    time: duration,
    request: {
      method: req.method,
      url: req.url,
      httpVersion: 'HTTP/1.1',
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: redactedRequestBody != null ? redactedRequestBody.length : -1,
      ...(redactedRequestBody != null
        ? {
            postData: {
              mimeType: 'application/octet-stream',
              text: redactedRequestBody,
            },
          }
        : {}),
    },
    response: {
      status: statusCode,
      statusText: HTTP_STATUS_TEXT[statusCode] ?? '',
      httpVersion: 'HTTP/1.1',
      headers: [],
      cookies: [],
      content: {
        size: req.responseSize ?? 0,
        mimeType: 'application/octet-stream',
        ...(redactedResponseBody != null ? { text: redactedResponseBody } : {}),
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: req.responseSize ?? -1,
    },
    cache: {} as Record<string, never>,
    timings: {
      send: 0,
      wait: duration,
      receive: 0,
    },
  };
}

/**
 * Redact sensitive field values in a body string.
 * If body is valid JSON, parse it and recursively redact values for keys
 * matching isSensitiveField(). If not valid JSON, return body as-is.
 */
export function redactBody(body: string | null): string | null {
  if (body == null) return null;

  try {
    const parsed: unknown = JSON.parse(body);
    if (Array.isArray(parsed)) {
      const redacted = parsed.map((item) =>
        typeof item === 'object' && item !== null
          ? redactObject(item as Record<string, unknown>)
          : item,
      );
      return JSON.stringify(redacted);
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const redacted = redactObject(parsed as Record<string, unknown>);
      return JSON.stringify(redacted);
    }
    return body;
  } catch {
    return body;
  }
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? redactObject(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
