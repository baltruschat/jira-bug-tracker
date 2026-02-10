import type { ExtensionSettings } from '../models/types';

// ============================================================
// OAuth URLs
// ============================================================

export const OAUTH_AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
export const OAUTH_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
export const ACCESSIBLE_RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';
export const JIRA_API_BASE = 'https://api.atlassian.com/ex/jira';

// ============================================================
// OAuth Scopes
// ============================================================

export const OAUTH_SCOPES = ['read:jira-work', 'write:jira-work', 'read:me', 'offline_access'];

// ============================================================
// Limits
// ============================================================

export const MAX_CONSOLE_ENTRIES = 1000;
export const MAX_NETWORK_REQUESTS = 500;
export const MAX_SCREENSHOT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const DEFAULT_NETWORK_BODY_MAX_SIZE = 10240; // 10 KB
export const TOKEN_EXPIRY_BUFFER_MS = 60_000; // Refresh 1 minute before expiry

// ============================================================
// Default Settings
// ============================================================

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultSiteId: null,
  defaultProjectKey: null,
  defaultIssueTypeId: null,
  captureConsole: true,
  captureNetwork: true,
  captureEnvironment: true,
  networkBodyMaxSize: DEFAULT_NETWORK_BODY_MAX_SIZE,
  consoleMaxEntries: MAX_CONSOLE_ENTRIES,
};

// ============================================================
// HAR Export
// ============================================================

export const HAR_FILENAME = 'network-capture.har';

export const HTTP_STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
};

// ============================================================
// Sensitive Headers (to be redacted)
// ============================================================

export const SENSITIVE_HEADERS = [
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
];

// ============================================================
// Sensitive Field Patterns (form fields to redact)
// ============================================================

export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /credit.?card/i,
  /card.?number/i,
  /cvv/i,
  /cvc/i,
  /ssn/i,
  /social.?security/i,
];
