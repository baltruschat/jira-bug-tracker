# Feature Specification: Jira Bug Capture Chrome Extension

**Feature Branch**: `001-jira-bug-capture`
**Created**: 2025-02-10
**Status**: Draft
**Input**: User description: "Implementiere das Plugin mit allen Features und den dazugehörigen Tests"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jira OAuth Connection (Priority: P1)

A tester or developer opens the extension for the first time and
connects it to one or more Jira Cloud instances. They authenticate
via their Atlassian account and grant the extension access. After
successful login the extension remembers each connection. The user
can add additional Jira sites at any time and does not need to
log in again until a token expires or is revoked.

**Why this priority**: Without a working Jira connection no bug
reports can be submitted. This is the foundational prerequisite
for all other functionality.

**Independent Test**: Can be fully tested by opening the extension,
clicking "Connect to Jira", completing the OAuth flow, and
verifying the connection status shows "Connected" with the user's
Jira display name.

**Acceptance Scenarios**:

1. **Given** the user has not connected to any Jira site yet,
   **When** they open the extension popup, **Then** they see an
   "Add Jira Site" button and a brief explanation of what
   permissions will be requested.
2. **Given** the user clicks "Add Jira Site", **When** the OAuth
   flow completes successfully, **Then** the extension displays the
   connected Jira site URL and user display name, and persists the
   session across browser restarts.
3. **Given** the user is already connected to one or more sites,
   **When** they open the extension popup, **Then** they see a list
   of connected sites with status indicators and options to add
   another site or disconnect individual sites.
4. **Given** the stored token for a site has expired, **When** the
   user triggers any operation targeting that site, **Then** the
   extension silently refreshes the token; if refresh fails, the
   user is prompted to re-authenticate for that specific site.
5. **Given** the user clicks "Disconnect" on a specific site,
   **When** they confirm, **Then** tokens for that site are removed
   and the site is removed from the connected sites list.

---

### User Story 2 - One-Click Bug Capture (Priority: P2)

A tester encounters a bug on a website. They click the extension
icon (or press a keyboard shortcut) and the extension immediately
captures a comprehensive snapshot of the current page state: a
screenshot of the visible viewport, recent console output, recent
network requests, browser and device information, and the current
page URL/title.

**Why this priority**: Data capture is the core value proposition.
Without reliable, comprehensive capture there is nothing to report.

**Independent Test**: Can be tested by navigating to any website,
triggering capture, and verifying that all data categories
(screenshot, console, network, environment, page context) appear
in the capture preview.

**Acceptance Scenarios**:

1. **Given** the user is on any website, **When** they click the
   extension icon or press the configured keyboard shortcut,
   **Then** a screenshot of the visible viewport is captured and
   all diagnostic data is collected within 2 seconds.
2. **Given** a capture was triggered, **When** the data collection
   completes, **Then** the extension displays a preview showing:
   screenshot thumbnail, number of console entries captured, number
   of network requests captured, and browser/OS information.
3. **Given** the page has active console output, **When** a capture
   is triggered, **Then** all console entries (log, warn, error,
   info) since the page loaded are included with timestamps and
   severity levels. Console interception begins at document_start
   to capture output from the very first call.
4. **Given** the page has made network requests, **When** a capture
   is triggered, **Then** recent XHR and Fetch requests are captured
   with method, URL, status code, timing, and response size.
   Sensitive headers (Authorization, Cookie) and request/response
   bodies are automatically redacted.
5. **Given** the page contains form fields with sensitive data
   (passwords, credit card numbers), **When** a capture is
   triggered, **Then** the screenshot redacts password input fields
   and the diagnostic data does not include sensitive form values.

---

### User Story 3 - Report Review & Submission to Jira (Priority: P3)

After capture the user reviews the collected data, adds a title
and description for the bug, selects a Jira project and issue type,
and submits the report. A Jira issue is created with all captured
data attached. The user receives a direct link to the new issue.

**Why this priority**: Review and submission completes the core
end-to-end flow. Without this, captured data cannot reach Jira.

**Independent Test**: Can be tested by performing a capture,
filling in the title and description, selecting a project,
submitting, and verifying the issue appears in Jira with all
attachments.

**Acceptance Scenarios**:

1. **Given** a capture has been completed, **When** the user views
   the report form, **Then** they see editable fields for: target
   Jira site (dropdown of connected sites), issue title,
   description, Jira project (dropdown of accessible projects on
   the selected site), and issue type (dropdown filtered by
   selected project).
2. **Given** the user is reviewing captured data, **When** they
   examine the network activity section, **Then** they can expand
   individual requests to see details and can remove specific
   entries they do not want included in the report.
3. **Given** the user has filled in all required fields, **When**
   they click "Submit to Jira", **Then** the extension creates a
   Jira issue with the title and description, attaches the
   screenshot as an image, and embeds all diagnostic data
   (console logs, network activity, environment info) directly
   in the issue description formatted as tables and code blocks.
4. **Given** the submission was successful, **When** the Jira issue
   is created, **Then** the extension displays a success message
   with a clickable link to the newly created Jira issue.
5. **Given** the submission fails (network error, permission
   denied), **When** the error occurs, **Then** the extension
   displays a clear error message, preserves all captured data,
   and allows the user to retry without re-capturing.

---

### User Story 4 - Screenshot Annotation (Priority: P4)

Before submitting a bug report the user can annotate the captured
screenshot to highlight the problematic area or redact sensitive
information visible on the page.

**Why this priority**: Annotations improve bug report clarity and
help developers locate the issue faster. However, the core flow
works without annotations.

**Independent Test**: Can be tested by capturing a screenshot,
using annotation tools to draw highlights and redaction boxes, and
verifying the annotated version is what gets submitted.

**Acceptance Scenarios**:

1. **Given** a screenshot has been captured, **When** the user
   clicks "Annotate", **Then** an annotation overlay opens showing
   the screenshot at full resolution with drawing tools.
2. **Given** the annotation editor is open, **When** the user
   selects the highlight tool, **Then** they can draw rectangular
   or freeform highlights in a configurable color to draw attention
   to specific areas.
3. **Given** the annotation editor is open, **When** the user
   selects the redact tool, **Then** they can draw opaque
   rectangles that permanently obscure the underlying content.
4. **Given** the user has made annotations, **When** they click
   "Done", **Then** the annotated screenshot replaces the original
   in the bug report and only the annotated version is submitted
   to Jira.
5. **Given** the user has made annotations, **When** they click
   "Reset", **Then** all annotations are removed and the original
   screenshot is restored.

---

### User Story 5 - Extension Settings (Priority: P5)

The user configures default preferences for the extension such as
the default Jira project, default issue type, keyboard shortcut,
which data categories to capture, and the maximum size for network
request body truncation.

**Why this priority**: Settings improve the experience for repeat
users but the extension works with sensible defaults out of the
box.

**Independent Test**: Can be tested by opening settings, changing
preferences, performing a capture, and verifying the new defaults
are applied.

**Acceptance Scenarios**:

1. **Given** the user opens the extension settings, **When** the
   settings page loads, **Then** they see options for: default Jira
   project, default issue type, keyboard shortcut configuration,
   data capture toggles (console, network, environment), and
   network body truncation limit.
2. **Given** the user sets a default project and issue type,
   **When** they trigger a new bug capture, **Then** the report
   form is pre-filled with those defaults.
3. **Given** the user disables network activity capture in settings,
   **When** they trigger a capture, **Then** network requests are
   not collected and the report does not include a network section.
4. **Given** the user changes the keyboard shortcut, **When** they
   press the new shortcut on any website, **Then** the bug capture
   is triggered using the new key combination.

---

### Edge Cases

- What happens when the user triggers capture on a browser-internal
  page (chrome://, about:blank)? The extension displays a message
  that capture is not available on browser-internal pages.
- What happens when the Jira API rate limit is exceeded? The
  extension shows a clear error message with the retry-after time
  and preserves the report for later submission.
- What happens when the user has access to many Jira projects
  (100+)? The project dropdown supports search/filter functionality
  to find the correct project quickly.
- What happens when the captured screenshot is very large? The
  screenshot is compressed to a reasonable file size (max 5 MB)
  before submission.
- What happens when the user's network is offline during capture?
  Capture still succeeds (all data is local); submission is blocked
  with a clear offline message and the report is preserved.
- What happens when the user closes the popup before submitting?
  Captured data is preserved in temporary storage so the user can
  resume where they left off when reopening the popup.
- What happens when console logs are extremely verbose (10,000+
  entries)? Logs are capped at the most recent 1,000 entries with
  a note indicating truncation.

## Clarifications

### Session 2025-02-10

- Q: Should diagnostic data be embedded in the Jira issue description, attached as files, or a hybrid? → A: All diagnostic data embedded in the Jira issue description (formatted as tables/code blocks).
- Q: When does console capture begin — at page load, on extension install, or on explicit user activation? → A: At page load. Content script injects at document_start and intercepts from the very first console call.
- Q: Can users connect to multiple Jira Cloud sites simultaneously or only one at a time? → A: Multiple Jira sites simultaneously. User selects which site when submitting a bug report.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate users with one or more Jira
  Cloud instances via OAuth 2.0 (3LO) without ever storing or
  transmitting Jira username/password credentials. Each connected
  site maintains its own independent OAuth session.
- **FR-002**: System MUST capture a screenshot of the visible
  browser viewport on demand.
- **FR-003**: System MUST capture console output (log, warn, error,
  info) with timestamps and severity levels. Interception MUST begin
  at page load (document_start) to capture from the first call.
- **FR-004**: System MUST capture recent network requests (XHR,
  Fetch) with method, URL, status code, timing, and response size.
- **FR-005**: System MUST capture browser environment data: browser
  name/version, OS, user agent, locale, screen resolution, device
  pixel ratio, and viewport dimensions.
- **FR-006**: System MUST capture page context: current URL, page
  title, and DOM readiness state.
- **FR-007**: System MUST automatically redact sensitive data (auth
  headers, cookies, password field values) from captured information
  before storage or transmission.
- **FR-008**: System MUST allow users to review and edit captured
  data before submission, including adding a title and description.
- **FR-009**: System MUST create a Jira issue with the bug report
  title, description, and screenshot attachment. All diagnostic data
  (console logs, network activity, environment info) MUST be embedded
  directly in the issue description formatted as tables and code
  blocks.
- **FR-010**: System MUST display a direct link to the created Jira
  issue after successful submission.
- **FR-011**: System MUST provide screenshot annotation tools
  (highlight and redact) before submission.
- **FR-012**: System MUST allow users to configure default Jira
  project, issue type, keyboard shortcut, and capture preferences.
- **FR-013**: System MUST handle OAuth token refresh automatically
  and prompt for re-authentication only when refresh fails.
- **FR-014**: System MUST preserve captured data if submission fails
  or the popup is closed, allowing the user to resume or retry.
- **FR-015**: System MUST complete all data capture within 2 seconds
  of the user triggering the capture action.
- **FR-016**: System MUST NOT degrade performance of the inspected
  page during data collection.
- **FR-017**: System MUST truncate network request/response bodies
  to a configurable maximum size.
- **FR-018**: System MUST support triggering capture via both a
  clickable extension icon and a configurable keyboard shortcut.
- **FR-019**: System MUST fetch and display available Jira projects
  and issue types from the user-selected Jira site. When multiple
  sites are connected, the user MUST select the target site before
  choosing a project.
- **FR-020**: System MUST provide a disconnect option per connected
  Jira site that removes the stored authentication tokens for that
  specific site.

### Key Entities

- **Bug Report**: A collection of captured diagnostic data plus
  user-provided title and description. Contains references to
  screenshot, console logs, network activity, and environment data.
  Has a lifecycle: captured, reviewed, submitted.
- **Screenshot**: A viewport image, optionally annotated with
  highlights and redaction boxes. Compressed before upload.
- **Console Entry**: A single console output line with timestamp,
  severity level (log/warn/error/info), and message content.
- **Network Request**: A captured HTTP request with method, URL,
  status code, response time, response size, and truncated
  request/response body (sensitive headers redacted).
- **Environment Snapshot**: Browser name, version, OS, user agent,
  locale, screen resolution, device pixel ratio, viewport width,
  viewport height.
- **Jira Connection**: The authenticated link to a single Jira Cloud
  instance, including site URL, user display name, and OAuth tokens.
  Multiple Jira Connections can exist simultaneously; each is
  managed independently.
- **Extension Settings**: User preferences for default Jira site,
  default project, issue type, keyboard shortcut, capture toggles,
  and truncation limits.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from encountering a bug to having a
  Jira issue created in under 60 seconds (excluding initial setup).
- **SC-002**: All captured diagnostic data (screenshot, console,
  network, environment) is present and correctly structured in
  100% of submitted Jira issues.
- **SC-003**: Data capture completes within 2 seconds of trigger on
  pages with up to 500 network requests and 1,000 console entries.
- **SC-004**: The extension renders its popup interface within
  500 milliseconds of being activated.
- **SC-005**: OAuth authentication flow completes successfully on
  first attempt for 95% of users with valid Jira Cloud accounts.
- **SC-006**: Zero sensitive data (passwords, auth tokens, cookies)
  is present in any submitted Jira issue after automatic redaction.
- **SC-007**: Users can annotate a screenshot (highlight + redact)
  and submit the annotated version within 30 seconds.
- **SC-008**: Failed submissions preserve captured data with a 100%
  recovery rate — no user ever needs to re-capture after an error.
- **SC-009**: The extension introduces no measurable page load
  delay (less than 50ms overhead) on the inspected website.
- **SC-010**: All features are covered by automated tests with a
  minimum of 80% code coverage.

### Assumptions

- Users have a Jira Cloud instance (Server/Data Center is out of
  scope for this initial version).
- Users have permission to create issues in at least one Jira
  project.
- The extension targets Google Chrome (Chromium-based browsers may
  work but are not explicitly supported).
- A reasonable maximum of 1,000 console entries and 500 network
  requests per capture is sufficient for typical debugging
  scenarios.
- Screenshot compression to max 5 MB is acceptable for Jira
  attachment limits.
- The extension does not need to work on mobile Chrome or Chrome OS
  in this version.
