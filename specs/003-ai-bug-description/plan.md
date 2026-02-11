# Implementation Plan: AI-Generated Bug Descriptions

**Branch**: `003-ai-bug-description` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-ai-bug-description/spec.md`

## Summary

Add AI-powered bug title and description generation to the Jira bug tracker extension. When users configure a Claude or ChatGPT API key in settings, the report form offers a single "describe the issue" field plus a "Generate with AI" button. The AI receives the user's brief description along with redacted console entries and network requests, and returns a structured Jira-ready title and detailed description. Uses LangChain.js for unified provider abstraction and structured output parsing. Falls back to the standard manual form when AI is not configured.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `noUncheckedIndexedAccess: true`)
**Primary Dependencies**: WXT 0.19.0, LangChain.js (`@langchain/core`, `@langchain/anthropic`, `@langchain/openai`), Zod
**Storage**: `chrome.storage.local` for settings (including AI config), `chrome.storage.session` for buffers (unchanged)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Chrome Extension (Manifest V3, service worker)
**Project Type**: Single (Chrome extension)
**Performance Goals**: AI generation completes within 10 seconds (SC-001)
**Constraints**: Service worker 30s idle timeout, no DOM APIs in background, bundle size ~100KB increase from LangChain
**Scale/Scope**: Single user, two AI providers (Claude, OpenAI), 2 new service files, 5 modified files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Sentry-Grade Data Completeness | PASS | AI generation supplements existing capture — does not modify or reduce captured data |
| II. Secure OAuth Authentication | PASS | AI feature uses separate API keys (not OAuth tokens). Jira OAuth flow unchanged |
| III. Privacy & Data Security | PASS | FR-012 mandates redaction before AI transmission. Existing `redaction.ts` pipeline reused. No data leaves browser until user explicitly triggers generation |
| IV. Minimal User Friction | PASS | One-click generation, fallback to manual, editable output before submission |
| V. Chrome Extension Standards | PASS | MV3 compatible, LangChain uses standard Fetch API in service worker, no MV2 APIs. API key stored via `chrome.storage` API |
| Tech Constraints: No external runtime | CAUTION | AI calls go to external APIs (Anthropic/OpenAI) but this is user-initiated with user's own key — analogous to existing Jira API calls. No backend server required |

**Gate result**: PASS — all principles satisfied. "No external runtime" constraint noted: AI API calls are user-initiated external service calls (same pattern as Jira API), not a backend dependency.

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-bug-description/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Technology research
├── data-model.md        # Phase 1: Data model changes
├── quickstart.md        # Phase 1: Setup guide
├── contracts/
│   ├── ai-generation.md      # AI service interface + message protocol
│   ├── settings-extension.md  # Settings model changes + UI
│   └── report-form-extension.md  # Form mode switching + generate flow
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── models/
│   ├── types.ts              # MODIFY: Add AI types, extend ExtensionSettings
│   ├── settings.ts           # MODIFY: Update validation + defaults
│   └── bug-report.ts         # unchanged
├── services/
│   ├── ai-generator.ts       # NEW: LangChain provider abstraction + structured output
│   ├── ai-prompt.ts          # NEW: Prompt template + context preparation + redaction
│   ├── redaction.ts          # unchanged (reused by ai-prompt.ts)
│   ├── capture.ts            # unchanged
│   ├── jira-api.ts           # unchanged
│   └── adf-builder.ts        # unchanged
├── utils/
│   └── constants.ts          # MODIFY: Add AI constants
└── storage/
    └── chrome-storage.ts     # unchanged

entrypoints/
├── background.ts             # MODIFY: Add GENERATE_DESCRIPTION handler
└── popup/
    ├── App.ts                # MODIFY: Wire onGenerate callback, pass aiConfigured
    └── views/
        ├── ReportFormView.ts # MODIFY: AI/manual mode, generate button, loading state
        └── SettingsView.ts   # MODIFY: AI provider, API key, language fields

tests/
├── unit/
│   └── services/
│       ├── ai-generator.test.ts  # NEW: Provider routing, error mapping, structured output
│       └── ai-prompt.test.ts     # NEW: Context prep, redaction, truncation, prioritization
└── integration/                   # unchanged
```

**Structure Decision**: Follows existing single-project structure. Two new service files (`ai-generator.ts`, `ai-prompt.ts`) follow the established pattern of one service per concern (like `capture.ts`, `jira-api.ts`). No new directories needed.

## Complexity Tracking

No constitution violations to justify. LangChain adds bundle size (~100KB gzip) but was an explicit user choice (FR-011). The feature adds two new services and modifies five existing files — proportional complexity for the scope.
