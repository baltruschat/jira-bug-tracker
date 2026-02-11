# Feature Specification: AI-Generated Bug Descriptions

**Feature Branch**: `003-ai-bug-description`
**Created**: 2026-02-11
**Status**: Draft
**Input**: User description: "AI soll Titel und Beschreibung für Jira-Tickets generieren, basierend auf einer kurzen Nutzerbeschreibung, Netzwerk-Requests und Console-Logs. API-Key (Claude oder ChatGPT) wird in den Settings hinterlegt."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure AI Provider (Priority: P1)

A user opens the extension settings and enters their AI API key (either for Claude or ChatGPT). They select which provider to use and save the settings. The key is stored securely and persists across sessions.

**Why this priority**: Without a configured AI provider, no AI features can be used. This is the foundation for all other stories.

**Independent Test**: Can be tested by opening settings, entering an API key, saving, reopening settings, and verifying the key is still stored and the provider is correctly selected.

**Acceptance Scenarios**:

1. **Given** the user is on the settings view, **When** they select "Claude" as provider and enter a valid API key and save, **Then** the settings are persisted and the AI provider is shown as configured.
2. **Given** the user has a saved API key, **When** they reopen the settings, **Then** the selected provider is shown and the key is indicated as stored (masked, not displayed in plain text).
3. **Given** the user has a saved API key, **When** they clear the key field and save, **Then** the AI feature is disabled and the form reverts to manual title/description entry.

---

### User Story 2 - AI Generates Title and Description (Priority: P1)

After capturing a bug (screenshot, console logs, network requests), the user lands on the report form. Instead of the separate title and description fields, they see a single "Bug Description" textarea where they briefly describe the issue in their own words (e.g. "Login button doesn't work after page refresh"). Upon triggering generation, the AI receives the user's description along with the captured console entries and network requests, and produces a structured Jira-ready title and detailed description.

**Why this priority**: This is the core value of the feature — saving users time by auto-generating high-quality bug reports from captured data.

**Independent Test**: Can be tested by capturing a page with console errors and network failures, entering a brief description, triggering AI generation, and verifying that a structured title and description are produced.

**Acceptance Scenarios**:

1. **Given** the user has an AI provider configured and has captured bug data, **When** they enter a brief description and trigger AI generation, **Then** the generate button shows a loading spinner and is disabled while the system produces a title and a detailed description incorporating the user's input, relevant console entries, and relevant network requests.
2. **Given** the AI has generated a title and description, **When** the user reviews the output, **Then** they can see and edit both the generated title and description before submitting to Jira.
3. **Given** the user has captured data but no console errors or failed network requests, **When** they trigger AI generation, **Then** the AI still produces a reasonable title and description based on the user's input and available context.

---

### User Story 3 - Fallback to Manual Entry (Priority: P2)

When no AI provider is configured (no API key saved), the report form behaves exactly as it does today — showing the standard title and description fields for manual entry. The user experience is unchanged for users who don't want AI features.

**Why this priority**: Ensures backward compatibility and that the extension remains fully functional without AI configuration.

**Independent Test**: Can be tested by ensuring no API key is configured, capturing a bug, and verifying the form shows the existing title and description fields.

**Acceptance Scenarios**:

1. **Given** no AI API key is configured, **When** the user opens the report form after capture, **Then** the form displays the traditional title and description fields exactly as before.
2. **Given** an AI provider is configured, **When** the user prefers to write manually, **Then** they can switch to manual mode and enter title and description themselves.

---

### User Story 4 - Handle AI Errors Gracefully (Priority: P2)

When the AI call fails (invalid key, rate limit, network error, provider outage), the user is shown a clear error message and can fall back to manual entry without losing any data.

**Why this priority**: AI services are external dependencies that can fail. Users must never be blocked from filing a bug report.

**Independent Test**: Can be tested by configuring an invalid API key, triggering generation, and verifying the error message appears and manual entry remains available.

**Acceptance Scenarios**:

1. **Given** the AI API key is invalid or expired, **When** the user triggers generation, **Then** an error message indicates the issue and suggests checking the API key in settings.
2. **Given** the AI provider is unreachable, **When** the user triggers generation, **Then** an error message is shown and the user can manually enter title and description.
3. **Given** an AI generation error occurred, **When** the user views the form, **Then** any previously entered description text is preserved and not lost.

---

### Edge Cases

- What happens when the captured data (console + network) exceeds the AI provider's token/context limit? The system should truncate or summarize the data to fit within limits, prioritizing error-level console entries and failed network requests.
- What happens when the user's brief description is empty? The system should still attempt generation using only the captured data (aligns with Principle IV — minimal friction).
- What happens when the AI returns an unexpectedly formatted response? The system should gracefully handle malformed responses and allow the user to fall back to manual entry.
- What happens when the user switches AI providers after already having a key saved? The previous key should be cleared and the new provider's key saved.

## Clarifications

### Session 2026-02-11

- Q: Should captured data (console logs, network requests) be redacted before sending to the AI provider? → A: Always redact sensitive patterns (tokens, cookies, auth headers, PII) before sending to AI.
- Q: In which language should the AI generate the Jira title and description? → A: Let the user choose a preferred output language in settings.
- Q: What should the UI show while the AI is generating? → A: Loading spinner on the generate button, button disabled, form remains visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to select an AI provider (Claude or ChatGPT) in the settings view.
- **FR-002**: System MUST allow users to enter and save an API key for the selected AI provider.
- **FR-003**: System MUST store the API key securely (not visible in plain text after saving).
- **FR-004**: System MUST display a single "Bug Description" input field on the report form when an AI provider is configured, replacing the separate title and description fields.
- **FR-005**: System MUST send the user's brief description, captured console entries, and captured network requests to the selected AI provider for generation.
- **FR-006**: System MUST display the AI-generated title and description in editable fields so the user can review and modify them before submitting.
- **FR-007**: System MUST fall back to the standard manual title/description form when no AI provider is configured.
- **FR-008**: System MUST display a clear error message when AI generation fails, without losing user input.
- **FR-009**: System MUST allow the user to switch between AI-assisted and manual entry modes.
- **FR-010**: System MUST truncate or prioritize captured data when it exceeds the AI provider's input limits, favoring error-level console entries and failed/errored network requests.
- **FR-011**: System MUST use LangChain to abstract AI provider communication, enabling uniform handling of multiple providers and leveraging built-in prompt templating and output parsing.
- **FR-012**: System MUST redact sensitive patterns (API tokens, session cookies, authorization headers, PII) from console entries and network requests before sending them to the AI provider.
- **FR-013**: System MUST allow the user to select a preferred output language in settings, and the AI MUST generate the title and description in that language.

### Key Entities

- **AIProviderConfig**: Represents the user's AI provider selection and credentials — includes provider type (Claude/ChatGPT), API key (stored securely), enabled/disabled state, and preferred output language.
- **AIGenerationRequest**: The input sent to the AI — includes the user's brief description, console entries, and network request summaries.
- **AIGenerationResult**: The AI's response — includes generated title and generated description, plus any error information.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users with AI configured can generate a Jira-ready title and description within 10 seconds of triggering generation under normal conditions. The system enforces a hard timeout of 10 seconds, after which an error is shown.
- **SC-002**: Generated descriptions include relevant details from console errors and failed network requests when present in captured data.
- **SC-003**: Users without AI configuration experience no change in existing workflow.
- **SC-004**: AI generation failures are communicated to the user as soon as the error is received (instantly for auth/rate-limit errors, at most 10 seconds for timeouts), with a clear path to manual entry.
- **SC-005**: Users can edit AI-generated content before submission — no auto-submission occurs.

## Assumptions

- Users will obtain their own API keys from Claude (Anthropic) or ChatGPT (OpenAI). The extension does not handle API key provisioning.
- AI API calls are made directly from the extension's service worker (background script), not through a proxy server.
- The AI prompt/template used for generation is hardcoded in the extension and not user-configurable.
- Console entries and network requests are summarized/truncated before sending to the AI to respect token limits and avoid sending excessive data.
- The API key is stored in `chrome.storage.local` (encrypted at rest by Chrome) — not in `chrome.storage.session` which would be lost on browser restart.
- Standard rate limits of Claude and ChatGPT APIs are respected; no retry logic beyond a single attempt with timeout.
- AI generation constitutes a separate, user-initiated data transmission distinct from Jira bug report submission. Clicking "Generate with AI" serves as explicit user consent to send redacted diagnostic data to the selected AI provider. This is analogous to the existing pattern where the user explicitly triggers Jira submission — Constitution Principle III is satisfied because data only leaves the browser upon explicit user action.
