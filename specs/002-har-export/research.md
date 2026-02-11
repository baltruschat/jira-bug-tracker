# Research: HAR File Export & Jira Attachment

**Feature Branch**: `002-har-export`
**Date**: 2026-02-10

## R1: HAR 1.2 Specification — Minimum Viable Structure for Chrome DevTools Import

**Decision**: Use HAR 1.2 with the minimum required fields that Chrome DevTools can successfully import. Omit optional fields that the extension does not capture (full headers, cookies, detailed timings breakdown).

**Rationale**: The extension's `NetworkRequest` data model captures method, URL, status, timing (start/duration), body content, and response size — but not full request/response headers, cookies, HTTP version, or granular timings (DNS, connect, SSL). Generating a HAR file with only the available data is both honest and sufficient for DevTools import. Chrome DevTools gracefully handles missing optional fields (uses `-1` for unavailable sizes, empty arrays for missing headers/cookies).

**Alternatives considered**:
- **Full HAR with fabricated headers**: Rejected — adding fake HTTP version or headers would misrepresent captured data
- **HAR-like custom format**: Rejected — non-standard format would not import into DevTools or other HAR analysis tools
- **Third-party HAR library (e.g., `har-validator`)**: Rejected — constitution mandates no external runtime dependencies; HAR structure is simple enough to build manually

**Minimum required fields per entry**:
- `startedDateTime` (ISO 8601) — derived from `NetworkRequest.startTime`
- `time` (ms) — derived from `NetworkRequest.duration` or `0`
- `request.method`, `request.url` — direct mapping
- `request.httpVersion` — use `"HTTP/1.1"` as reasonable default (not captured)
- `request.headers`, `request.cookies`, `request.queryString` — empty arrays `[]`
- `request.headersSize`, `request.bodySize` — `-1` (not captured)
- `request.postData` — include only when `requestBody` is present, with `mimeType: "application/octet-stream"` and `text` containing the body
- `response.status`, `response.statusText` — from `statusCode` with standard status text lookup
- `response.httpVersion` — `"HTTP/1.1"` default
- `response.headers`, `response.cookies` — empty arrays
- `response.content.size` — from `responseSize` or `0`
- `response.content.mimeType` — `"application/octet-stream"` (not captured, use generic)
- `response.content.text` — from `responseBody` if present
- `response.redirectURL` — `""`
- `response.headersSize`, `response.bodySize` — `-1`
- `cache` — empty object `{}`
- `timings.send` — `0`
- `timings.wait` — derived from `duration` or `0`
- `timings.receive` — `0`

## R2: Redaction Strategy for HAR Content

**Decision**: Apply existing redaction functions from `redaction.ts` to HAR entry bodies before serialization. Since full request/response headers are not captured (only sensitive ones are known from `constants.ts`), header redaction applies only if headers are later added to the data model.

**Rationale**: The current `NetworkRequest` stores `requestBody` and `responseBody` as strings. These may contain sensitive fields (passwords, tokens, credit card numbers) in JSON or form-encoded payloads. The existing `redactFormValues()` function handles form data, and body content can be processed through the existing `isSensitiveField()` pattern matcher.

**Implementation approach**:
1. Request bodies: If JSON, parse and redact sensitive keys using `isSensitiveField()`. If form-encoded, use `redactFormValues()`. If unparseable, include as-is (truncation already applied).
2. Response bodies: Same JSON key redaction as request bodies.
3. URLs: No redaction (URLs may contain query params with tokens, but this matches current behavior — no URL redaction exists today).

**Alternatives considered**:
- **Full URL query parameter redaction**: Rejected — would change current behavior and could break useful debugging info. Can be added as a future enhancement.
- **Omit all bodies from HAR**: Rejected — bodies are the most valuable diagnostic data in the HAR file.

## R3: Integration Point in Submission Flow

**Decision**: Generate HAR file and upload as attachment in the `SUBMIT_REPORT` handler in `background.ts`, after issue creation and alongside the existing screenshot attachment upload.

**Rationale**: The `SUBMIT_REPORT` handler (background.ts:168-220) already:
1. Loads the pending report (which contains `networkRequests[]`)
2. Builds ADF description
3. Creates the issue
4. Uploads screenshot attachment

Adding HAR upload follows the same pattern — create issue first, then upload attachments. This keeps the attachment logic co-located and handles failures independently (issue creation succeeds even if HAR upload fails).

**Implementation**:
1. After `createIssue()` returns the issue key
2. If `report.networkRequests.length > 0`:
   a. Call `buildHarFile(report.networkRequests)` → JSON string
   b. Create `Blob` from JSON string with `application/json` MIME type
   c. Call `uploadAttachment(siteId, issueKey, blob, 'network-capture.har')`
3. Wrap in try/catch — log warning on failure but don't fail the submission

**Alternatives considered**:
- **Upload before issue creation**: Rejected — need issue key for attachment API
- **Embed HAR as base64 in description**: Rejected — defeats the purpose of cleaner descriptions
- **Stream upload during capture**: Rejected — no Jira issue exists yet during capture phase

## R4: ADF Description Modification

**Decision**: Remove the network code block from `buildFullDescription()` when network requests are present. The function still receives `networkRequests` as a parameter (for the HAR builder to use), but the ADF output no longer includes inline network data.

**Rationale**: FR-003 requires that network data is conveyed exclusively through the HAR attachment. Keeping the inline text would create redundancy and a larger issue description.

**Implementation**: In `buildFullDescription()` (adf-builder.ts:53-60), remove the conditional block that calls `buildNetworkBlock()`. The `buildNetworkBlock()` function itself can remain (or be removed) as it will no longer be called.

## R5: Error Handling for HAR Upload Failure

**Decision**: Use a try/catch around the HAR upload. On failure, the submission still succeeds (issue + screenshot are created), and the error is returned as a warning in the response message.

**Rationale**: FR-007 requires graceful handling. The issue is the primary deliverable; the HAR attachment is supplementary. Users should know the attachment failed but should not have to re-submit.

**Implementation**: The `SUBMIT_REPORT` response already includes `success: true` and the issue URL. Add an optional `warnings: string[]` field to the response. The popup can display a warning toast if warnings are present.
