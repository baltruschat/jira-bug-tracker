# Data Model: Jira Bug Capture Chrome Extension

**Date**: 2025-02-10
**Source**: spec.md entities + research.md decisions

---

## Entity: JiraConnection

Represents one authenticated Jira Cloud site. Multiple can exist.

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key, generated client-side |
| cloudId | string | From accessible-resources API |
| siteUrl | string (URL) | e.g. `https://myteam.atlassian.net` |
| siteName | string | Human-readable site name |
| displayName | string | Authenticated user's display name |
| accountId | string | Atlassian account ID |
| avatarUrl | string (URL) | User avatar URL |
| accessToken | string | OAuth access token |
| refreshToken | string | OAuth rotating refresh token |
| tokenExpiresAt | number (epoch ms) | Access token expiry timestamp |
| createdAt | number (epoch ms) | When connection was established |

**Storage**: `chrome.storage.session` for tokens (cleared on
browser close). Connection metadata (cloudId, siteUrl, siteName,
displayName) in `chrome.storage.local` for persistence across
restarts. On restart, tokens must be refreshed.

**State transitions**: disconnected → connecting → connected → token_expired → refreshing → connected | disconnected

---

## Entity: ExtensionSettings

Global user preferences. Singleton.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| defaultSiteId | string | null | FK → JiraConnection.id |
| defaultProjectKey | string | null | Last-used project key |
| defaultIssueTypeId | string | null | Last-used issue type ID |
| captureConsole | boolean | true | Toggle console capture |
| captureNetwork | boolean | true | Toggle network capture |
| captureEnvironment | boolean | true | Toggle environment capture |
| networkBodyMaxSize | number | 10240 | Max bytes for request/response body truncation |
| consoleMaxEntries | number | 1000 | Max console entries to retain |

**Storage**: `chrome.storage.local`

---

## Entity: BugReport

A captured bug report in progress. Transient (not persisted
long-term; stored temporarily until submitted or discarded).

| Field | Type | Constraints |
|-------|------|-------------|
| id | string (UUID) | Primary key |
| status | enum | `capturing` \| `captured` \| `submitting` \| `submitted` \| `error` |
| title | string | User-provided, required before submit |
| description | string | User-provided, optional |
| targetSiteId | string | FK → JiraConnection.id |
| projectKey | string | Selected Jira project key |
| issueTypeId | string | Selected issue type ID |
| screenshot | Screenshot | Captured viewport image |
| consoleEntries | ConsoleEntry[] | Captured console log entries |
| networkRequests | NetworkRequest[] | Captured network requests |
| environment | EnvironmentSnapshot | Browser/device info |
| pageContext | PageContext | Current page info |
| capturedAt | number (epoch ms) | When capture was triggered |
| submittedIssueKey | string | null | Jira issue key after submission |
| submittedIssueUrl | string | null | Direct URL to Jira issue |
| error | string | null | Error message if submission failed |

**Storage**: `chrome.storage.local` (temporary, for popup
close/reopen recovery per FR-014)

**Lifecycle**: capturing → captured → submitting → submitted | error

---

## Entity: Screenshot

| Field | Type | Constraints |
|-------|------|-------------|
| originalDataUrl | string | Base64 PNG data URL from captureVisibleTab |
| annotatedDataUrl | string | null | After annotation, replaces original for submission |
| width | number | Viewport width in pixels |
| height | number | Viewport height in pixels |
| annotations | Annotation[] | Drawing operations for undo/redo |

---

## Entity: Annotation

| Field | Type | Constraints |
|-------|------|-------------|
| type | enum | `highlight` \| `redact` |
| x | number | Top-left X coordinate |
| y | number | Top-left Y coordinate |
| width | number | Rectangle width |
| height | number | Rectangle height |
| color | string | Hex color (highlight only) |

---

## Entity: ConsoleEntry

| Field | Type | Constraints |
|-------|------|-------------|
| timestamp | number (epoch ms) | When the console call occurred |
| level | enum | `log` \| `warn` \| `error` \| `info` |
| message | string | Serialized console arguments |
| source | string | null | Source file + line if available |

---

## Entity: NetworkRequest

| Field | Type | Constraints |
|-------|------|-------------|
| id | string | webRequest requestId |
| method | string | HTTP method (GET, POST, etc.) |
| url | string | Full request URL |
| statusCode | number | null | HTTP status code (null if pending/failed) |
| type | string | Resource type (xhr, fetch, script, image, etc.) |
| startTime | number (epoch ms) | Request initiated |
| endTime | number | null (epoch ms) | Request completed |
| duration | number | null (ms) | endTime - startTime |
| responseSize | number | null | Content-Length or measured size |
| requestBody | string | null | Truncated, redacted request body |
| responseBody | string | null | Truncated, redacted response body |
| error | string | null | Error reason if request failed |

**Redaction rules**:
- Headers `Authorization`, `Cookie`, `Set-Cookie`,
  `X-API-Key` are never captured
- Request/response bodies truncated to `settings.networkBodyMaxSize`

---

## Entity: EnvironmentSnapshot

| Field | Type |
|-------|------|
| browserName | string |
| browserVersion | string |
| os | string |
| userAgent | string |
| locale | string |
| screenWidth | number |
| screenHeight | number |
| devicePixelRatio | number |
| viewportWidth | number |
| viewportHeight | number |

---

## Entity: PageContext

| Field | Type |
|-------|------|
| url | string |
| title | string |
| readyState | string |

---

## Relationships

```
ExtensionSettings
  └── defaultSiteId → JiraConnection.id

BugReport
  ├── targetSiteId → JiraConnection.id
  ├── screenshot → Screenshot (1:1, embedded)
  │     └── annotations → Annotation[] (1:N, embedded)
  ├── consoleEntries → ConsoleEntry[] (1:N, embedded)
  ├── networkRequests → NetworkRequest[] (1:N, embedded)
  ├── environment → EnvironmentSnapshot (1:1, embedded)
  └── pageContext → PageContext (1:1, embedded)

JiraConnection[] (0:N, independent)
```

All entities except JiraConnection and ExtensionSettings are
embedded within BugReport (no separate storage keys). JiraConnection
instances are stored as an array in `chrome.storage.local` (metadata)
and `chrome.storage.session` (tokens).
