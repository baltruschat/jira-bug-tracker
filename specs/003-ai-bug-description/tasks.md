# Tasks: AI-Generated Bug Descriptions

**Input**: Design documents from `/specs/003-ai-bug-description/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies required for AI integration

- [ ] T001 Install LangChain and Zod dependencies via `pnpm add langchain @langchain/core @langchain/anthropic @langchain/openai zod`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, constants, and settings model changes that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Add AI types (`AIGenerationRequest`, `AIGenerationResult`, `AIGenerationError`) and extend `ExtensionSettings` with `aiProvider`, `aiApiKey`, `aiOutputLanguage` fields in `src/models/types.ts` — see `data-model.md` for field definitions
- [ ] T003 [P] Add AI constants (`AI_MODELS` map with model IDs for claude/openai, `AI_CONTEXT_BUDGET_CHARS = 32000`, `AI_GENERATION_TIMEOUT_MS = 10000`, `AI_OUTPUT_LANGUAGES` array) in `src/utils/constants.ts`
- [ ] T004 [P] Update `DEFAULT_SETTINGS` with `aiProvider: null, aiApiKey: null, aiOutputLanguage: 'en'`, add AI validation rules to `validateSettings()`, and add `isAIConfigured()` helper function in `src/models/settings.ts` — see `contracts/settings-extension.md` for validation logic

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Configure AI Provider (Priority: P1) 🎯 MVP

**Goal**: Users can select an AI provider (Claude or ChatGPT), enter an API key, and choose an output language in the extension settings. Settings persist across sessions with the API key masked after save.

**Independent Test**: Open settings → select provider → enter key → save → reopen settings → verify provider shown and key masked

### Implementation for User Story 1

- [ ] T005 [US1] Add AI provider section to `SettingsView.render()`: provider `<select>` (`settings-ai-provider`), API key `<input type="password">` (`settings-ai-key`), output language `<select>` (`settings-ai-language`) with conditional visibility (hide key/language when provider is "Disabled"), and masked key display on load (`••••••••` + last 4 chars) in `entrypoints/popup/views/SettingsView.ts` — see `contracts/settings-extension.md` for UI element specs
- [ ] T006 [US1] Wire AI settings through `App.ts`: read `aiProvider`/`aiApiKey`/`aiOutputLanguage` from settings in `renderSettingsView()`, pass to `SettingsView.render()`, and handle save callback for new fields via existing `mergeSettings()` flow in `entrypoints/popup/App.ts`

**Checkpoint**: AI provider can be configured and persisted — US1 is independently testable

---

## Phase 4: User Story 2 — AI Generates Title and Description (Priority: P1)

**Goal**: After capturing bug data, users enter a brief description and click "Generate with AI" to produce a structured Jira-ready title and detailed description using the configured AI provider. The generate button shows a loading spinner while processing.

**Independent Test**: Configure AI key → capture a page → enter brief description → click Generate → verify title and description fields are populated with AI-generated content

### Implementation for User Story 2

- [ ] T007 [P] [US2] Create `prepareAIContext(report, settings)` function that redacts console entries (scan messages for `SENSITIVE_FIELD_PATTERNS`), redacts network requests (via `redactHeaders()` + `truncateBody()`), strips sensitive URL query params, and prioritizes data within `AI_CONTEXT_BUDGET_CHARS` (errors first, then failed requests, then chronological FIFO) — returns `AIGenerationRequest` in `src/services/ai-prompt.ts` — see `contracts/ai-generation.md` Context Preparation Contract
- [ ] T008 [P] [US2] Create `generateBugDescription(request, settings)` function using LangChain: instantiate `ChatAnthropic` or `ChatOpenAI` based on `settings.aiProvider`, apply `withStructuredOutput()` with Zod schema `{ title: z.string(), description: z.string() }`, build prompt from system template + user description + formatted context data, invoke model, and map provider errors (401/403 → `invalid_key`, 429 → `rate_limit`, fetch errors → `network_error`, parse failures → `parse_error`) to `AIGenerationError` in `src/services/ai-generator.ts` — see `contracts/ai-generation.md` and `research.md` R2/R3
- [ ] T009 [US2] Add `GENERATE_DESCRIPTION` message handler in `chrome.runtime.onMessage` listener: load pending report from storage, load settings, call `prepareAIContext()` then `generateBugDescription()`, return `{ payload: { title, description } }` on success or `{ error: message }` on failure in `entrypoints/background.ts` — see `data-model.md` Message Types
- [ ] T010 [US2] Add AI mode to `ReportFormView`: when `aiConfigured=true` render "Describe the issue briefly" textarea (`report-user-desc`) + "Generate with AI" button with loading spinner states (Idle/Generating/Generated per `contracts/report-form-extension.md`), after generation populate editable title (`report-title`) and description (`report-desc`) fields, add `onGenerate` callback handling in `entrypoints/popup/views/ReportFormView.ts`
- [ ] T011 [US2] Wire `onGenerate` callback in `App.ts` `renderReportView()`: create async function that sends `GENERATE_DESCRIPTION` message to background with `userDescription` and `reportId`, pass `isAIConfigured(settings)` as `aiConfigured` parameter to `ReportFormView.render()`, and update `captureFormState()` to also preserve `report-user-desc` value in `entrypoints/popup/App.ts`

**Checkpoint**: Full AI generation flow works end-to-end — US2 is independently testable

---

## Phase 5: User Story 3 — Fallback to Manual Entry (Priority: P2)

**Goal**: When no AI provider is configured, the report form displays the traditional title and description fields unchanged. When AI is configured, users can toggle between AI and manual modes, preserving any generated content.

**Independent Test**: (1) No AI key → verify standard form appears. (2) AI key configured → click "Manual" link → verify title/description fields shown → click "Use AI" → verify AI mode returns with content preserved

### Implementation for User Story 3

- [ ] T012 [US3] Add mode toggle to `ReportFormView`: "Manual" link next to generate button (switches to standard title + description fields), "Use AI" link in manual mode (only shown when `aiConfigured=true`), preserve AI-generated title/description when toggling to manual, preserve user-entered values when toggling back to AI in `entrypoints/popup/views/ReportFormView.ts`

**Checkpoint**: Fallback mode works — US3 is independently testable

---

## Phase 6: User Story 4 — Handle AI Errors Gracefully (Priority: P2)

**Goal**: When AI generation fails (invalid key, rate limit, network error), users see a clear error message with the option to retry or switch to manual entry. User input is never lost.

**Independent Test**: Configure invalid API key → click Generate → verify error message shown → verify brief description text is preserved → click "Manual" → verify manual entry works

### Implementation for User Story 4

- [ ] T013 [US4] Add inline error banner display above generate button (format: "Could not generate description: [message]. You can try again or switch to manual entry."), ensure `report-user-desc` textarea value is preserved across failed generation attempts, and reset error state on successful re-generation in `entrypoints/popup/views/ReportFormView.ts`

**Checkpoint**: Error handling works — US4 is independently testable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Tests, verification, and quality assurance across all user stories

- [ ] T014 [P] Write unit tests for `generateBugDescription()`: mock LangChain `ChatAnthropic`/`ChatOpenAI` classes, test provider routing based on `aiProvider` setting, test structured output parsing, test error mapping (401→invalid_key, 429→rate_limit, network→network_error, parse→parse_error), test timeout handling in `tests/unit/services/ai-generator.test.ts`
- [ ] T015 [P] Write unit tests for `prepareAIContext()`: test console entry redaction (sensitive patterns masked), test network request redaction (headers + bodies), test URL query param stripping, test prioritization (errors first), test character budget truncation (FIFO drop of non-error entries), test with empty/null data in `tests/unit/services/ai-prompt.test.ts`
- [ ] T016 [P] Update existing settings tests: add cases for `aiProvider` validation (null, 'claude', 'openai', invalid), `aiApiKey` required when provider set, `aiOutputLanguage` format validation, `isAIConfigured()` helper, and `DEFAULT_SETTINGS` new fields in `tests/unit/models/settings.test.ts`
- [ ] T017 Run full verification: `pnpm test && pnpm run lint && pnpm run build` — all tests pass, no lint errors, extension builds successfully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (T002, T003, T004)
- **US2 (Phase 4)**: Depends on Foundational — can start in parallel with US1 (different files), but needs US1 settings UI for end-to-end testing
- **US3 (Phase 5)**: Depends on US2 (T010) — extends ReportFormView with toggle
- **US4 (Phase 6)**: Depends on US2 (T010) — extends ReportFormView with error display
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Can start after Phase 2 — services (T007, T008) are independent of US1, but form (T010) builds on configured settings
- **US3 (P2)**: Depends on US2 form implementation (T010) — adds mode toggle to existing AI form
- **US4 (P2)**: Depends on US2 form implementation (T010) — adds error display to existing AI form

### Within Each User Story

- Models/types before services
- Services before background handler
- Background handler before UI
- Core implementation before integration

### Parallel Opportunities

Within Phase 2:
- T003 (constants) and T004 (settings model) can run in parallel after T002 (types)

Within Phase 4 (US2):
- T007 (ai-prompt.ts) and T008 (ai-generator.ts) can run in parallel — different files, no cross-dependency

Within Phase 7 (Polish):
- T014, T015, T016 can all run in parallel — different test files

---

## Parallel Example: User Story 2

```bash
# Launch both service files in parallel (different files, no dependencies):
Task: "Create context preparation service in src/services/ai-prompt.ts"        # T007
Task: "Create AI generator service in src/services/ai-generator.ts"            # T008

# Then sequentially (depends on both services):
Task: "Add GENERATE_DESCRIPTION handler in entrypoints/background.ts"          # T009
Task: "Add AI mode to ReportFormView in entrypoints/popup/views/ReportFormView.ts"  # T010
Task: "Wire onGenerate callback in entrypoints/popup/App.ts"                   # T011
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependencies)
2. Complete Phase 2: Foundational (types, constants, settings model)
3. Complete Phase 3: US1 — Configure AI Provider
4. **STOP and VALIDATE**: Settings UI works, key persists, masked on reload
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Settings) → Test independently → MVP for configuration
3. Add US2 (Generation) → Test end-to-end → Core value delivered
4. Add US3 (Fallback) → Test backward compatibility → Safety net complete
5. Add US4 (Error Handling) → Test failure scenarios → Production ready
6. Polish → Tests + verification → Release ready
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- ReportFormView.ts is touched by US2, US3, and US4 — implement in order to avoid conflicts
- ai-generator.ts error handling (T008) covers the service-level error mapping; US4 (T013) covers the UI-level error display
