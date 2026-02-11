# Quickstart: AI-Generated Bug Descriptions

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## Prerequisites

- Node.js 18+
- pnpm installed
- Chrome browser (for manual testing)

## Setup

```bash
# Install new dependencies
pnpm add langchain @langchain/core @langchain/anthropic @langchain/openai zod

# Verify build
pnpm run build

# Run tests
pnpm test
```

## New Files to Create

| File | Purpose |
|------|---------|
| `src/services/ai-generator.ts` | LangChain integration, provider abstraction, structured output |
| `src/services/ai-prompt.ts` | Prompt template, context preparation, redaction + truncation |

## Files to Modify

| File | Change |
|------|--------|
| `src/models/types.ts` | Add `AIGenerationResult`, `AIGenerationError`, extend `ExtensionSettings` |
| `src/utils/constants.ts` | Add AI-related constants (model names, context budget, timeout) |
| `src/models/settings.ts` | Update `validateSettings()` for new AI fields, update `DEFAULT_SETTINGS` |
| `entrypoints/popup/views/SettingsView.ts` | Add AI provider dropdown, API key input, language selector |
| `entrypoints/popup/views/ReportFormView.ts` | Add AI/manual mode toggle, generate button, loading state |
| `entrypoints/popup/App.ts` | Wire `onGenerate` callback, pass `aiConfigured` flag |
| `entrypoints/background.ts` | Handle `GENERATE_DESCRIPTION` message |

## New Test Files

| File | Coverage |
|------|----------|
| `tests/unit/services/ai-generator.test.ts` | LangChain integration, provider routing, error mapping |
| `tests/unit/services/ai-prompt.test.ts` | Context preparation, redaction, truncation, prioritization |

## Architecture Overview

```
Popup (ReportFormView)
  │
  │ chrome.runtime.sendMessage({ type: 'GENERATE_DESCRIPTION' })
  │
  ▼
Background (service worker)
  │
  │ 1. Load pending report from storage
  │ 2. Load settings (provider, key, language)
  │ 3. prepareAIContext() — redact + truncate
  │ 4. generateBugDescription() — LangChain call
  │
  ▼
AI Provider (Claude / OpenAI)
  │
  │ Structured output: { title, description }
  │
  ▼
Background → Popup (response)
  │
  ▼
ReportFormView populates editable title + description fields
```

## Manual Testing Checklist

1. Open settings → select Claude → enter API key → save → reopen → verify masked key shown
2. Open settings → select OpenAI → enter API key → save → verify provider switch
3. Capture a page with console errors → report form shows AI mode → enter description → click Generate → verify title + description populated
4. Click "Manual" → verify standard title/description fields appear
5. Click "Use AI" → verify AI mode returns
6. Configure invalid API key → click Generate → verify error message shown
7. Clear API key in settings → report form shows manual mode only
8. Test with empty user description → verify behavior (generation from captured data only)
