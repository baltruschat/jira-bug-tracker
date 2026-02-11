# Contract: AI Generation Service

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## Service Interface

### `generateBugDescription(request: AIGenerationRequest): Promise<AIGenerationResult>`

Core function in `src/services/ai-generator.ts`. Uses LangChain to call the configured AI provider and return structured output.

**Input** (`AIGenerationRequest`):
```typescript
{
  userDescription: string;          // User's brief description
  consoleEntries: ConsoleEntry[];   // Already redacted
  networkRequests: NetworkRequest[]; // Already redacted
  environment: EnvironmentSnapshot | null;
  pageContext: PageContext | null;
  outputLanguage: string;           // ISO 639-1 code
}
```

**Output** (`AIGenerationResult`):
```typescript
{
  title: string;        // Max ~120 characters, suitable as Jira summary
  description: string;  // Detailed plain text, Jira description body
}
```

**Errors**: Throws `AIGenerationError` with codes:
- `invalid_key` — 401/403 from provider
- `rate_limit` — 429 from provider
- `network_error` — fetch failure or timeout
- `parse_error` — structured output parsing failed
- `timeout` — no response within 10 seconds (enforced via AbortController)
- `unknown` — unexpected error

## Message Protocol

### GENERATE_DESCRIPTION (Popup → Background)

**Request**:
```typescript
chrome.runtime.sendMessage({
  type: 'GENERATE_DESCRIPTION',
  payload: {
    userDescription: string,
    reportId: string       // Used to load pending report from storage
  }
})
```

**Success Response**:
```typescript
{
  payload: {
    title: string,
    description: string
  }
}
```

**Error Response**:
```typescript
{
  error: string   // Human-readable error message
}
```

## Prompt Contract

### System Prompt Structure

```
You are a QA engineer writing a Jira bug report.

Given:
- A brief user description of the issue
- Console log entries from the browser
- Network request data (URLs, status codes, errors)
- Browser environment and page context

Generate:
- title: A concise bug title (max 120 characters)
- description: A detailed bug description including:
  1. Summary of the issue
  2. Relevant console errors (if any)
  3. Relevant failed/errored network requests (if any)
  4. Environment details
  5. Steps context (based on page URL and user description)

Output language: {outputLanguage}
```

### Structured Output Schema (Zod)

```typescript
z.object({
  title: z.string().describe("Concise Jira bug title, max 120 characters"),
  description: z.string().describe("Detailed Jira bug description in plain text"),
})
```

## Context Preparation Contract

### `prepareAIContext(report: BugReport, settings: ExtensionSettings): AIGenerationRequest`

Function in `src/services/ai-prompt.ts` that:

1. Redacts console entries using `SENSITIVE_FIELD_PATTERNS`
2. Redacts network requests using `redactHeaders()` and `truncateBody()`
3. Prioritizes data within ~32,000 character budget:
   - Error-level console entries first
   - Failed network requests (status >= 400 or error != null) first
   - Remaining entries in chronological order
4. Strips sensitive query parameters from URLs

**Input**: `BugReport` + `ExtensionSettings`
**Output**: `AIGenerationRequest` (redacted, truncated, within token budget)

## Dependencies

### New npm packages

| Package | Purpose | Approx. Size |
|---------|---------|-------------|
| `langchain` | Core abstractions, prompt templates | — |
| `@langchain/core` | Base classes, output parsers | ~40KB gzip |
| `@langchain/anthropic` | Claude provider integration | ~20KB gzip |
| `@langchain/openai` | OpenAI provider integration | ~30KB gzip |
| `zod` | Schema definition for structured output | ~13KB gzip |
