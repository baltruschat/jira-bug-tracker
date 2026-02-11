# Contract: Report Form Extension for AI Mode

**Feature**: 003-ai-bug-description | **Date**: 2026-02-11

## ReportFormView Changes

### Mode Detection

The form operates in one of two modes based on settings:

- **AI Mode**: `isAIConfigured(settings) === true`
- **Manual Mode**: `isAIConfigured(settings) === false` OR user toggled to manual

### AI Mode Layout

```
┌──────────────────────────────────┐
│ Site Selector                    │  (unchanged)
├──────────────────────────────────┤
│ Describe the issue briefly:      │
│ ┌──────────────────────────────┐ │
│ │ (textarea)                   │ │  id="report-user-desc"
│ └──────────────────────────────┘ │
│ [Generate with AI]  [Manual ↗]   │  generate button + toggle link
├──────────────────────────────────┤
│ ── After generation ──           │
│ Title:                           │
│ ┌──────────────────────────────┐ │
│ │ (text input, editable)       │ │  id="report-title"
│ └──────────────────────────────┘ │
│ Description:                     │
│ ┌──────────────────────────────┐ │
│ │ (textarea, editable)         │ │  id="report-desc"
│ └──────────────────────────────┘ │
├──────────────────────────────────┤
│ Project Selector                 │  (unchanged)
│ Issue Type Selector              │  (unchanged)
├──────────────────────────────────┤
│ Data Summary                     │  (unchanged)
├──────────────────────────────────┤
│ [Back]        [Submit to Jira]   │  (unchanged)
└──────────────────────────────────┘
```

### Manual Mode Layout

Identical to existing form (unchanged from current implementation):
- Title (text input, required)
- Description (textarea)
- Project / Issue Type selectors
- Submit button

### Mode Toggle

- **AI → Manual**: "Manual" link next to generate button. Shows standard title + description fields. Preserves any AI-generated content if already generated.
- **Manual → AI**: "Use AI" link shown in manual mode (only when AI is configured). Switches back to AI layout.

### Generate Button States

| State | Button Text | Disabled | Spinner |
|-------|------------|----------|---------|
| Idle | "Generate with AI" | No | No |
| Generating | "Generating..." | Yes | Yes |
| Generated | "Re-generate" | No | No |
| Error | "Generate with AI" | No | No |

### Error Display

On AI generation failure, show an inline error banner above the generate button:

```
⚠ Could not generate description: [error message]. You can try again or switch to manual entry.
```

### Data Flow

```
User enters description
  → Click "Generate with AI"
  → Button shows spinner, disabled
  → chrome.runtime.sendMessage({ type: 'GENERATE_DESCRIPTION', payload: { userDescription, reportId } })
  → Background: loads pending report, prepares context, calls AI
  → Response: { payload: { title, description } }
  → Populate title + description fields (editable)
  → Button changes to "Re-generate"
```

### Callbacks Extension

```typescript
constructor(container: HTMLElement, callbacks: {
  onSubmit: (data: { siteId, projectKey, issueTypeId, title, description }) => void;
  onBack: () => void;
  onSiteChange: (siteId: string) => void;
  onProjectChange: (projectKey: string) => void;
  onProjectSearch?: (siteId: string, query: string) => void;
  onGenerate?: (userDescription: string) => Promise<{ title: string; description: string }>;
})
```

The `onGenerate` callback is provided by `App.ts` and wraps the message sending to background. Returns a promise that resolves with the generated title/description or rejects with an error message.

### Render Method Extension

```typescript
render(
  report: BugReport,
  connections: JiraConnection[],
  projects: JiraProject[],
  issueTypes: JiraIssueType[],
  submitting: boolean = false,
  aiConfigured: boolean = false    // NEW: controls mode availability
): void
```
