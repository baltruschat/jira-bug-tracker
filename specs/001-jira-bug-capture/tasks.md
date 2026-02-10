# Tasks: Jira Bug Capture Chrome Extension

**Input**: Design documents from `/specs/001-jira-bug-capture/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — user requested all features with tests. Target: 80% code coverage (SC-010).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Entrypoints**: `entrypoints/` (WXT file-based entrypoints)
- **Shared logic**: `src/` (services, models, storage, utils)
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize WXT project, configure TypeScript, testing, and linting

- [x] T001 Initialize WXT project with TypeScript: run `pnpm create wxt` and configure `wxt.config.ts` with Chrome MV3 target, TypeScript strict mode, and SCSS support
- [x] T002 Configure `package.json` with scripts: `dev`, `build`, `test`, `test:coverage`, `test:e2e`, and `lint`
- [x] T003 [P] Create `.env.example` with `ATLASSIAN_CLIENT_ID` and `ATLASSIAN_CLIENT_SECRET` placeholders; add `.env` to `.gitignore`
- [x] T004 [P] Configure `tsconfig.json` with strict mode, path aliases (`@/` → `src/`), and Chrome extension type definitions
- [x] T005 [P] Configure ESLint with TypeScript plugin in `eslint.config.js`
- [x] T006 Configure Vitest in `vitest.config.ts` with WXT plugin, `@webext-core/fake-browser` for chrome.* API mocking, and coverage reporter
- [x] T007 Configure Playwright for Chrome extension E2E testing in `playwright.config.ts` with `chromium.launchPersistentContext` and `--load-extension` flag
- [x] T008 Create test fixtures directory `tests/e2e/fixtures/test-page.html` with sample console output, network requests, and form fields for E2E scenarios

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, storage layer, constants, and extension entry point skeletons that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T009 Define all TypeScript interfaces and types in `src/models/types.ts`: JiraConnection, ExtensionSettings, BugReport, Screenshot, Annotation, ConsoleEntry, NetworkRequest, EnvironmentSnapshot, PageContext, and all message types from contracts/internal-messaging.md
- [x] T010 Implement typed chrome.storage wrapper in `src/storage/chrome-storage.ts`: generic get/set/remove for `chrome.storage.local` and `chrome.storage.session` with type-safe keys from contracts (connections, settings, pendingReport, tokens:{id}, consoleBuffer:{tabId}, networkBuffer:{tabId})
- [x] T011 [P] Define constants in `src/utils/constants.ts`: OAuth URLs (auth.atlassian.com/authorize, auth.atlassian.com/oauth/token, api.atlassian.com base), default ExtensionSettings values, scope strings, max limits (1000 console entries, 500 network requests, 5MB screenshot, 10KB body truncation)
- [x] T012 [P] Implement sensitive data redaction service in `src/services/redaction.ts`: redactHeaders (strip Authorization, Cookie, Set-Cookie, X-API-Key), redactBody (truncate to configurable max), redactFormValues (detect password/credit card fields)
- [x] T013 Create popup HTML shell in `entrypoints/popup/index.html` with root mount element and link to `main.ts`
- [x] T014 Create popup entry point in `entrypoints/popup/main.ts` and base app router in `entrypoints/popup/App.ts` with view navigation (connect, capture, report, annotation, settings, success)
- [x] T015 [P] Create base popup styles in `entrypoints/popup/style.scss` with extension popup dimensions (400x600), typography, form controls, buttons, and loading/error states
- [x] T016 Create service worker skeleton in `entrypoints/background.ts` with WXT `defineBackground()`, chrome.runtime.onMessage listener dispatching by message type, and chrome.action.onClicked handler
- [x] T017 [P] Create ISOLATED world content script skeleton in `entrypoints/content.ts` with WXT `defineContentScript()` matching `<all_urls>` at `document_start`, window.postMessage relay to chrome.runtime.sendMessage
- [x] T018 [P] Create MAIN world content script skeleton in `entrypoints/injected.ts` registered via `chrome.scripting.registerContentScripts` with `world: "MAIN"` and `runAt: "document_start"` — empty console/fetch intercept hooks ready to be filled

### Foundational Tests

- [x] T019 [P] Unit test for chrome-storage wrapper in `tests/unit/storage/chrome-storage.test.ts`: test get/set/remove for local and session storage using fake-browser
- [x] T020 [P] Unit test for redaction service in `tests/unit/services/redaction.test.ts`: test header redaction, body truncation, form value detection, edge cases (empty input, no sensitive data, all sensitive data)
- [x] T021 [P] Unit test for constants in `tests/unit/utils/constants.test.ts`: verify all default values match data-model.md defaults, OAuth URLs are valid

**Checkpoint**: Foundation ready — all types defined, storage layer working, entry point skeletons in place. User story implementation can begin.

---

## Phase 3: User Story 1 — Jira OAuth Connection (Priority: P1) MVP

**Goal**: Users can connect to one or more Jira Cloud sites via OAuth 2.0 (3LO), view connection status, and disconnect individual sites.

**Independent Test**: Open extension → click "Add Jira Site" → complete OAuth → verify connected site shows display name and URL.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T022 [P] [US1] Unit test for auth service in `tests/unit/services/auth.test.ts`: test buildAuthorizationUrl (state param, scopes, redirect), exchangeCodeForTokens (mock fetch), refreshAccessToken (rotating token storage), isTokenExpired, handleAuthCallback (state validation)
- [x] T023 [P] [US1] Unit test for connection model in `tests/unit/models/connection.test.ts`: test createConnection, removeConnection, getConnections, getConnectionById, updateTokens
- [x] T024 [P] [US1] Integration test for auth flow in `tests/integration/auth-flow.test.ts`: test full OAuth flow with mocked chrome.identity.launchWebAuthFlow and mocked token endpoint, verify tokens stored in session storage and metadata in local storage

### Implementation for User Story 1

- [x] T025 [P] [US1] Implement CSRF state generator in `src/utils/crypto.ts`: generateState() using crypto.getRandomValues, validateState() comparing stored vs received
- [x] T026 [US1] Implement OAuth auth service in `src/services/auth.ts`: buildAuthorizationUrl(), launchOAuthFlow() via chrome.identity.launchWebAuthFlow, exchangeCodeForTokens() POST to auth.atlassian.com/oauth/token, refreshAccessToken() with rotating token update, fetchAccessibleResources() GET accessible-resources, isTokenExpired(), getValidToken() (auto-refresh if expired)
- [x] T027 [US1] Implement JiraConnection entity logic in `src/models/connection.ts`: addConnection(), removeConnection(), getConnections(), getConnectionById(), updateConnectionTokens() — store metadata in chrome.storage.local, tokens in chrome.storage.session
- [x] T028 [US1] Wire OAuth message handlers in `entrypoints/background.ts`: handle START_OAUTH, DISCONNECT_SITE messages from popup, call auth service, return results
- [x] T029 [US1] Implement ConnectView in `entrypoints/popup/views/ConnectView.ts`: "Add Jira Site" button (when no sites), connected sites list with site URL, display name, avatar, status indicator, "Add another site" button, per-site "Disconnect" button with confirmation
- [x] T030 [US1] E2E test for OAuth connection in `tests/e2e/connect.spec.ts`: test popup shows "Add Jira Site" initially, mock OAuth flow, verify connected state persists after popup close/reopen, test disconnect removes site

**Checkpoint**: User Story 1 complete. Users can connect to Jira, see connection status, and disconnect. Token refresh works transparently.

---

## Phase 4: User Story 2 — One-Click Bug Capture (Priority: P2)

**Goal**: One click captures screenshot, console logs, network requests, browser environment, and page context within 2 seconds.

**Independent Test**: Navigate to test page → trigger capture → verify all 5 data categories appear in preview with correct values.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T031 [P] [US2] Unit test for console collector in `tests/unit/services/console-collector.test.ts`: test addEntry, getEntries, clearBuffer, FIFO overflow at 1000 entries, entry format (timestamp, level, message, source)
- [x] T032 [P] [US2] Unit test for network collector in `tests/unit/services/network-collector.test.ts`: test addRequest, updateRequest (onCompleted), correlateBody, getRequests, redaction of sensitive headers, body truncation
- [x] T033 [P] [US2] Unit test for capture orchestrator in `tests/unit/services/capture.test.ts`: test captureAll() assembles BugReport from screenshot + console + network + environment + pageContext, respects settings toggles (captureConsole=false skips console), completes within timeout
- [x] T034 [P] [US2] Unit test for environment detection in `tests/unit/utils/environment.test.ts`: test getEnvironmentSnapshot() returns all fields (browserName, version, OS, userAgent, locale, screen dimensions, DPR, viewport)

### Implementation for User Story 2

- [x] T035 [P] [US2] Implement environment detection in `src/utils/environment.ts`: getEnvironmentSnapshot() parsing navigator.userAgent for browser name/version/OS, reading screen.width/height, window.devicePixelRatio, window.innerWidth/innerHeight, navigator.language
- [x] T036 [P] [US2] Implement console collector in `src/services/console-collector.ts`: monkey-patch console.log/warn/error/info in MAIN world, serialize arguments, buffer entries with FIFO cap at consoleMaxEntries, getEntries() returns buffer copy, clearBuffer()
- [x] T037 [P] [US2] Implement network collector in `src/services/network-collector.ts`: webRequest listener registration (onBeforeRequest, onCompleted, onErrorOccurred), per-tab request map, correlateBody() matching monkey-patch data by URL+method+timestamp, apply redaction via redaction service, getRequests() returns collected requests
- [x] T038 [US2] Implement MAIN world console/fetch interception in `entrypoints/injected.ts`: monkey-patch console.* (buffer + postMessage), monkey-patch fetch() (clone response, read truncated body, postMessage), monkey-patch XMLHttpRequest (capture responseText on load, postMessage)
- [x] T039 [US2] Implement ISOLATED world relay in `entrypoints/content.ts`: listen for postMessage from MAIN world, validate origin, forward CONSOLE_ENTRIES_BATCH and NETWORK_BODY_CAPTURED to service worker via chrome.runtime.sendMessage; handle TRIGGER_CAPTURE from service worker, collect pageContext + environment, return CAPTURE_RESULT
- [x] T040 [US2] Implement screenshot capture in `src/services/screenshot.ts`: captureScreenshot() via chrome.tabs.captureVisibleTab (PNG format), compressScreenshot() to max 5MB, dataUrlToBlob() conversion for upload
- [x] T041 [US2] Implement capture orchestrator in `src/services/capture.ts`: captureAll() coordinates screenshot (service worker), console entries (from buffer), network requests (from collector), environment + pageContext (from content script), assembles BugReport entity with status="captured", stores in chrome.storage.local as pendingReport
- [x] T042 [US2] Wire capture handlers in `entrypoints/background.ts`: register webRequest listeners on install, handle START_CAPTURE from popup (orchestrate capture, return BugReport), handle CONSOLE_ENTRIES_BATCH and NETWORK_BODY_CAPTURED from content scripts
- [x] T043 [US2] Implement CaptureView in `entrypoints/popup/views/CaptureView.ts`: show loading during capture, then display screenshot thumbnail, console entry count + severity breakdown, network request count, environment summary
- [x] T044 [P] [US2] Implement preview components in `entrypoints/popup/components/`: ConsolePreview.ts (expandable list with severity icons, timestamps), NetworkPreview.ts (expandable request list with method/URL/status/timing, removable entries), ScreenshotPreview.ts (thumbnail with click-to-expand)
- [x] T045 [US2] E2E test for bug capture in `tests/e2e/capture.spec.ts`: navigate to test-page.html fixture, trigger capture, verify screenshot exists, console entries match fixture output, network requests present, environment data populated, page URL/title correct

**Checkpoint**: User Story 2 complete. One-click capture collects all diagnostic data. Preview shows summary. Capture works independently of Jira connection.

---

## Phase 5: User Story 3 — Report Review & Submission to Jira (Priority: P3)

**Goal**: User reviews captured data, fills in title/description, selects Jira site/project/issue type, submits, and receives a direct link to the created issue.

**Independent Test**: Perform capture → fill form → submit → verify Jira issue exists with screenshot, ADF tables, and code blocks.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T046 [P] [US3] Unit test for ADF builder in `tests/unit/services/adf-builder.test.ts`: test buildEnvironmentTable (ADF table with Property/Value rows), buildConsoleBlock (ADF codeBlock with entries), buildNetworkBlock (ADF codeBlock with requests), buildFullDescription (assembles heading + description + environment table + console block + network block), validate ADF rules (tableCell contains paragraph, codeBlock has no marks)
- [x] T047 [P] [US3] Unit test for bug report model in `tests/unit/models/bug-report.test.ts`: test lifecycle transitions (capturing→captured→submitting→submitted, capturing→captured→submitting→error), savePendingReport, loadPendingReport, clearPendingReport
- [x] T048 [P] [US3] Integration test for Jira API client in `tests/integration/jira-api.test.ts`: test createIssue (mock fetch, verify ADF body), uploadAttachment (mock FormData, verify X-Atlassian-Token header), listProjects (pagination), listIssueTypes (filter subtasks), getCurrentUser

### Implementation for User Story 3

- [x] T049 [US3] Implement Jira REST API client in `src/services/jira-api.ts`: authenticated fetch wrapper (auto-refresh token via auth service), createIssue(), uploadAttachment() (FormData + X-Atlassian-Token: no-check), listProjects() (paginated with query search), listIssueTypes() (filter subtask=true), getCurrentUser(), all using base URL `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3`
- [x] T050 [US3] Implement ADF builder in `src/services/adf-builder.ts`: buildEnvironmentTable() → ADF table node, buildConsoleBlock() → ADF codeBlock (language: text), buildNetworkBlock() → ADF codeBlock (language: json), buildFullDescription() → complete ADF doc with headings, user description paragraph, environment table, console block, network block, following ADF validation rules from research.md
- [x] T051 [US3] Implement BugReport entity logic in `src/models/bug-report.ts`: createReport(), updateReportStatus(), savePendingReport() to chrome.storage.local, loadPendingReport(), clearPendingReport(), removeNetworkEntry() (user removes specific request from report)
- [x] T052 [US3] Implement ReportFormView in `entrypoints/popup/views/ReportFormView.ts`: site selector dropdown (connected sites), title input (required), description textarea, project dropdown (fetched from selected site with search filter), issue type dropdown (fetched on project change, subtasks filtered), editable console/network previews, "Submit to Jira" button
- [x] T053 [P] [US3] Implement selector components: SiteSelector.ts in `entrypoints/popup/components/SiteSelector.ts` (connected sites dropdown), ProjectSelector.ts in `entrypoints/popup/components/ProjectSelector.ts` (searchable project dropdown with pagination), IssueTypeSelector.ts in `entrypoints/popup/components/IssueTypeSelector.ts` (issue type dropdown, subtasks hidden)
- [x] T054 [US3] Implement SuccessView in `entrypoints/popup/views/SuccessView.ts`: display success message, issue key, clickable link to Jira issue (opens in new tab), "Report another bug" button
- [x] T055 [US3] Wire submission handlers in `entrypoints/background.ts`: handle SUBMIT_REPORT message — call jira-api.createIssue() with ADF description, then uploadAttachment() with screenshot blob, update report status, return SUBMIT_RESULT with issueKey and issueUrl; handle errors (preserve report on failure)
- [x] T056 [US3] E2E test for submission in `tests/e2e/submit.spec.ts`: mock Jira API endpoints, perform capture, fill form, submit, verify success view shows issue link, verify API called with correct ADF body and screenshot attachment

**Checkpoint**: User Story 3 complete. Full end-to-end flow works: capture → review → submit → Jira issue with all data. This is the core MVP.

---

## Phase 6: User Story 4 — Screenshot Annotation (Priority: P4)

**Goal**: Users can annotate captured screenshots with highlight and redact rectangles before submission.

**Independent Test**: Capture screenshot → open annotation editor → draw highlight and redact → click Done → verify annotated version replaces original.

### Tests for User Story 4

- [x] T057 [P] [US4] Unit test for screenshot annotation in `tests/unit/services/screenshot.test.ts`: test addAnnotation (highlight/redact), removeAnnotation, resetAnnotations, renderAnnotations (canvas operations), exportAnnotatedScreenshot (dataUrl output), undo stack behavior

### Implementation for User Story 4

- [x] T058 [US4] Implement annotation logic in `src/services/screenshot.ts`: addAnnotation() (push to annotations array), removeLastAnnotation() (undo), resetAnnotations(), renderAnnotations() (draw on canvas: highlight = semi-transparent colored rect, redact = opaque black rect), exportAnnotatedScreenshot() (canvas.toDataURL)
- [x] T059 [US4] Implement AnnotationView in `entrypoints/popup/views/AnnotationView.ts`: full-resolution canvas overlay, tool palette (highlight with color picker, redact), mouse/touch event handlers for drawing rectangles, Done button (export + replace screenshot in report), Reset button (restore original), Undo button
- [x] T060 [US4] Integrate annotation into capture flow: add "Annotate" button to CaptureView/ReportFormView that opens AnnotationView, on Done return annotated screenshot to report, update ScreenshotPreview to show annotated version

**Checkpoint**: User Story 4 complete. Screenshots can be annotated before submission.

---

## Phase 7: User Story 5 — Extension Settings (Priority: P5)

**Goal**: Users configure defaults (Jira site, project, issue type), keyboard shortcut, capture toggles, and truncation limits.

**Independent Test**: Open settings → change defaults → trigger capture → verify form pre-filled with new defaults and capture respects toggles.

### Tests for User Story 5

- [x] T061 [P] [US5] Unit test for settings model in `tests/unit/models/settings.test.ts`: test getSettings (returns defaults when no stored settings), saveSettings, mergeSettings (partial update), validateSettings (networkBodyMaxSize > 0, consoleMaxEntries > 0)

### Implementation for User Story 5

- [x] T062 [US5] Implement ExtensionSettings entity logic in `src/models/settings.ts`: getSettings() (load from chrome.storage.local with defaults fallback), saveSettings(), mergeSettings() (partial update), validateSettings(), DEFAULT_SETTINGS constant
- [x] T063 [US5] Implement SettingsView in `entrypoints/popup/views/SettingsView.ts`: default site selector, default project dropdown, default issue type dropdown, keyboard shortcut configuration (chrome.commands API), capture toggles (console, network, environment), network body truncation limit input, save button
- [x] T064 [US5] Integrate settings into capture and report flows: capture.ts reads settings to respect captureConsole/captureNetwork/captureEnvironment toggles and truncation limit; ReportFormView pre-fills site/project/type from defaults
- [x] T065 [US5] E2E test for settings in `tests/e2e/settings.spec.ts`: change settings, trigger capture, verify toggles respected (disable network → no network in report), verify defaults pre-filled in report form

**Checkpoint**: User Story 5 complete. All user preferences work.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, performance, and final validation

- [x] T066 Implement edge case handling across all entry points: browser-internal page detection (chrome://, about:blank → show message in popup), offline detection (navigator.onLine check before submit → preserve report), rate limit handling (429 response → show retry-after time), popup close/reopen recovery (load pendingReport from storage on popup open)
- [x] T067 [P] Implement project search/filter for large project lists (100+) in ProjectSelector.ts using the `query` param on `/rest/api/3/project/search`
- [x] T068 [P] Implement console log truncation indicator: when buffer exceeds consoleMaxEntries, add a note in capture preview and ADF description indicating entries were truncated
- [ ] T069 Performance validation: verify capture completes within 2 seconds on test page with 500 network requests and 1000 console entries (add performance assertion to `tests/e2e/capture.spec.ts`)
- [ ] T070 Run quickstart.md validation: follow all steps in `specs/001-jira-bug-capture/quickstart.md` end-to-end to verify setup, dev, build, and test workflows
- [x] T071 Run `pnpm test:coverage` and verify 80% code coverage target (SC-010); add missing tests for uncovered branches

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational — No dependencies on other stories (capture works without Jira connection)
- **User Story 3 (Phase 5)**: Depends on Foundational + US1 (needs auth for API calls) + US2 (needs captured data to submit)
- **User Story 4 (Phase 6)**: Depends on US2 (needs captured screenshot to annotate)
- **User Story 5 (Phase 7)**: Depends on Foundational + US1 (needs connections for default site) + US2 (settings affect capture)
- **Polish (Phase 8)**: Depends on all user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/utils before services
- Services before entry point wiring
- Entry point wiring before UI views
- UI views before E2E tests
- Story complete before checkpoint

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005)
- All Foundational tasks marked [P] can run in parallel (T011, T012, T015, T017, T018, T019, T020, T021)
- US1 and US2 can proceed in parallel after Foundational phase (they are independent)
- Within each story, all test tasks marked [P] can run in parallel
- Within US2, implementation tasks T035, T036, T037 are parallelizable (different files)
- Within US3, selector components (T053) can be built in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all tests for US2 together:
Task: T031 "Unit test for console collector"
Task: T032 "Unit test for network collector"
Task: T033 "Unit test for capture orchestrator"
Task: T034 "Unit test for environment detection"

# Launch parallelizable implementation tasks:
Task: T035 "Implement environment detection"
Task: T036 "Implement console collector"
Task: T037 "Implement network collector"

# Then sequential (depends on above):
Task: T038 "Implement MAIN world interception"  (depends on T036, T037)
Task: T039 "Implement ISOLATED world relay"      (depends on T038)
Task: T040 "Screenshot capture"                  (independent)
Task: T041 "Capture orchestrator"                (depends on T035-T040)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (OAuth connection)
4. Complete Phase 4: User Story 2 (Bug capture) — can run in parallel with US1
5. Complete Phase 5: User Story 3 (Review & submit)
6. **STOP and VALIDATE**: Full end-to-end flow works (connect → capture → submit)
7. Load in Chrome, test manually against a real Jira Cloud instance

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (OAuth) → Test independently → Users can connect to Jira
3. US2 (Capture) → Test independently → Users can capture bug data
4. US3 (Submit) → Test independently → **Full MVP — capture to Jira works!**
5. US4 (Annotation) → Test independently → Screenshots can be annotated
6. US5 (Settings) → Test independently → Defaults and preferences work
7. Polish → Edge cases, performance, coverage target

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
