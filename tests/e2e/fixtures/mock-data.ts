import type {
  JiraConnection,
  JiraConnectionTokens,
  JiraProject,
  JiraIssueType,
  Screenshot,
  BugReport,
  ConsoleEntry,
  NetworkRequest,
  EnvironmentSnapshot,
  PageContext,
} from '../../../src/models/types';

// 1×1 transparent PNG as data URL (valid base64)
const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const MOCK_CONNECTION: JiraConnection = {
  id: 'conn-test-001',
  cloudId: 'cloud-test-001',
  siteUrl: 'https://testsite.atlassian.net',
  siteName: 'testsite',
  displayName: 'Test User',
  accountId: 'account-test-001',
  avatarUrl: '',
  createdAt: Date.now(),
};

export const MOCK_SECOND_CONNECTION: JiraConnection = {
  id: 'conn-test-002',
  cloudId: 'cloud-test-002',
  siteUrl: 'https://secondsite.atlassian.net',
  siteName: 'secondsite',
  displayName: 'Second User',
  accountId: 'account-test-002',
  avatarUrl: '',
  createdAt: Date.now(),
};

export const MOCK_TOKENS: JiraConnectionTokens = {
  accessToken: 'mock-access-token-001',
  refreshToken: 'mock-refresh-token-001',
  tokenExpiresAt: Date.now() + 3_600_000,
};

export const MOCK_SECOND_TOKENS: JiraConnectionTokens = {
  accessToken: 'mock-access-token-002',
  refreshToken: 'mock-refresh-token-002',
  tokenExpiresAt: Date.now() + 3_600_000,
};

export const MOCK_PROJECTS: JiraProject[] = [
  {
    id: 'proj-1',
    key: 'BUG',
    name: 'Bug Tracker',
    projectTypeKey: 'software',
    avatarUrls: {},
  },
  {
    id: 'proj-2',
    key: 'FEAT',
    name: 'Feature Requests',
    projectTypeKey: 'software',
    avatarUrls: {},
  },
];

export const MOCK_ISSUE_TYPES: JiraIssueType[] = [
  { id: 'type-1', name: 'Bug', subtask: false },
  { id: 'type-2', name: 'Task', subtask: false },
  { id: 'type-3', name: 'Sub-task', subtask: true },
];

export const MOCK_SCREENSHOT: Screenshot = {
  originalDataUrl: TRANSPARENT_PNG,
  annotatedDataUrl: null,
  width: 1,
  height: 1,
  annotations: [],
};

const MOCK_CONSOLE_ENTRIES: ConsoleEntry[] = [
  { timestamp: Date.now() - 3000, level: 'log', message: 'Page loaded', source: 'console' },
  { timestamp: Date.now() - 2000, level: 'error', message: 'Uncaught TypeError: null', source: 'console' },
  { timestamp: Date.now() - 1000, level: 'warn', message: 'Deprecated API call', source: 'console' },
];

const MOCK_NETWORK_REQUESTS: NetworkRequest[] = [
  {
    id: 'net-1',
    method: 'GET',
    url: 'https://example.com/api/users',
    statusCode: 200,
    type: 'fetch',
    startTime: Date.now() - 5000,
    endTime: Date.now() - 4800,
    duration: 200,
    responseSize: 1024,
    requestBody: null,
    responseBody: '{"users":[]}',
    error: null,
  },
  {
    id: 'net-2',
    method: 'POST',
    url: 'https://example.com/api/submit',
    statusCode: 500,
    type: 'fetch',
    startTime: Date.now() - 3000,
    endTime: Date.now() - 2500,
    duration: 500,
    responseSize: 256,
    requestBody: '{"data":"test"}',
    responseBody: '{"error":"Internal Server Error"}',
    error: null,
  },
];

const MOCK_ENVIRONMENT: EnvironmentSnapshot = {
  browserName: 'Chrome',
  browserVersion: '120.0.0.0',
  os: 'macOS',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  locale: 'en-US',
  screenWidth: 1920,
  screenHeight: 1080,
  devicePixelRatio: 2,
  viewportWidth: 1280,
  viewportHeight: 720,
};

const MOCK_PAGE_CONTEXT: PageContext = {
  url: 'https://example.com/test-page',
  title: 'Test Page Title',
  readyState: 'complete',
};

export const MOCK_BUG_REPORT: BugReport = {
  id: 'report-test-001',
  status: 'captured',
  title: '',
  description: '',
  targetSiteId: '',
  projectKey: '',
  issueTypeId: '',
  screenshot: MOCK_SCREENSHOT,
  consoleEntries: MOCK_CONSOLE_ENTRIES,
  networkRequests: MOCK_NETWORK_REQUESTS,
  environment: MOCK_ENVIRONMENT,
  pageContext: MOCK_PAGE_CONTEXT,
  capturedAt: Date.now(),
  submittedIssueKey: null,
  submittedIssueUrl: null,
  error: null,
};
