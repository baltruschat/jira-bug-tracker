# Contract: Settings Extension for AI Provider

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## ExtensionSettings Type Extension

### New Fields

```typescript
interface ExtensionSettings {
  // ... existing fields unchanged ...

  aiProvider: 'claude' | 'openai' | null;  // null = AI disabled
  aiApiKey: string | null;                  // Masked in UI after save
  aiOutputLanguage: string;                 // ISO 639-1, default 'en'
}
```

### DEFAULT_SETTINGS Update

```typescript
const DEFAULT_SETTINGS: ExtensionSettings = {
  // ... existing defaults unchanged ...
  aiProvider: null,
  aiApiKey: null,
  aiOutputLanguage: 'en',
};
```

### Validation Rules

```typescript
function validateSettings(settings: ExtensionSettings): void {
  // ... existing validations ...

  if (settings.aiProvider !== null && !['claude', 'openai'].includes(settings.aiProvider)) {
    throw new Error('Invalid AI provider');
  }
  if (settings.aiProvider !== null && (!settings.aiApiKey || settings.aiApiKey.trim() === '')) {
    throw new Error('API key required when AI provider is selected');
  }
  if (settings.aiOutputLanguage && !/^[a-z]{2}$/.test(settings.aiOutputLanguage)) {
    throw new Error('Invalid output language code');
  }
}
```

## Settings UI Extension

### New UI Elements in SettingsView

1. **AI Provider** — `<select>` dropdown
   - Options: "Disabled" (null), "Claude (Anthropic)", "OpenAI (ChatGPT)"
   - ID: `settings-ai-provider`

2. **API Key** — `<input type="password">`
   - Shown only when provider is selected
   - Placeholder: "Enter your API key"
   - Masked after save (display "••••••••" + last 4 chars)
   - ID: `settings-ai-key`

3. **Output Language** — `<select>` dropdown
   - Shown only when provider is selected
   - Options: English (en), German (de), French (fr), Spanish (es), Portuguese (pt), Japanese (ja), Chinese (zh), Korean (ko)
   - ID: `settings-ai-language`

### Conditional Visibility

```
Provider = null    → Hide API Key, Hide Language
Provider = claude  → Show API Key, Show Language
Provider = openai  → Show API Key, Show Language
```

## Helper Function

### `isAIConfigured(settings: ExtensionSettings): boolean`

Returns `true` if `aiProvider` is not null and `aiApiKey` is a non-empty string.

Used by:
- `ReportFormView` to decide between AI and manual mode
- `App.ts` to determine form layout
