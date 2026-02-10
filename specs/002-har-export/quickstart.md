# Quickstart: HAR File Export & Jira Attachment

**Feature Branch**: `002-har-export`
**Date**: 2026-02-10

## Overview

This feature replaces inline network request text in Jira issue descriptions with a standard HAR 1.2 file attachment. When a user submits a bug report, captured network traffic is serialized as a `.har` file and uploaded to the Jira issue as an attachment.

## Files to Create

### `src/services/har-builder.ts`

New service responsible for converting `NetworkRequest[]` into a HAR 1.2 JSON string.

**Key function**: `buildHarFile(requests: NetworkRequest[]): string`

- Maps each `NetworkRequest` to a `HarEntry`
- Applies body redaction (sensitive field values replaced with `[REDACTED]`)
- Returns `JSON.stringify(harDocument)`
- Uses status code → status text lookup for standard HTTP status codes

**Key function**: `redactBody(body: string | null): string | null`

- Parses body as JSON; redacts sensitive keys using `isSensitiveField()`
- Falls back to returning body as-is if not valid JSON

## Files to Modify

### `entrypoints/background.ts` — SUBMIT_REPORT handler (~lines 168-220)

**Change**: After creating the issue and uploading the screenshot, add HAR file generation and upload.

```
// After screenshot upload (line ~195):
if (report.networkRequests.length > 0) {
  try {
    const harJson = buildHarFile(report.networkRequests);
    const harBlob = new Blob([harJson], { type: 'application/json' });
    await uploadAttachment(siteId, issue.key, harBlob, 'network-capture.har');
  } catch {
    warnings.push('Network capture attachment failed');
  }
}
```

### `src/services/adf-builder.ts` — `buildFullDescription()` (~lines 22-63)

**Change**: Remove the network code block from the ADF description. Delete lines ~53-60 that conditionally build and append the network block.

The `buildNetworkBlock()` function (lines ~99-119) can be removed as well since it will no longer be called.

### `src/models/types.ts`

**Change**: Add HAR type interfaces (`HarDocument`, `HarLog`, `HarCreator`, `HarEntry`, `HarRequest`, `HarResponse`, `HarPostData`, `HarContent`, `HarTimings`, `HarNameValue`). See data-model.md for full definitions.

### `src/utils/constants.ts`

**Change**: Add `HAR_FILENAME = 'network-capture.har'` constant and `HTTP_STATUS_TEXT` map for status code lookups.

## Files to Create (Tests)

### `tests/unit/services/har-builder.test.ts`

Test cases:
- Generates valid HAR 1.2 structure with `version`, `creator`, `entries`
- Maps `NetworkRequest` fields correctly to HAR entry fields
- Includes `postData` only when `requestBody` is present
- Includes `content.text` only when `responseBody` is present
- Redacts sensitive fields in request/response bodies
- Handles null/undefined values gracefully (statusCode, duration, sizes)
- Returns empty entries array for empty input
- Handles requests with errors (sets status 0, includes error info)

### `tests/unit/services/adf-builder.test.ts` (modify existing)

Update existing tests:
- Verify `buildFullDescription()` no longer includes network code block
- Remove or update test that checks for network data in ADF output

## Build & Test

```bash
# Run all tests
npm test

# Run only HAR builder tests
npx vitest run tests/unit/services/har-builder.test.ts

# Lint
npm run lint

# Build extension
npm run build
```

## Verification

1. Build extension and load in Chrome (`npm run build`, load `.output/chrome-mv3`)
2. Browse a page with network activity
3. Trigger capture (Alt+Shift+B)
4. Submit bug report
5. Check Jira issue:
   - Description should NOT contain network request text
   - Issue should have `network-capture.har` attachment
6. Download the `.har` file from Jira
7. Open Chrome DevTools → Network tab → Import HAR file
8. Verify requests display correctly
