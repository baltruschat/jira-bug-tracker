// ============================================================
// Core Entities
// ============================================================

export interface JiraConnection {
  id: string;
  cloudId: string;
  siteUrl: string;
  siteName: string;
  displayName: string;
  accountId: string;
  avatarUrl: string;
  createdAt: number;
}

export interface JiraConnectionTokens {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
}

export interface ExtensionSettings {
  defaultSiteId: string | null;
  defaultProjectKey: string | null;
  defaultIssueTypeId: string | null;
  captureConsole: boolean;
  captureNetwork: boolean;
  captureEnvironment: boolean;
  networkBodyMaxSize: number;
  consoleMaxEntries: number;
}

export interface BugReport {
  id: string;
  status: BugReportStatus;
  title: string;
  description: string;
  targetSiteId: string;
  projectKey: string;
  issueTypeId: string;
  screenshot: Screenshot | null;
  consoleEntries: ConsoleEntry[];
  networkRequests: NetworkRequest[];
  environment: EnvironmentSnapshot | null;
  pageContext: PageContext | null;
  capturedAt: number;
  submittedIssueKey: string | null;
  submittedIssueUrl: string | null;
  error: string | null;
}

export type BugReportStatus =
  | 'capturing'
  | 'captured'
  | 'submitting'
  | 'submitted'
  | 'error';

// ============================================================
// Capture Data Entities
// ============================================================

export interface Screenshot {
  originalDataUrl: string;
  annotatedDataUrl: string | null;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface Annotation {
  type: 'highlight' | 'redact';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface ConsoleEntry {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  source: string | null;
}

export interface NetworkRequest {
  id: string;
  method: string;
  url: string;
  statusCode: number | null;
  type: string;
  startTime: number;
  endTime: number | null;
  duration: number | null;
  responseSize: number | null;
  requestBody: string | null;
  responseBody: string | null;
  error: string | null;
}

export interface EnvironmentSnapshot {
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
}

export interface PageContext {
  url: string;
  title: string;
  readyState: string;
}

// ============================================================
// Jira API Types
// ============================================================

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls: Record<string, string>;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  active: boolean;
  avatarUrls: Record<string, string>;
}

export interface JiraAccessibleResource {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl: string;
}

export interface JiraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

export interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraAttachmentResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  content: string;
  thumbnail: string;
}

// ============================================================
// Message Types (Chrome Extension messaging)
// ============================================================

export interface ConsoleEntriesBatchMessage {
  type: 'CONSOLE_ENTRIES_BATCH';
  payload: {
    tabId: number;
    entries: ConsoleEntry[];
  };
}

export interface NetworkBodyCapturedMessage {
  type: 'NETWORK_BODY_CAPTURED';
  payload: {
    tabId: number;
    url: string;
    method: string;
    timestamp: number;
    requestBody: string | null;
    responseBody: string | null;
  };
}

export interface TriggerCaptureMessage {
  type: 'TRIGGER_CAPTURE';
  payload: {
    captureConsole: boolean;
    captureNetwork: boolean;
    captureEnvironment: boolean;
  };
}

export interface CaptureResultMessage {
  type: 'CAPTURE_RESULT';
  payload: {
    pageContext: PageContext;
    environment: EnvironmentSnapshot;
  };
}

export interface StartCaptureMessage {
  type: 'START_CAPTURE';
}

export interface SubmitReportMessage {
  type: 'SUBMIT_REPORT';
  payload: {
    reportId: string;
    siteId: string;
    projectKey: string;
    issueTypeId: string;
    title: string;
    description: string;
  };
}

export interface SubmitResultMessage {
  type: 'SUBMIT_RESULT';
  payload: {
    success: boolean;
    issueKey?: string;
    issueUrl?: string;
    error?: string;
    warnings?: string[];
  };
}

export interface StartOAuthMessage {
  type: 'START_OAUTH';
}

export interface DisconnectSiteMessage {
  type: 'DISCONNECT_SITE';
  payload: {
    connectionId: string;
  };
}

export type ExtensionMessage =
  | ConsoleEntriesBatchMessage
  | NetworkBodyCapturedMessage
  | TriggerCaptureMessage
  | CaptureResultMessage
  | StartCaptureMessage
  | SubmitReportMessage
  | SubmitResultMessage
  | StartOAuthMessage
  | DisconnectSiteMessage;

// ============================================================
// HAR 1.2 Types
// ============================================================

/** Top-level HAR document structure (HAR 1.2 spec) */
export interface HarDocument {
  log: HarLog;
}

/** HAR log containing metadata and entries */
export interface HarLog {
  version: '1.2';
  creator: HarCreator;
  entries: HarEntry[];
}

/** Application that generated the HAR file */
export interface HarCreator {
  name: string;
  version: string;
}

/** Single HTTP transaction entry */
export interface HarEntry {
  startedDateTime: string; // ISO 8601
  time: number;            // Total elapsed ms
  request: HarRequest;
  response: HarResponse;
  cache: Record<string, never>; // Empty object (not captured)
  timings: HarTimings;
}

/** HTTP request details */
export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarNameValue[];
  queryString: HarNameValue[];
  cookies: HarNameValue[];
  headersSize: number;  // -1 if unavailable
  bodySize: number;     // -1 if unavailable
  postData?: HarPostData;
}

/** HTTP response details */
export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarNameValue[];
  cookies: HarNameValue[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;  // -1 if unavailable
  bodySize: number;     // -1 if unavailable
}

/** Request body data */
export interface HarPostData {
  mimeType: string;
  text: string;
}

/** Response body content */
export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
}

/** Timing breakdown */
export interface HarTimings {
  send: number;
  wait: number;
  receive: number;
}

/** Generic name-value pair (headers, query string, cookies) */
export interface HarNameValue {
  name: string;
  value: string;
}

// ============================================================
// Storage Key Types
// ============================================================

export interface LocalStorageSchema {
  connections: JiraConnection[];
  settings: ExtensionSettings;
  pendingReport: BugReport | null;
}

export interface SessionStorageSchema {
  [key: `tokens:${string}`]: JiraConnectionTokens;
  [key: `consoleBuffer:${string}`]: ConsoleEntry[];
  [key: `networkBuffer:${string}`]: NetworkRequest[];
}
