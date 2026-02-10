# Internal Messaging Contracts

Chrome Extension internal message passing between components.

---

## Message Types (chrome.runtime.sendMessage)

### Content Script → Service Worker

#### CONSOLE_ENTRIES_BATCH
Relays buffered console entries from content script to service worker.

```typescript
interface ConsoleEntriesBatchMessage {
  type: "CONSOLE_ENTRIES_BATCH";
  payload: {
    tabId: number;
    entries: Array<{
      timestamp: number;
      level: "log" | "warn" | "error" | "info";
      message: string;
      source: string | null;
    }>;
  };
}
```

#### NETWORK_BODY_CAPTURED
Relays intercepted request/response body from MAIN world.

```typescript
interface NetworkBodyCapturedMessage {
  type: "NETWORK_BODY_CAPTURED";
  payload: {
    tabId: number;
    url: string;
    method: string;
    timestamp: number;
    requestBody: string | null;
    responseBody: string | null;
  };
}
```

### Service Worker → Content Script

#### TRIGGER_CAPTURE
Initiates data collection on the active tab.

```typescript
interface TriggerCaptureMessage {
  type: "TRIGGER_CAPTURE";
  payload: {
    captureConsole: boolean;
    captureNetwork: boolean;
    captureEnvironment: boolean;
  };
}
```

#### Response: CAPTURE_RESULT

```typescript
interface CaptureResultMessage {
  type: "CAPTURE_RESULT";
  payload: {
    pageContext: {
      url: string;
      title: string;
      readyState: string;
    };
    environment: {
      browserName: string;
      browserVersion: string;
      os: string;
      userAgent: string;
      locale: string;
      screenWidth: number;
      screenHeight: number;
      devicePixelRatio: number;
      viewportWidth: number;
      viewportHeight: number;
    };
  };
}
```

### Popup → Service Worker

#### START_CAPTURE
Popup requests the service worker to orchestrate a full capture.

```typescript
interface StartCaptureMessage {
  type: "START_CAPTURE";
}
```

#### SUBMIT_REPORT
Popup requests the service worker to submit the bug report to Jira.

```typescript
interface SubmitReportMessage {
  type: "SUBMIT_REPORT";
  payload: {
    reportId: string;
    siteId: string;
    projectKey: string;
    issueTypeId: string;
    title: string;
    description: string;
  };
}
```

#### Response: SUBMIT_RESULT

```typescript
interface SubmitResultMessage {
  type: "SUBMIT_RESULT";
  payload: {
    success: boolean;
    issueKey?: string;
    issueUrl?: string;
    error?: string;
  };
}
```

---

## Storage Keys (chrome.storage)

### chrome.storage.local

| Key | Type | Description |
|-----|------|-------------|
| `connections` | JiraConnection[] (without tokens) | Persisted site metadata |
| `settings` | ExtensionSettings | User preferences |
| `pendingReport` | BugReport \| null | Preserved report for recovery |

### chrome.storage.session

| Key | Type | Description |
|-----|------|-------------|
| `tokens:{connectionId}` | { accessToken, refreshToken, expiresAt } | Per-site OAuth tokens |
| `consoleBuffer:{tabId}` | ConsoleEntry[] | Active console buffer per tab |
| `networkBuffer:{tabId}` | NetworkRequest[] | Active network request buffer per tab |
