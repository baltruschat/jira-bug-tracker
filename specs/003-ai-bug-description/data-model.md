# Data Model: AI-Generated Bug Descriptions

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## Entity Changes

### ExtensionSettings (modified)

Extends existing `ExtensionSettings` in `src/models/types.ts` with new AI fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| *(existing fields)* | | | *unchanged* |
| `aiProvider` | `'claude' \| 'openai' \| null` | `null` | Selected AI provider, null = AI disabled |
| `aiApiKey` | `string \| null` | `null` | API key for the selected provider |
| `aiOutputLanguage` | `string` | `'en'` | Preferred output language (ISO 639-1 code) |

**Validation rules**:
- If `aiProvider` is set, `aiApiKey` must be a non-empty string
- If `aiProvider` is null, `aiApiKey` is ignored
- `aiOutputLanguage` must be a valid ISO 639-1 code (2 chars lowercase)

**Identity**: Singleton (one settings object per extension install)

### AIGenerationRequest (new)

Internal type representing the input assembled for AI generation. Never persisted.

| Field | Type | Description |
|-------|------|-------------|
| `userDescription` | `string` | User's brief description of the bug |
| `consoleEntries` | `ConsoleEntry[]` | Redacted, truncated console entries |
| `networkRequests` | `NetworkRequest[]` | Redacted, truncated network requests |
| `environment` | `EnvironmentSnapshot \| null` | Browser/OS info |
| `pageContext` | `PageContext \| null` | URL, title, readyState |
| `outputLanguage` | `string` | Target language for generation |

### AIGenerationResult (new)

Return type from the AI generation service.

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Generated Jira issue title (max ~120 chars) |
| `description` | `string` | Generated Jira issue description (plain text) |

### AIGenerationError (new)

Error type for AI generation failures.

| Field | Type | Description |
|-------|------|-------------|
| `code` | `'invalid_key' \| 'rate_limit' \| 'network_error' \| 'parse_error' \| 'timeout' \| 'unknown'` | Error category |
| `message` | `string` | Human-readable error message |

## Storage Schema Changes

### LocalStorageSchema (modified)

No new storage keys needed. AI settings are part of the existing `settings` key:

```
chrome.storage.local:
  settings: ExtensionSettings  ← extended with aiProvider, aiApiKey, aiOutputLanguage
  connections: JiraConnection[]  ← unchanged
  pendingReport: BugReport | null  ← unchanged
```

### SessionStorageSchema

No changes. AI requests are stateless — no session buffer needed.

## Message Types (new)

### GENERATE_DESCRIPTION

Popup → Background message to trigger AI generation.

**Request**:
```
{
  type: 'GENERATE_DESCRIPTION',
  payload: {
    userDescription: string,
    reportId: string
  }
}
```

**Response**:
```
{
  payload?: { title: string, description: string },
  error?: string
}
```

The background handler reads the pending report from storage to access console entries, network requests, environment, and page context. This avoids serializing large data through the message channel.

## State Transitions

### Report Form UI States

```
┌─────────────────┐
│  AI Mode:       │
│  Description    │──── User enters brief description
│  Input          │
└────────┬────────┘
         │ Click "Generate"
         ▼
┌─────────────────┐
│  Generating     │──── Spinner on button, button disabled
│  (loading)      │     Form visible but read-only
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Success│ │ Error  │
│ Review │ │ Show   │
│ & Edit │ │ message│
└────────┘ └───┬────┘
               │ User can retry or switch to manual
               ▼
         ┌────────────┐
         │ Manual Mode│──── Standard title + description fields
         └────────────┘
```

### Settings AI Configuration States

```
No provider → Provider selected → API key entered → Saved (AI enabled)
                                                  → Key cleared → Saved (AI disabled)
```
