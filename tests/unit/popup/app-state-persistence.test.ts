// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { App } from '../../../entrypoints/popup/App';
import type { BugReport, JiraConnection, ExtensionSettings } from '../../../src/models/types';

// Mock all external dependencies
vi.mock('../../../src/models/connection', () => ({
  getConnections: vi.fn(),
}));

vi.mock('../../../src/models/settings', () => ({
  getSettings: vi.fn(),
  mergeSettings: vi.fn(),
}));

vi.mock('../../../src/models/bug-report', () => ({
  loadPendingReport: vi.fn(),
  clearPendingReport: vi.fn(),
}));

const mockGetConnections = vi.mocked(
  (await import('../../../src/models/connection')).getConnections,
);
const mockGetSettings = vi.mocked(
  (await import('../../../src/models/settings')).getSettings,
);
const mockLoadPendingReport = vi.mocked(
  (await import('../../../src/models/bug-report')).loadPendingReport,
);

function makeConnection(overrides?: Partial<JiraConnection>): JiraConnection {
  return {
    id: 'conn-1',
    cloudId: 'cloud-abc',
    siteUrl: 'https://mysite.atlassian.net',
    siteName: 'My Site',
    displayName: 'John Doe',
    accountId: 'user-1',
    avatarUrl: 'https://avatar.test/user.png',
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeReport(overrides?: Partial<BugReport>): BugReport {
  return {
    id: 'report-1',
    status: 'captured',
    title: '',
    description: '',
    targetSiteId: '',
    projectKey: '',
    issueTypeId: '',
    screenshot: null,
    consoleEntries: [],
    networkRequests: [],
    environment: null,
    pageContext: null,
    capturedAt: Date.now(),
    submittedIssueKey: null,
    submittedIssueUrl: null,
    error: null,
    ...overrides,
  };
}

const defaultSettings: ExtensionSettings = {
  defaultSiteId: null,
  defaultProjectKey: null,
  defaultIssueTypeId: null,
  captureConsole: true,
  captureNetwork: true,
  captureEnvironment: true,
  networkBodyMaxSize: 10240,
  consoleMaxEntries: 1000,
};

function mockSendMessage(handler: (message: { type: string; payload?: Record<string, unknown> }) => unknown) {
  // @ts-expect-error - override chrome.runtime.sendMessage for testing
  chrome.runtime.sendMessage = vi.fn().mockImplementation(handler);
}

describe('App state persistence', () => {
  let root: HTMLElement;

  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();

    root = document.createElement('div');
    root.id = 'app';
    document.body.innerHTML = '';
    document.body.appendChild(root);

    mockGetSettings.mockResolvedValue(defaultSettings);
    mockGetConnections.mockResolvedValue([]);
    mockLoadPendingReport.mockResolvedValue(null);
  });

  describe('captureFormState on loadProjects', () => {
    it('should persist title and description from DOM when loadProjects triggers re-render', async () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
      ];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          return {
            payload: {
              values: [
                { id: 'p1', key: 'PROJ', name: 'Project', projectTypeKey: 'software', avatarUrls: {} },
              ],
            },
          };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // App should be on the report view (pending report with status 'captured')
      const titleInput = document.getElementById('report-title') as HTMLInputElement;
      const descInput = document.getElementById('report-desc') as HTMLTextAreaElement;
      expect(titleInput).not.toBeNull();
      expect(descInput).not.toBeNull();

      // Simulate user typing
      titleInput.value = 'Login button broken';
      descInput.value = 'When I click login, nothing happens';

      // Simulate site change — triggers loadProjects → captureFormState → render()
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      // Wait for the async loadProjects to complete and re-render
      await vi.waitFor(() => {
        const updatedTitle = document.getElementById('report-title') as HTMLInputElement;
        expect(updatedTitle).not.toBeNull();
        expect(updatedTitle.value).toBe('Login button broken');
      });

      const updatedDesc = document.getElementById('report-desc') as HTMLTextAreaElement;
      expect(updatedDesc.value).toBe('When I click login, nothing happens');
    });

    it('should persist selected site when loadProjects triggers re-render', async () => {
      const connections = [
        makeConnection({ id: 'conn-1', siteName: 'Site A' }),
        makeConnection({ id: 'conn-2', siteName: 'Site B' }),
      ];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          return { payload: { values: [] } };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // Select site conn-2
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-2';
      siteSelect.dispatchEvent(new Event('change'));

      // Wait for re-render and verify site preserved
      await vi.waitFor(() => {
        const updatedSelect = root.querySelector('select') as HTMLSelectElement;
        expect(updatedSelect.value).toBe('conn-2');
      });
    });

    it('should persist selected project when loadIssueTypes triggers re-render', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [
        { id: 'p1', key: 'PROJ', name: 'Project', projectTypeKey: 'software', avatarUrls: {} },
        { id: 'p2', key: 'TEST', name: 'Test', projectTypeKey: 'software', avatarUrls: {} },
      ];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(
        makeReport({ status: 'captured', targetSiteId: 'conn-1' }),
      );

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          return { payload: { values: projects } };
        }
        if (message.type === 'LIST_ISSUE_TYPES') {
          return {
            payload: {
              values: [{ id: '1', name: 'Bug', subtask: false }],
            },
          };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // Trigger loadProjects by selecting a site
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      // Wait for projects to load
      await vi.waitFor(() => {
        const selects = root.querySelectorAll('select');
        const projectOptions = selects[1]?.querySelectorAll('option');
        expect(projectOptions?.length).toBeGreaterThan(1);
      });

      // Select a project — triggers loadIssueTypes → re-render
      const projectSelect = root.querySelectorAll('select')[1] as HTMLSelectElement;
      projectSelect.value = 'TEST';
      projectSelect.dispatchEvent(new Event('change'));

      // Wait for issue types to load and verify project persisted
      await vi.waitFor(() => {
        const selects = root.querySelectorAll('select');
        expect((selects[1] as HTMLSelectElement).value).toBe('TEST');
      });
    });
  });

  describe('error handling', () => {
    it('should display error when loadProjects returns an error response', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          return { error: 'No tokens found for this connection' };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // Select site — triggers loadProjects which returns an error
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const errorDiv = root.querySelector('.error');
        expect(errorDiv).not.toBeNull();
        expect(errorDiv!.textContent).toContain('Failed to load projects');
      });

      // Projects should be empty
      const projectSelect = root.querySelectorAll('select')[1] as HTMLSelectElement;
      const options = projectSelect.querySelectorAll('option');
      expect(options).toHaveLength(1);
      expect(options[0].textContent).toBe('No projects found');
    });

    it('should display error when loadProjects throws', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          throw new Error('Network request failed');
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const errorDiv = root.querySelector('.error');
        expect(errorDiv).not.toBeNull();
        expect(errorDiv!.textContent).toContain('Failed to load projects');
      });
    });

    it('should display error when loadIssueTypes returns an error response', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [
        { id: 'p1', key: 'PROJ', name: 'Project', projectTypeKey: 'software', avatarUrls: {} },
      ];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          return { payload: { values: projects } };
        }
        if (message.type === 'LIST_ISSUE_TYPES') {
          return { error: 'Authentication failed — please reconnect' };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // Select site first
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const selects = root.querySelectorAll('select');
        expect(selects[1]?.querySelectorAll('option')?.length).toBeGreaterThan(1);
      });

      // Select project — triggers loadIssueTypes which returns error
      const projectSelect = root.querySelectorAll('select')[1] as HTMLSelectElement;
      projectSelect.value = 'PROJ';
      projectSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const errorDiv = root.querySelector('.error');
        expect(errorDiv).not.toBeNull();
        expect(errorDiv!.textContent).toContain('Failed to load issue types');
      });
    });

    it('should clear error on successful load after a previous failure', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      let callCount = 0;
      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') {
          callCount++;
          if (callCount === 1) {
            return { error: 'Temporary error' };
          }
          return {
            payload: {
              values: [
                { id: 'p1', key: 'PROJ', name: 'Project', projectTypeKey: 'software', avatarUrls: {} },
              ],
            },
          };
        }
        return {};
      });

      const app = new App(root);
      await app.init();

      // First attempt — returns error
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const errorDiv = root.querySelector('.error');
        expect(errorDiv).not.toBeNull();
      });

      // Second attempt — succeeds (re-select to re-trigger)
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const errorDiv = root.querySelector('.error');
        expect(errorDiv).toBeNull();
        // Projects should now be loaded
        const selects = root.querySelectorAll('select');
        expect(selects[1]?.querySelectorAll('option')?.length).toBe(2); // default + 1 project
      });
    });
  });

  describe('full form state round-trip', () => {
    it('should preserve all form state through site→project→issueType selection flow', async () => {
      const connections = [makeConnection({ id: 'conn-1' })];
      const projects = [
        { id: 'p1', key: 'PROJ', name: 'Project', projectTypeKey: 'software', avatarUrls: {} },
      ];
      const issueTypes = [{ id: '10', name: 'Bug', subtask: false }];

      mockGetConnections.mockResolvedValue(connections);
      mockLoadPendingReport.mockResolvedValue(makeReport({ status: 'captured' }));

      mockSendMessage(async (message) => {
        if (message.type === 'LIST_PROJECTS') return { payload: { values: projects } };
        if (message.type === 'LIST_ISSUE_TYPES') return { payload: { values: issueTypes } };
        return {};
      });

      const app = new App(root);
      await app.init();

      // Step 1: Type title and description
      (document.getElementById('report-title') as HTMLInputElement).value = 'My Bug';
      (document.getElementById('report-desc') as HTMLTextAreaElement).value = 'Bug details here';

      // Step 2: Select site (triggers loadProjects → captureFormState → re-render)
      const siteSelect = root.querySelector('select') as HTMLSelectElement;
      siteSelect.value = 'conn-1';
      siteSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        // Title and description should survive
        expect((document.getElementById('report-title') as HTMLInputElement).value).toBe('My Bug');
        expect((document.getElementById('report-desc') as HTMLTextAreaElement).value).toBe('Bug details here');
        // Site should be preserved
        expect((root.querySelector('select') as HTMLSelectElement).value).toBe('conn-1');
      });

      // Step 3: Select project (triggers loadIssueTypes → captureFormState → re-render)
      const projectSelect = root.querySelectorAll('select')[1] as HTMLSelectElement;
      projectSelect.value = 'PROJ';
      projectSelect.dispatchEvent(new Event('change'));

      await vi.waitFor(() => {
        const selects = root.querySelectorAll('select');
        // All selections and text should be preserved
        expect((selects[0] as HTMLSelectElement).value).toBe('conn-1');
        expect((selects[1] as HTMLSelectElement).value).toBe('PROJ');
        expect((document.getElementById('report-title') as HTMLInputElement).value).toBe('My Bug');
        expect((document.getElementById('report-desc') as HTMLTextAreaElement).value).toBe('Bug details here');
      });
    });
  });
});
