# Feature Specification: HAR File Export & Jira Attachment

**Feature Branch**: `002-har-export`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "Aus dem Network-Tab soll statt dem JSON Response die .har Datei exportiert werden und in den Jira-Task als Anhang ergänzt werden"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - HAR File Attached to Jira Issue (Priority: P1)

When a user submits a bug report, the captured network traffic is exported as a standard HAR 1.2 file and uploaded as an attachment to the created Jira issue, instead of embedding raw network request/response data as text in the issue description.

**Why this priority**: This is the core feature request. Replacing inline network text with a proper HAR attachment makes network data more useful — HAR files can be imported into browser DevTools, Charles Proxy, and other analysis tools, while also keeping the Jira issue description cleaner and more readable.

**Independent Test**: Can be fully tested by submitting a bug report with network capture enabled and verifying that the resulting Jira issue has a `.har` file attachment containing valid HAR 1.2 JSON with the captured requests.

**Acceptance Scenarios**:

1. **Given** a user has network capture enabled and has browsed a page generating network traffic, **When** they submit a bug report, **Then** the created Jira issue has a `.har` file attachment containing all captured network requests in valid HAR 1.2 format.
2. **Given** a user submits a bug report with network data, **When** the Jira issue is created, **Then** the issue description no longer contains inline network request/response text blocks — network data is conveyed exclusively through the HAR attachment.
3. **Given** a user downloads the attached `.har` file from Jira, **When** they import it into Chrome DevTools (Network tab → Import HAR), **Then** the requests are displayed correctly with method, URL, status, timing, and available body data.

---

### User Story 2 - Sensitive Data Redaction in HAR File (Priority: P1)

Sensitive data (authorization headers, tokens, passwords, credit card numbers) must be redacted in the exported HAR file, maintaining the same privacy protections that currently exist for inline network data.

**Why this priority**: Security and privacy are non-negotiable. HAR files can contain highly sensitive data, and since they are uploaded to Jira (potentially visible to team members), redaction must be in place from day one.

**Independent Test**: Can be tested by capturing network traffic that includes authorization headers and sensitive form fields, submitting a report, and verifying the HAR file has redacted values for all sensitive fields.

**Acceptance Scenarios**:

1. **Given** the extension does not capture full request/response headers, **When** the HAR file is generated, **Then** header arrays are empty, preventing any sensitive header data (authorization, cookie, set-cookie, x-api-key) from leaking into the attachment.
2. **Given** captured request/response bodies contain sensitive field values (passwords, tokens, credit card numbers), **When** the HAR file is generated, **Then** those field values are redacted according to the existing redaction rules.

---

### User Story 3 - HAR Export With No Network Data (Priority: P2)

When a user submits a bug report but no network requests were captured (e.g., network capture is disabled or no requests occurred), the system gracefully skips HAR file generation without errors.

**Why this priority**: Important for robustness but not the core feature. Users may have network capture disabled or submit reports on pages with no network activity.

**Independent Test**: Can be tested by disabling network capture in settings, submitting a bug report, and verifying the issue is created successfully without a HAR attachment and without errors.

**Acceptance Scenarios**:

1. **Given** network capture is disabled in extension settings, **When** the user submits a bug report, **Then** no HAR file is generated or attached, and the issue is created successfully.
2. **Given** network capture is enabled but no network requests were recorded, **When** the user submits a bug report, **Then** no HAR file is attached, and the issue is created successfully.

---

### Edge Cases

- What happens when the HAR file exceeds Jira's attachment size limit? The system should handle this gracefully (e.g., truncate older requests or notify the user).
- What happens when the HAR attachment upload fails but the issue was already created? The issue should still be created successfully; the user should be notified that the network attachment failed.
- What happens when captured request/response bodies exceed the current per-request body size limit? The HAR file should include whatever body data was captured (up to the existing limit) and indicate truncation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST convert captured network requests into a valid HAR 1.2 format file conforming to the HAR specification.
- **FR-002**: System MUST attach the generated `.har` file to the Jira issue as a file attachment when submitting a bug report with network data.
- **FR-003**: System MUST remove inline network request/response data from the Jira issue description — network data is conveyed exclusively through the HAR attachment.
- **FR-004**: System MUST apply the existing sensitive data redaction rules (headers and body fields) to the HAR file content before upload.
- **FR-005**: System MUST include all available request metadata in the HAR file: method, URL, status code, timing (start time, duration), response size, and any captured request/response bodies.
- **FR-006**: System MUST skip HAR file generation when no network requests are available (network capture disabled or no requests recorded).
- **FR-007**: System MUST handle HAR attachment upload failures gracefully — the Jira issue should still be created, and the user should be informed of the attachment failure.
- **FR-008**: System MUST name the HAR attachment file descriptively (e.g., `network-capture.har`).

### Key Entities

- **HAR File**: A JSON file following the HAR 1.2 specification containing a log object with creator metadata and an array of entry objects representing captured HTTP transactions.
- **HAR Entry**: A single HTTP transaction within the HAR file, containing request details (method, URL, headers, body), response details (status, headers, body), and timing information.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every bug report submitted with network capture enabled results in a valid `.har` file attached to the Jira issue that can be successfully imported into Chrome DevTools.
- **SC-002**: The Jira issue description is shorter and more readable — no inline network request blocks appear in the description when network data is present.
- **SC-003**: All sensitive data fields currently redacted in inline network text are equally redacted in the HAR file output — zero sensitive values leak into the attachment.
- **SC-004**: Bug report submission with network data completes within the same perceived time as before (no noticeable delay from HAR generation and upload).

## Assumptions

- The existing attachment upload capability supports uploading `.har` files (JSON content as a file) without modification.
- The Jira instance's attachment size limit is sufficient for typical HAR files (which contain only metadata and truncated bodies, not full binary payloads).
- HAR 1.2 is the appropriate standard — it is the most widely supported version across DevTools and analysis tools.
- Request and response headers beyond those already captured (authorization, cookie, set-cookie, x-api-key, content-length) are not currently stored in the network buffer. The HAR file will include only the data currently captured. Capturing additional headers is out of scope for this feature.
- The existing network body size limit (10 KB per request) and request buffer limit (500 requests) remain unchanged.
- The HAR file size stays well within Jira Cloud's default 10 MB attachment limit given the existing body truncation (10 KB per request) and request cap (500 requests). Explicit size-limit checking is deferred unless real-world usage reveals oversized files.
