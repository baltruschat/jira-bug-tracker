# Data Model: HAR File Export & Jira Attachment

**Feature Branch**: `002-har-export`
**Date**: 2026-02-10

## New Types (to add to `src/models/types.ts`)

### HAR 1.2 Structure Types

```typescript
/** Top-level HAR document structure (HAR 1.2 spec) */
export interface HarDocument {
  log: HarLog;
}

/** HAR log containing metadata and entries */
export interface HarLog {
  version: '1.2';
  creator: HarCreator;
  entries: HarEntry[];
}

/** Application that generated the HAR file */
export interface HarCreator {
  name: string;
  version: string;
}

/** Single HTTP transaction entry */
export interface HarEntry {
  startedDateTime: string; // ISO 8601
  time: number;            // Total elapsed ms
  request: HarRequest;
  response: HarResponse;
  cache: Record<string, never>; // Empty object (not captured)
  timings: HarTimings;
}

/** HTTP request details */
export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarNameValue[];
  queryString: HarNameValue[];
  cookies: HarNameValue[];
  headersSize: number;  // -1 if unavailable
  bodySize: number;     // -1 if unavailable
  postData?: HarPostData;
}

/** HTTP response details */
export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarNameValue[];
  cookies: HarNameValue[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;  // -1 if unavailable
  bodySize: number;     // -1 if unavailable
}

/** Request body data */
export interface HarPostData {
  mimeType: string;
  text: string;
}

/** Response body content */
export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
}

/** Timing breakdown */
export interface HarTimings {
  send: number;
  wait: number;
  receive: number;
}

/** Generic name-value pair (headers, query string, cookies) */
export interface HarNameValue {
  name: string;
  value: string;
}
```

## Modified Types

### SubmitReportResponse (existing, to extend)

```typescript
/** Response from SUBMIT_REPORT handler - add optional warnings */
export interface SubmitReportResponse {
  success: boolean;
  issueKey: string;
  issueUrl: string;
  warnings?: string[]; // NEW: e.g., ["HAR attachment upload failed"]
}
```

## Entity Relationships

```
NetworkRequest[] (existing, from capture)
       │
       │  buildHarFile()
       ▼
HarDocument
  └── HarLog
       ├── HarCreator (extension name + version)
       └── HarEntry[] (1:1 mapping from NetworkRequest[])
            ├── HarRequest
            │    ├── method, url ← NetworkRequest.method, url
            │    └── postData?.text ← NetworkRequest.requestBody (redacted)
            ├── HarResponse
            │    ├── status ← NetworkRequest.statusCode
            │    ├── content.size ← NetworkRequest.responseSize
            │    └── content.text ← NetworkRequest.responseBody (redacted)
            └── HarTimings
                 └── wait ← NetworkRequest.duration
```

## Data Mapping: NetworkRequest → HarEntry

| NetworkRequest field | HAR field | Transformation |
|---------------------|-----------|----------------|
| `startTime` | `entry.startedDateTime` | `new Date(startTime).toISOString()` |
| `duration` | `entry.time` | `duration ?? 0` |
| `method` | `request.method` | Direct copy |
| `url` | `request.url` | Direct copy |
| — | `request.httpVersion` | Default `"HTTP/1.1"` |
| — | `request.headers` | Empty `[]` |
| — | `request.queryString` | Empty `[]` |
| — | `request.cookies` | Empty `[]` |
| — | `request.headersSize` | `-1` |
| `requestBody` | `request.postData.text` | Redact sensitive fields, include only if non-null |
| — | `request.bodySize` | `requestBody?.length ?? -1` |
| `statusCode` | `response.status` | `statusCode ?? 0` |
| — | `response.statusText` | Lookup from status code map |
| — | `response.httpVersion` | Default `"HTTP/1.1"` |
| — | `response.headers` | Empty `[]` |
| — | `response.cookies` | Empty `[]` |
| `responseSize` | `response.content.size` | `responseSize ?? 0` |
| — | `response.content.mimeType` | Default `"application/octet-stream"` |
| `responseBody` | `response.content.text` | Redact sensitive fields |
| — | `response.redirectURL` | `""` |
| — | `response.headersSize` | `-1` |
| `responseSize` | `response.bodySize` | `responseSize ?? -1` |
| — | `cache` | `{}` |
| `duration` | `timings.wait` | `duration ?? 0` |
| — | `timings.send` | `0` |
| — | `timings.receive` | `0` |
| `error` | — | Errors noted as `_error` custom field (optional) |

## Validation Rules

- `startedDateTime` must be valid ISO 8601 (guaranteed by `Date.toISOString()`)
- `time` must be non-negative (use `Math.max(0, duration ?? 0)`)
- `timings.send`, `timings.wait`, `timings.receive` must be non-negative
- `response.status` must be a number (use `0` for null/undefined status codes)
- Empty arrays (`[]`) for headers, cookies, queryString — never `null` or `undefined`
- `headersSize` and `bodySize` use `-1` when unavailable (never `null`)
