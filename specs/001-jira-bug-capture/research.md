# Research: Jira Bug Capture Chrome Extension

**Date**: 2025-02-10
**Branch**: `001-jira-bug-capture`

---

## 1. OAuth 2.0 (3LO) for Chrome Extensions

### Decision
Use Atlassian OAuth 2.0 (3LO) Authorization Code Grant via
`chrome.identity.launchWebAuthFlow`. The `client_secret` will be
embedded in the extension (accepted trade-off; no PKCE support
for Jira Cloud).

### Rationale
Atlassian's OAuth 2.0 (3LO) for Jira Cloud only supports the
Authorization Code Grant. PKCE is not supported for Jira Cloud
(only Data Center). Chrome extensions can use
`chrome.identity.launchWebAuthFlow` which generates a redirect URL
of the form `https://<extension-id>.chromiumapp.org/callback`.
This URL is registered as the Callback URL in the Atlassian
Developer Console. Chrome intercepts it internally — no backend
needed.

Token exchange and refresh require `client_secret`. The service
worker can make these calls directly because `host_permissions`
for `https://auth.atlassian.com/*` and `https://api.atlassian.com/*`
bypass CORS restrictions.

### Flow

```
1. User clicks "Add Jira Site" in popup
2. Extension calls chrome.identity.launchWebAuthFlow({
     url: authorizationUrl, interactive: true
   })
3. Chrome opens auth window → user logs in → grants consent
4. Atlassian redirects to https://<ext-id>.chromiumapp.org/callback
     ?code=AUTH_CODE&state=STATE
5. Chrome intercepts redirect, returns URL to extension
6. Extension validates state parameter (CSRF protection)
7. Service worker POSTs to https://auth.atlassian.com/oauth/token
     { grant_type: "authorization_code", client_id, client_secret,
       code, redirect_uri }
8. Receives { access_token, refresh_token, expires_in, scope }
9. Extension GETs https://api.atlassian.com/oauth/token/accessible-resources
     to discover Cloud IDs for authorized Jira sites
10. Stores tokens + cloud IDs in chrome.storage.session
11. All API calls use:
      https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...
      Authorization: Bearer {access_token}
12. Before each API call, check token expiry; refresh if needed
      (rotating refresh tokens — store new refresh_token each time)
```

### Authorization URL

```
https://auth.atlassian.com/authorize?
  audience=api.atlassian.com
  &client_id=YOUR_CLIENT_ID
  &scope=read%3Ajira-work%20write%3Ajira-work%20offline_access
  &redirect_uri=https%3A%2F%2F<ext-id>.chromiumapp.org%2Fcallback
  &state=RANDOM_STATE
  &response_type=code
  &prompt=consent
```

### Scopes

| Scope | Purpose |
|-------|---------|
| `read:jira-work` | List projects, issue types, read issues |
| `write:jira-work` | Create issues, upload attachments |
| `offline_access` | Receive refresh token |

### Token Lifetimes
- Access token: 3600 seconds (1 hour), fixed
- Refresh token: rotating (new token per refresh), expires after
  90 days of inactivity

### Manifest Permissions

```json
{
  "permissions": ["identity", "storage"],
  "host_permissions": [
    "https://auth.atlassian.com/*",
    "https://api.atlassian.com/*"
  ]
}
```

### Alternatives Considered
- **Lightweight backend proxy** for client_secret: Most secure
  but adds infrastructure dependency. Rejected because
  constitution mandates no external runtime dependencies.
- **Basic Auth with API tokens**: Simpler but worse UX (user must
  generate and paste a token). Does not meet the OAuth requirement
  in the constitution.
- **Atlassian Forge**: Not suitable for Chrome Extensions.

---

## 2. Build Tooling: WXT Framework

### Decision
Use **WXT** (Web Extension Tools) as the build framework with
Vite under the hood. Testing: **Vitest** (unit/integration) +
**Playwright** (E2E).

### Rationale
WXT provides file-based entrypoint discovery, auto-manifest
generation, and handles Chrome MV3 content script IIFE bundling
automatically. 9,000+ GitHub stars, actively maintained. Built-in
Vitest plugin with `@webext-core/fake-browser` for chrome.* API
mocking. TypeScript and SCSS are zero-config.

### Key Features
- File-based entrypoints: `entrypoints/popup/`, `entrypoints/background.ts`,
  `entrypoints/content.ts`
- Auto-generates manifest.json from entrypoint metadata
- True HMR for popup, fast reload for content scripts
- Content scripts automatically bundled as IIFE (no ES modules)
- `wxt dev` auto-loads extension in Chrome

### Testing Stack
- **Vitest**: Unit/integration tests. WXT's built-in plugin
  provides `@webext-core/fake-browser` for in-memory chrome.*
  API mocks.
- **Playwright**: E2E tests via `chromium.launchPersistentContext()`
  with `--load-extension` flag. Tests full capture-to-submission flow.

### Alternatives Considered
- **CRXJS + Vite**: Repository archived ~June 2025. Maintenance
  unstable.
- **Webpack**: High config overhead, no extension-specific tooling,
  mediocre dev experience for extensions.
- **Rollup**: No multi-entry IIFE support, no dev server.
- **Plasmo**: Uses Parcel (less ecosystem), maintenance concerns.

---

## 3. Network Request Capture

### Decision
Hybrid approach: **`chrome.webRequest`** (primary, metadata) +
**content script monkey-patching** (supplementary, response bodies).

### Rationale
`chrome.webRequest` reliably captures method, URL, status code,
timing, and response size for ALL request types (not just XHR/Fetch)
without DevTools being open. Content script monkey-patching of
`fetch` and `XMLHttpRequest` in the MAIN world adds response body
capture as a best-effort enhancement.

### Architecture

```
Service Worker (background)
├── chrome.webRequest.onBeforeRequest  → record start time, method, URL
├── chrome.webRequest.onCompleted      → record status, end time, Content-Length
├── chrome.webRequest.onErrorOccurred  → record failures
└── Receives body data from content script relay

Content Script - ISOLATED world
├── Relays postMessage data from MAIN to service worker
└── Relays commands from service worker to MAIN

Content Script - MAIN world (document_start)
├── Monkey-patches window.fetch → clones response, reads truncated body
├── Monkey-patches XMLHttpRequest → captures responseText on load
└── Posts captured body data via window.postMessage
```

### Correlation
Use request URL + method + approximate timestamp to correlate
`webRequest` metadata with monkey-patch body data. Apply body
truncation (FR-017) in the MAIN world before postMessage to
avoid large payloads crossing the message channel.

### Graceful Degradation
If MAIN world injection fails (CSP, timing), webRequest still
captures all metadata. UI indicates when body capture is unavailable.

### Alternatives Considered
- **`chrome.devtools.network`**: Requires DevTools open. Rejected.
- **`chrome.debugger`**: Shows yellow warning bar. Rejected.
- **Monkey-patching alone**: Too fragile (race conditions, CSP).
- **`webRequest` alone**: Loses response body capture.

---

## 4. Jira Cloud REST API v3 Endpoints

### Decision
Use Jira REST API v3 via `api.atlassian.com` proxy with OAuth 2.0
Bearer tokens. Description uses ADF (Atlassian Document Format).

### Base URL
```
https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/
```

### Endpoints Used

#### Create Issue
```
POST /rest/api/3/issue
Body: { fields: { project: { key }, issuetype: { id },
  summary, description (ADF) } }
Response: { id, key, self }
```

#### Upload Attachment
```
POST /rest/api/3/issue/{key}/attachments
Headers: X-Atlassian-Token: no-check
Body: multipart/form-data with field name "file"
Response: [{ id, filename, mimeType, size, content, thumbnail }]
```
Two-step flow: create issue first, then attach screenshot.

#### List Projects
```
GET /rest/api/3/project/search?startAt=0&maxResults=50&query=...
Response: { values: [...], isLast, total }
```
Use `isLast` for pagination. `query` param enables type-ahead search.

#### List Issue Types
```
GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes
Response: { values: [{ id, name, subtask }], isLast }
```
Filter out `subtask: true` in UI.

#### Get Current User
```
GET /rest/api/3/myself
Response: { accountId, displayName, emailAddress, avatarUrls }
```

#### Accessible Resources (OAuth)
```
GET https://api.atlassian.com/oauth/token/accessible-resources
Response: [{ id (cloudId), name, url, scopes }]
```

### ADF Format for Diagnostic Data
- Environment info: ADF `table` (Property | Value)
- Console logs: ADF `codeBlock` with `language: "text"`
- Network requests: ADF `codeBlock` with `language: "json"`
- User description: ADF `paragraph` nodes
- Validation: `tableCell` must contain block nodes (paragraph),
  not raw text nodes. `codeBlock` cannot have marks.

### API Call Sequence

```
On Connect:
  oauth/token/accessible-resources → discover cloudId + site URL

On Extension Load (when connected):
  GET /rest/api/3/myself → validate token, show display name
  GET /rest/api/3/project/search → populate project dropdown

On Project Selection:
  GET /rest/api/3/issue/createmeta/{key}/issuetypes → populate type dropdown

On Submit:
  POST /rest/api/3/issue → create issue, get key
  POST /rest/api/3/issue/{key}/attachments → attach screenshot
```

---

## 5. Console Capture Strategy

### Decision
Content script injected in **MAIN world** at **document_start**
monkey-patches `console.log`, `console.warn`, `console.error`,
and `console.info`. Entries are buffered in-page and relayed to
the ISOLATED world content script via `window.postMessage`, which
forwards to the service worker via `chrome.runtime.sendMessage`.

### Rationale
Console interception must begin before any page script executes
to capture the very first console call (per clarification).
The MAIN world script must be registered with
`chrome.scripting.registerContentScripts` using `world: "MAIN"`
and `runAt: "document_start"`.

### Buffer Management
- Max 1,000 entries in the in-page buffer (FIFO)
- Each entry: `{ timestamp, level, args (serialized), source }`
- Buffer is read on capture trigger and cleared afterward

---

## 6. Screenshot Annotation Approach

### Decision
Use an HTML5 Canvas overlay in a dedicated annotation tab/panel
opened by the extension. Tools: rectangle highlight (semi-transparent
colored overlay) and rectangle redact (opaque filled rectangle).

### Rationale
Canvas provides pixel-level control for both drawing annotations
and flattening them into the final PNG. The extension opens the
annotation editor in a new tab or extension page (not the popup,
which is too small). The original screenshot is preserved until
the user clicks "Done", at which point the canvas is exported
as the final annotated PNG.

### Tools
- **Highlight**: Semi-transparent colored rectangle (`globalAlpha`)
- **Redact**: Opaque black/gray filled rectangle
- **Undo**: Stack-based undo (re-render from original + remaining annotations)
- **Reset**: Restore original screenshot, clear all annotations

---

## Sources

- Atlassian OAuth 2.0 (3LO): https://developer.atlassian.com/cloud/oauth/getting-started/implementing-oauth-3lo/
- Atlassian Refresh Tokens: https://developer.atlassian.com/cloud/oauth/getting-started/refresh-tokens/
- Jira Scopes: https://developer.atlassian.com/cloud/jira/platform/scopes-for-oauth-2-3LO-and-forge-apps/
- Jira REST API v3: https://developer.atlassian.com/cloud/jira/platform/rest/v3/
- ADF Structure: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
- WXT Framework: https://wxt.dev/
- chrome.webRequest: https://developer.chrome.com/docs/extensions/reference/api/webRequest
- chrome.identity: https://developer.chrome.com/docs/extensions/reference/api/identity
- Playwright Chrome Extensions: https://playwright.dev/docs/chrome-extensions
