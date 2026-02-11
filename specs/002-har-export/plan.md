# Implementation Plan: HAR File Export & Jira Attachment

**Branch**: `002-har-export` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-har-export/spec.md`

## Summary

Replace inline network request/response text in Jira issue descriptions with a HAR 1.2 file attachment. A new `har-builder` service converts the existing `NetworkRequest[]` data into a valid HAR 1.2 JSON structure, applies sensitive data redaction, and the submission handler uploads the resulting file as an attachment via the existing `uploadAttachment()` function. The `buildFullDescription()` ADF builder is modified to exclude the network code block when network requests are present (network data is conveyed solely through the HAR attachment).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `noUncheckedIndexedAccess: true`)
**Primary Dependencies**: WXT 0.19.0 (build/extension framework), no new dependencies required
**Storage**: `chrome.storage.session` for network buffer (per-tab), `chrome.storage.local` for settings
**Testing**: Vitest 2.1.0 + @webext-core/fake-browser 1.3.0 (unit/integration), Playwright 1.48.0 (e2e)
**Target Platform**: Chrome Extension (Manifest V3)
**Project Type**: Single project (Chrome extension)
**Performance Goals**: HAR generation must not add perceptible delay to bug report submission (<100ms for 500 requests)
**Constraints**: No new dependencies; HAR file built from existing captured data only (no additional network overhead); max 500 requests per HAR file; body data limited to 10 KB per request
**Scale/Scope**: Single new service file (~150 LOC), modifications to 2 existing files (background.ts, adf-builder.ts), 1 new test file, updates to 1 existing test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Sentry-Grade Data Completeness | PASS | HAR attachment provides richer, standards-compliant network data export. All currently captured data categories remain included. |
| II. Secure OAuth Authentication | PASS | No changes to auth flow. HAR upload uses existing `uploadAttachment()` which already uses OAuth bearer tokens. |
| III. Privacy & Data Security | PASS | Existing redaction rules (sensitive headers, field patterns) applied to HAR content before upload. Bodies remain truncated to configurable max size. No data leaves browser until user confirms submission. |
| IV. Minimal User Friction | PASS | No UX changes — HAR generation/upload happens transparently during existing submission flow. No additional user action required. |
| V. Chrome Extension Standards | PASS | No new permissions. No new APIs. Uses existing Manifest V3 architecture. All storage via `chrome.storage` API. |
| Technology Constraints | PASS | No external dependencies added. TypeScript strict mode. Direct Jira Cloud REST API v3 communication. Client-side only. |
| Development Workflow | PASS | Feature branch used. Linting and type checking enforced. Tests cover new and modified code. |

**Gate result: PASS** — No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-har-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── har-schema.json  # HAR 1.2 TypeScript interface contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── types.ts              # Add HarLog, HarEntry interfaces
├── services/
│   ├── har-builder.ts        # NEW: NetworkRequest[] → HAR 1.2 JSON conversion
│   ├── adf-builder.ts        # MODIFY: Remove network block from description when requests present
│   ├── redaction.ts          # EXISTING: Used by har-builder for header/body redaction
│   └── jira-api.ts           # EXISTING: uploadAttachment() used as-is
└── utils/
    └── constants.ts          # EXISTING: Add HAR_FILENAME constant

entrypoints/
└── background.ts             # MODIFY: SUBMIT_REPORT handler to generate HAR and upload as attachment

tests/
├── unit/
│   └── services/
│       ├── har-builder.test.ts    # NEW: HAR generation tests
│       └── adf-builder.test.ts    # MODIFY: Update tests for removed network block
└── integration/
    └── jira-api.test.ts           # EXISTING: Already covers uploadAttachment
```

**Structure Decision**: Follows existing single-project structure. One new service file (`har-builder.ts`) and one new test file (`har-builder.test.ts`). All other changes are modifications to existing files at their current locations.

## Complexity Tracking

> No violations — table not needed.
