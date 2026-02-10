<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (5 principles)
    - Technology & Integration Constraints
    - Development Workflow
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ reviewed (no changes needed)
    - .specify/templates/spec-template.md ✅ reviewed (no changes needed)
    - .specify/templates/tasks-template.md ✅ reviewed (no changes needed)
    - .specify/templates/checklist-template.md ✅ reviewed (no changes needed)
    - .specify/templates/agent-file-template.md ✅ reviewed (no changes needed)
  Follow-up TODOs: none
-->

# Jira Bug Tracker Chrome Extension Constitution

## Core Principles

### I. Sentry-Grade Data Completeness

Every bug report MUST capture comprehensive diagnostic context
comparable to industry-standard error tracking tools (e.g. Sentry).
The following data categories are mandatory for each captured report:

- **User data**: browser name/version, OS, user agent, locale
- **Viewport**: screen resolution, device pixel ratio, viewport dimensions
- **Network activity**: recent XHR/Fetch requests with method, URL,
  status code, timing, and response size (sensitive headers/bodies
  MUST be redacted)
- **Console logs**: all console output (log, warn, error, info)
  captured with timestamps and severity levels
- **Screenshot**: visible viewport screenshot at the moment of capture
- **Page context**: current URL, page title, DOM readiness state

Data collection MUST be non-intrusive and MUST NOT degrade the
performance of the inspected page.

### II. Secure OAuth Authentication

All communication with Jira MUST use OAuth 2.0 (3LO) for
authentication. Non-negotiable rules:

- No Jira credentials (username/password) are ever stored or
  transmitted by the extension
- OAuth tokens MUST be stored in `chrome.storage.session` or
  encrypted local storage; never in plain text or cookies
- Token refresh MUST be handled automatically and transparently
- The extension MUST gracefully handle expired/revoked tokens by
  prompting re-authentication
- OAuth scopes MUST follow the principle of least privilege (only
  request permissions needed for issue creation and attachment upload)

### III. Privacy & Data Security

Captured diagnostic data may contain sensitive information.
The extension MUST protect user privacy:

- Sensitive data (auth tokens, cookies, passwords visible in forms)
  MUST be automatically redacted before storage or transmission
- Network request/response bodies MUST be truncated to a
  configurable maximum size
- The extension MUST clearly communicate what data is being captured
  (transparency principle)
- No data MUST leave the browser until the user explicitly confirms
  the bug report submission
- All data transmission to Jira MUST use HTTPS exclusively

### IV. Minimal User Friction

Bug reporting MUST be fast and intuitive to encourage adoption.
Key requirements:

- One-click (or keyboard shortcut) to initiate bug capture
- Automatic data collection completes within 2 seconds of trigger
- The user MUST be able to review and edit the report before
  submission (title, description, additional context)
- Screenshot annotation (highlight, redact) SHOULD be supported
- The extension popup/panel MUST render within 500ms
- Successful submission MUST provide a direct link to the created
  Jira issue

### V. Chrome Extension Standards

The extension MUST follow modern Chrome extension best practices:

- Manifest V3 is mandatory; Manifest V2 APIs MUST NOT be used
- Permissions MUST follow the principle of least privilege;
  prefer optional permissions where possible
- Content scripts, background service workers, and popup UI
  MUST be cleanly separated
- The extension MUST handle Chrome extension lifecycle events
  (install, update, suspend) gracefully
- All extension storage MUST use the `chrome.storage` API
  (not localStorage)

## Technology & Integration Constraints

- **Platform**: Chrome Extension (Manifest V3)
- **Language**: TypeScript (strict mode enabled)
- **Build**: Bundler required (e.g. Vite, webpack, or Rollup)
  for content scripts, service worker, and popup
- **Target API**: Atlassian Jira Cloud REST API v3
- **Auth**: OAuth 2.0 (3LO) via Atlassian's authorization flow
- **Screenshot**: `chrome.tabs.captureVisibleTab` API
- **Network capture**: `chrome.devtools.network` or
  `chrome.webRequest` API
- **Console capture**: Content script injection for
  `console.*` interception
- **Storage**: `chrome.storage.local` for settings,
  `chrome.storage.session` for auth tokens
- **No external runtime dependencies**: The extension MUST NOT
  require a backend server; all logic runs client-side with
  direct Jira API communication

## Development Workflow

- Feature branches MUST be used for all changes
- Code MUST pass linting (ESLint) and type checking (tsc)
  before merge
- Manual testing in Chrome MUST verify the full capture-to-Jira
  flow before any release
- The extension MUST be testable in Chrome's developer mode
  without requiring Chrome Web Store publication
- Version numbering follows `MAJOR.MINOR.PATCH` aligned with
  Chrome extension versioning requirements

## Governance

This constitution is the authoritative source for project
principles and constraints. All implementation decisions MUST
align with these principles.

- **Amendments**: Any change to this constitution MUST be
  documented with a version bump and rationale
- **Versioning**: Constitution versions follow semantic versioning
  (MAJOR for principle removals/redefinitions, MINOR for additions,
  PATCH for clarifications)
- **Compliance**: All code reviews MUST verify adherence to these
  principles; violations MUST be resolved before merge
- **Conflicts**: If a technical decision conflicts with a principle,
  the principle takes precedence unless a formal amendment is made

**Version**: 1.0.0 | **Ratified**: 2025-02-10 | **Last Amended**: 2025-02-10
