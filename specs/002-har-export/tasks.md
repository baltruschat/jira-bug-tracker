# Tasks: HAR File Export & Jira Attachment

**Input**: Design documents from `/specs/002-har-export/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/har-schema.json, quickstart.md

**Tests**: Included — project has 80% coverage threshold and existing test infrastructure (Vitest + @webext-core/fake-browser).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Types & Constants)

**Purpose**: Add HAR-related type definitions and constants needed by all subsequent phases

- [ ] T001 [P] Add HAR 1.2 type interfaces (HarDocument, HarLog, HarCreator, HarEntry, HarRequest, HarResponse, HarPostData, HarContent, HarTimings, HarNameValue) to `src/models/types.ts` — use exact definitions from `specs/002-har-export/data-model.md` "New Types" section
- [ ] T002 [P] Add `HAR_FILENAME = 'network-capture.har'` constant and `HTTP_STATUS_TEXT` map (status code → status text lookup for common HTTP codes: 200 OK, 201 Created, 204 No Content, 301 Moved Permanently, 302 Found, 304 Not Modified, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, 408 Request Timeout, 429 Too Many Requests, 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout) to `src/utils/constants.ts`

---

## Phase 2: User Story 1 — HAR File Attached to Jira Issue (Priority: P1) — MVP

**Goal**: When a user submits a bug report, captured network traffic is serialized as a valid HAR 1.2 file and uploaded as an attachment to the Jira issue. The inline network text block is removed from the issue description.

**Independent Test**: Submit a bug report with network capture enabled. The Jira issue should have a `network-capture.har` attachment containing valid HAR 1.2 JSON. The description should NOT contain inline network request blocks.

### Implementation for User Story 1

- [ ] T003 [P] [US1] Create `src/services/har-builder.ts` with two exported functions: (1) `buildHarFile(requests: NetworkRequest[]): string` — converts NetworkRequest[] to a HAR 1.2 JSON string by mapping each request to a HarEntry per the field mapping in `specs/002-har-export/data-model.md`, using `HTTP_STATUS_TEXT` from constants for status text lookup, setting `httpVersion` to `"HTTP/1.1"`, empty arrays for headers/cookies/queryString, `-1` for unavailable sizes, `postData` only when `requestBody` is non-null, `content.text` only when `responseBody` is non-null, `timings.wait` from duration, creator name `"Jira Bug Tracker"` with version from manifest/package. (2) `redactBody(body: string | null): string | null` — if body is valid JSON, parse it and recursively redact values for keys matching `isSensitiveField()` from `src/services/redaction.ts` with `"[REDACTED]"`, then re-stringify; if not valid JSON, return body as-is. Import `isSensitiveField` from `@/services/redaction`
- [ ] T004 [P] [US1] Remove the network code block from `buildFullDescription()` in `src/services/adf-builder.ts` — delete the conditional block (~lines 53-60) that calls `buildNetworkBlock()` and appends the network heading + code block to the ADF content array. Also remove the `buildNetworkBlock()` helper function (~lines 99-119) and remove the unused `networkRequests` parameter from `buildFullDescription()`. Update the function signature accordingly. Update all callers in `entrypoints/background.ts` to no longer pass `networkRequests` to `buildFullDescription()`
- [ ] T005 [US1] Create `tests/unit/services/har-builder.test.ts` with Vitest tests: (1) `buildHarFile()` returns valid JSON with `log.version === "1.2"` and `log.creator.name` set; (2) empty input returns `log.entries` as empty array; (3) single NetworkRequest maps correctly — verify `entry.startedDateTime` is ISO 8601, `entry.time` matches duration, `request.method` and `request.url` match, `response.status` matches statusCode, `response.content.size` matches responseSize; (4) `postData` included only when `requestBody` is non-null, omitted when null; (5) `response.content.text` included only when `responseBody` is non-null; (6) null/undefined values handled — statusCode null → status 0, duration null → time 0, responseSize null → content.size 0; (7) `request.headers`, `request.cookies`, `request.queryString` are empty arrays; (8) `headersSize` and `bodySize` are `-1`; (9) requests with errors — verify entry is included with status 0 when statusCode is null. Use mock NetworkRequest data similar to existing test patterns in `tests/unit/services/network-collector.test.ts`
- [ ] T006 [P] [US1] Update `tests/unit/services/adf-builder.test.ts` — remove or update the test (~line 79-83) that checks "includes network codeBlock when requests present" since network data is no longer in the ADF output. Update the test (~line 141-155) that verifies network block content. Add a new test: "does NOT include network code block even when requests are provided" — pass mockRequests to verify network data is absent from the ADF output. Update `buildFullDescription()` calls to match the new signature (without networkRequests parameter)
- [ ] T007 [US1] Integrate HAR generation and upload into the `SUBMIT_REPORT` case in `entrypoints/background.ts` (~lines 168-220) — after the existing screenshot upload block (~line 195), add: if `report.networkRequests.length > 0`, call `buildHarFile(report.networkRequests)` to get the HAR JSON string, create a `new Blob([harJson], { type: 'application/json' })`, call `await uploadAttachment(siteId, issue.key, harBlob, HAR_FILENAME)`. Wrap in try/catch — on failure, collect warning string `'Network capture attachment upload failed'` into a `warnings` array. Include `warnings` in the response message sent back to the popup. Import `buildHarFile` from `@/services/har-builder` and `HAR_FILENAME` from `@/utils/constants`
- [ ] T007b [US1] Update the popup submission handler to display warnings — in the view that handles the SUBMIT_REPORT response (likely `entrypoints/popup/views/SuccessView.ts` or `ReportFormView.ts`), check if the response contains a non-empty `warnings` array. If so, display each warning as a visible notice (e.g., a yellow/orange text block below the success message). This ensures FR-007's requirement that "the user should be informed of the attachment failure" is satisfied at the UI level

**Checkpoint**: At this point, User Story 1 should be fully functional — submitting a bug report with network data creates a Jira issue with a HAR attachment and a clean description without inline network text. Upload failures are surfaced to the user.

---

## Phase 3: User Story 2 — Sensitive Data Redaction in HAR File (Priority: P1)

**Goal**: All sensitive data (passwords, tokens, credit card numbers) in captured request/response bodies is redacted in the HAR file before upload, matching the existing privacy protections.

**Independent Test**: Capture network traffic containing JSON bodies with sensitive field names (password, token, credit_card). Submit a bug report and verify the HAR attachment has `[REDACTED]` values for those fields.

### Implementation for User Story 2

- [ ] T008 [US2] Add comprehensive body redaction test cases to `tests/unit/services/har-builder.test.ts` — test `redactBody()` directly and verify redaction in `buildHarFile()` output: (1) JSON body with `"password": "secret123"` → value replaced with `"[REDACTED]"`; (2) JSON body with `"token": "abc"` → redacted; (3) JSON body with `"credit_card": "4111..."` → redacted; (4) JSON body with `"cvv": "123"` → redacted; (5) nested JSON object `{"user": {"password": "x"}}` → nested value redacted; (6) JSON body with non-sensitive keys `{"name": "John", "email": "j@x.com"}` → values preserved; (7) non-JSON body string `"plain text body"` → returned as-is (no crash); (8) null body → returns null; (9) verify redaction applied in full HAR output — create NetworkRequest with sensitive requestBody and responseBody, call `buildHarFile()`, parse result, check `postData.text` and `content.text` contain `[REDACTED]` for sensitive keys

**Checkpoint**: Redaction is verified through comprehensive tests. The `redactBody()` function built in T003 handles all sensitive field patterns from `SENSITIVE_FIELD_PATTERNS` in `src/utils/constants.ts`.

---

## Phase 4: User Story 3 — HAR Export With No Network Data (Priority: P2)

**Goal**: When network capture is disabled or no requests were recorded, the system gracefully skips HAR file generation without errors.

**Independent Test**: Disable network capture in settings, submit a bug report, verify the issue is created successfully without a HAR attachment and without errors.

### Implementation for User Story 3

- [ ] T009 [US3] Add empty-state test cases to `tests/unit/services/har-builder.test.ts` — verify: (1) `buildHarFile([])` returns valid HAR with empty entries array (not an error); (2) the background.ts integration correctly skips HAR upload when `report.networkRequests.length === 0` (this is structurally guaranteed by the `if` guard in T007, but add a comment-level note in the test to confirm). Also review `entrypoints/background.ts` SUBMIT_REPORT handler to ensure the `if (report.networkRequests.length > 0)` guard added in T007 correctly handles both the empty-array case and the case where `networkRequests` might be undefined (from older pending reports)

**Checkpoint**: Empty-state handling is verified. No HAR generation or upload occurs when there are no network requests.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [ ] T010 Run full test suite (`npm test`) and lint (`npm run lint`) — verify all existing and new tests pass, no type errors, no lint violations. Fix any issues found
- [ ] T011 Run quickstart.md verification: build extension (`npm run build`), verify `.output/chrome-mv3` contains the built extension. Review the manual verification checklist from `specs/002-har-export/quickstart.md` "Verification" section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001 and T002 are parallel.
- **US1 (Phase 2)**: Depends on Phase 1 completion. T003 and T004 are parallel (different files). T005 depends on T003. T006 is parallel with T005 (different test files). T007 depends on T005 and T006. T007b depends on T007 (needs the warnings response to display).
- **US2 (Phase 3)**: Depends on T003 (needs har-builder with redactBody). Can start as soon as T003 is complete.
- **US3 (Phase 4)**: Depends on T007 (needs the background.ts integration). Can start as soon as T007 is complete.
- **Polish (Phase 5)**: Depends on all prior phases.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Setup (Phase 1) only. No dependencies on other stories. **This is the MVP.**
- **User Story 2 (P1)**: Depends on T003 from US1 (the har-builder must exist to test redaction). Testing-only phase — no new production code.
- **User Story 3 (P2)**: Depends on T007 from US1 (the background.ts integration must exist to verify empty-state guard). Mostly verification — minimal new code.

### Parallel Opportunities

**Phase 1**: T001 and T002 run in parallel (different files)
**Phase 2**: T003 and T004 run in parallel (har-builder.ts vs adf-builder.ts). After T003 completes: T005 and T006 run in parallel (different test files).
**Phase 3**: T008 can start as soon as T003 is done (even before T007).

```
T001 ──┐
       ├──→ T003 ──→ T005 ──┐
T002 ──┘     │               ├──→ T007 ──→ T007b ──→ T009 ──→ T010 ──→ T011
             │       T006 ──┘
             T004 ──→ T006
             │
             └──→ T008 (can start after T003)
```

---

## Parallel Example: User Story 1

```bash
# After Phase 1, launch har-builder and adf-builder changes in parallel:
Task: "Create har-builder service in src/services/har-builder.ts"         # T003
Task: "Remove network block from src/services/adf-builder.ts"             # T004

# After T003 completes, launch both test files in parallel:
Task: "Create har-builder tests in tests/unit/services/har-builder.test.ts"  # T005
Task: "Update adf-builder tests in tests/unit/services/adf-builder.test.ts"  # T006
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002) — ~5 min
2. Complete Phase 2: User Story 1 (T003-T007) — core implementation
3. **STOP and VALIDATE**: Run `npm test && npm run lint`
4. User Story 1 delivers full value: HAR attachment + clean description

### Incremental Delivery

1. Phase 1 + Phase 2 → MVP (HAR file attached, no inline network text)
2. Phase 3 → Redaction verified (security confidence via tests)
3. Phase 4 → Edge case verified (empty-state robustness)
4. Phase 5 → Full validation (all tests, lint, build)

---

## Notes

- [P] tasks = different files, no dependencies on each other
- [Story] label maps task to specific user story for traceability
- US2 is a testing-only phase — redaction logic is built into har-builder in T003
- US3 is primarily verification — the empty-state guard is part of T007's implementation
- The `buildNetworkBlock()` function removal (T004) also requires updating callers in background.ts, which is also modified in T007. **Execute T004 before T007** to avoid merge conflicts.
- Commit after each phase or logical group of tasks
