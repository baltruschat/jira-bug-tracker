# Research: AI-Generated Bug Descriptions

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## R1: LangChain.js in Chrome Extension Service Workers

**Decision**: Use LangChain.js (`@langchain/core`, `@langchain/anthropic`, `@langchain/openai`)

**Rationale**: User explicitly chose LangChain (FR-011). It provides `withStructuredOutput()` for typed JSON responses, unified prompt templates, and multi-provider abstraction. The bundle size cost (~101KB gzipped) is acceptable for the feature value.

**Alternatives considered**:
- Direct `fetch()` calls (~0KB) — lightest but requires maintaining two separate API integrations and manual structured output parsing
- Vercel AI SDK (~67.5KB) — middle ground, `generateObject()` for structured output, but less prompt templating support
- Raw provider SDKs (`@anthropic-ai/sdk` + `openai`) — still ~34KB+ combined, no unified interface

**Key findings**:
- LangChain.js uses standard Web Fetch API — compatible with Chrome MV3 service workers (no DOM/Node.js required)
- Avoid document loaders (DOM-dependent) — not needed for this use case
- Chrome service workers have ~30s idle timeout — AI calls must complete within this window or use keep-alive patterns
- No polyfills needed for fetch, ReadableStream, TextDecoder, AbortController

## R2: AI Model Selection (Defaults)

**Decision**: Default to cheapest/fastest models for each provider

**Anthropic Claude**:
- Default model: `claude-haiku-4-5` ($1.00/$5.00 per MTok, 200K context, 64K max output)
- API endpoint: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`

**OpenAI ChatGPT**:
- Default model: `gpt-4.1-nano` ($0.10/$0.40 per MTok, 1M context, 32K max output)
- API endpoint: `POST https://api.openai.com/v1/chat/completions`
- Headers: `Authorization: Bearer <key>`, `Content-Type: application/json`

**Rationale**: Bug report generation is a straightforward structured output task — doesn't require top-tier reasoning. Cheapest models minimize user API costs. Both support tool calling / structured output.

**Alternatives considered**:
- Claude Sonnet 4.5 / GPT-4.1 — higher quality but 3-20x more expensive, unnecessary for this task
- Hardcoded model vs. user-selectable — defer model selection to user as a future enhancement; start with sensible defaults

## R3: Structured Output Parsing

**Decision**: Use LangChain's `withStructuredOutput()` with Zod schema

**Rationale**: Returns typed `{ title: string, description: string }` objects directly. Works for both providers: OpenAI uses native `response_format` JSON schema; Anthropic uses tool calling under the hood. Automatic parsing included.

**Schema**:
```
{ title: string (max ~120 chars, Jira summary), description: string (Jira description in plain text) }
```

**Alternatives considered**:
- Manual JSON.parse + Zod validation — more code, same result
- Provider-native structured output — breaks unified interface

## R4: Token Counting and Input Truncation

**Decision**: Approximate character-based truncation with safety margin

**Rationale**:
- `tiktoken` WASM has known issues in service workers
- LangChain's built-in `getNumTokens()` has documented reliability issues in JS environments
- Anthropic's token counting API requires an extra network round-trip
- Both default models have 200K+ context — even with ~4 chars/token approximation, we have ~150K words of budget
- Console + network data rarely exceeds a few KB after redaction and truncation

**Strategy**:
- Target max ~8,000 tokens of context data (~32,000 characters) to keep costs low and responses fast
- Prioritize: error-level console entries first, then failed network requests, then remaining entries
- Truncate individual network request/response bodies via existing `truncateBody()` service
- If total context exceeds limit, drop oldest non-error entries first (FIFO)

**Alternatives considered**:
- `js-tiktoken` (pure JS, no WASM) — adds dependency for marginal precision gain
- Anthropic token counting API — extra latency for each request
- No truncation — risk of high API costs from large payloads

## R5: Security — Redaction Before AI Transmission

**Decision**: Apply existing redaction pipeline before building AI prompt

**Rationale**: The codebase already has `redactHeaders()`, `truncateBody()`, `isSensitiveField()`, and `redactFormValues()` in `src/services/redaction.ts`. Reuse these on console entries and network requests before including them in the AI prompt. Constitution Principle III (Privacy & Data Security) mandates redaction before any external transmission.

**Implementation path**:
- Network requests: `redactHeaders()` on all headers, `truncateBody()` on bodies
- Console entries: scan messages for patterns matching `SENSITIVE_FIELD_PATTERNS` and mask values
- Page context URL: strip query parameters that match sensitive patterns

## R6: API Key Storage

**Decision**: Store in `chrome.storage.local` (same as existing settings)

**Rationale**:
- `chrome.storage.session` is per-session and would require re-entry on browser restart — bad UX for an API key
- `chrome.storage.local` is encrypted at rest by Chrome and persists across sessions
- FR-003 requires masking (not plain-text display), not at-rest encryption beyond Chrome's built-in protection
- Store alongside existing `ExtensionSettings` schema

**Alternatives considered**:
- Separate storage key for API key — unnecessary complexity, settings model already supports extension
- Web Crypto API encryption layer — over-engineering for a local extension setting that Chrome already encrypts

## R7: Service Worker Lifecycle

**Decision**: Use `chrome.runtime.sendMessage` response pattern (no streaming)

**Rationale**:
- The popup sends a message to the background, background calls AI, returns complete response
- Non-streaming avoids service worker lifecycle issues (idle timeout)
- Haiku/nano models typically respond in 2-5 seconds for short prompts — well within the 10s hard timeout (SC-001). AbortController enforces the 10s limit
- The popup UI shows a loading spinner during this time (per clarification)

**Alternatives considered**:
- Streaming with keep-alive — adds complexity, marginal UX benefit for a 2-5 second wait
- chrome.offscreen API — unnecessary, service worker fetch is sufficient
