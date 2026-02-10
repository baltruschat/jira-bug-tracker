# Quickstart: Jira Bug Capture Chrome Extension

## Prerequisites

- Node.js 18+ and npm/pnpm
- Google Chrome (latest stable)
- An Atlassian Developer account with an OAuth 2.0 (3LO) app
  configured at https://developer.atlassian.com/console/myapps/
- A Jira Cloud instance with at least one project

## Setup

```bash
# Clone and install
git clone <repo-url>
cd jira-bug-tracker
pnpm install  # or npm install

# Configure OAuth credentials
cp .env.example .env
# Edit .env and set:
#   ATLASSIAN_CLIENT_ID=your_client_id
#   ATLASSIAN_CLIENT_SECRET=your_client_secret
```

### Atlassian OAuth App Setup

1. Go to https://developer.atlassian.com/console/myapps/
2. Create a new OAuth 2.0 (3LO) app
3. Under "Authorization", add callback URL:
   `https://<extension-id>.chromiumapp.org/callback`
   (get extension ID from `chrome://extensions` after first load)
4. Under "Permissions", add Jira API scopes:
   - `read:jira-work`
   - `write:jira-work`
5. Copy Client ID and Client Secret to `.env`

## Development

```bash
# Start dev server with hot reload
pnpm dev  # or npm run dev

# This opens Chrome with the extension auto-loaded.
# Changes to popup/content scripts trigger hot reload.
```

## Testing

```bash
# Unit + integration tests
pnpm test

# Unit tests with coverage report
pnpm test:coverage

# E2E tests (requires built extension)
pnpm build
pnpm test:e2e
```

## Build

```bash
# Production build
pnpm build

# Output: .output/chrome-mv3/
```

## Load in Chrome (Manual)

1. Build the extension: `pnpm build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `.output/chrome-mv3/` directory

## Verify End-to-End

1. Click the extension icon → "Add Jira Site"
2. Complete the Atlassian OAuth login
3. Navigate to any website
4. Click the extension icon (or press keyboard shortcut)
5. Verify: screenshot captured, console entries listed,
   network requests listed, environment data shown
6. Enter a bug title and description
7. Select project and issue type
8. Click "Submit to Jira"
9. Verify: success message with clickable Jira issue link
10. Open the Jira issue and verify: screenshot attached,
    diagnostic data in description (tables + code blocks)

## Project Structure

```
jira-bug-tracker/
├── entrypoints/
│   ├── popup/              # Extension popup UI
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── style.scss
│   ├── background.ts       # Service worker (OAuth, webRequest, storage)
│   ├── content.ts           # Content script - ISOLATED world (relay)
│   └── injected.ts          # Content script - MAIN world (console/fetch intercept)
├── src/
│   ├── services/
│   │   ├── auth.ts          # OAuth flow, token management
│   │   ├── capture.ts       # Orchestrates data capture
│   │   ├── jira-api.ts      # Jira REST API client
│   │   ├── redaction.ts     # Sensitive data redaction
│   │   └── adf-builder.ts   # ADF document construction
│   ├── models/
│   │   ├── bug-report.ts    # BugReport entity + types
│   │   ├── connection.ts    # JiraConnection entity
│   │   └── settings.ts      # ExtensionSettings entity
│   ├── storage/
│   │   └── chrome-storage.ts # chrome.storage wrapper
│   └── utils/
│       ├── environment.ts   # Browser/OS detection
│       └── screenshot.ts    # Screenshot capture + compression
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── wxt.config.ts            # WXT configuration
├── tsconfig.json
└── package.json
```
