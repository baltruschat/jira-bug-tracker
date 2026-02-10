import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  createIssue,
  uploadAttachment,
  listProjects,
  listIssueTypes,
  getCurrentUser,
} from '../../src/services/jira-api';
import { storeTokens } from '../../src/services/auth';
import { setLocal } from '../../src/storage/chrome-storage';
import type { JiraConnection } from '../../src/models/types';

// Helper to set up a valid connection + tokens directly in storage
async function setupConnection(id: string = 'conn-1', cloudId: string = 'cloud-123') {
  const connection: JiraConnection = {
    id,
    cloudId,
    siteUrl: 'https://test.atlassian.net',
    siteName: 'Test Site',
    displayName: 'Test User',
    accountId: 'user-1',
    avatarUrl: 'https://avatar.test/user.png',
    createdAt: Date.now(),
  };

  await setLocal('connections', [connection]);

  await storeTokens(id, {
    access_token: 'valid-access-token',
    refresh_token: 'valid-refresh-token',
    expires_in: 3600,
    scope: 'read:jira-work write:jira-work',
  });
}

describe('jira-api integration', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  describe('createIssue', () => {
    it('should POST to /issue with correct ADF body structure', async () => {
      await setupConnection();

      const adfDescription = {
        version: 1,
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Bug description' }] },
        ],
      };

      const mockResponse = {
        id: '10001',
        key: 'TEST-42',
        self: 'https://test.atlassian.net/rest/api/3/issue/10001',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await createIssue('conn-1', 'TEST', '10001', 'Bug title', adfDescription);

      expect(result.key).toBe('TEST-42');
      expect(result.id).toBe('10001');

      // Verify the request body
      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('/rest/api/3/issue');
      expect(call[1].method).toBe('POST');

      const body = JSON.parse(call[1].body);
      expect(body.fields.project.key).toBe('TEST');
      expect(body.fields.issuetype.id).toBe('10001');
      expect(body.fields.summary).toBe('Bug title');
      expect(body.fields.description).toEqual(adfDescription);
    });

    it('should include Authorization header with valid token', async () => {
      await setupConnection();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', key: 'T-1', self: 'url' }),
      } as Response);

      await createIssue('conn-1', 'T', '1', 'title', {});

      const headers = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer valid-access-token');
    });

    it('should throw on 401 with reconnect message', async () => {
      await setupConnection();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
      } as Response);

      await expect(createIssue('conn-1', 'T', '1', 'title', {})).rejects.toThrow(
        'Authentication failed',
      );
    });

    it('should throw on 429 with rate limit message', async () => {
      await setupConnection();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '30' }),
      } as Response);

      await expect(createIssue('conn-1', 'T', '1', 'title', {})).rejects.toThrow(
        'Rate limited — retry after 30 seconds',
      );
    });
  });

  describe('uploadAttachment', () => {
    it('should POST with FormData and X-Atlassian-Token header', async () => {
      await setupConnection();

      const mockAttachmentResponse = [
        {
          id: 'att-1',
          filename: 'screenshot.png',
          mimeType: 'image/png',
          size: 12345,
          content: 'url',
          thumbnail: 'url',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockAttachmentResponse,
      } as Response);

      const blob = new Blob(['fake-image-data'], { type: 'image/png' });
      const result = await uploadAttachment('conn-1', 'TEST-42', blob);

      expect(result[0].filename).toBe('screenshot.png');

      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('/issue/TEST-42/attachments');
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['X-Atlassian-Token']).toBe('no-check');
      expect(call[1].body).toBeInstanceOf(FormData);
    });
  });

  describe('listProjects', () => {
    it('should GET paginated project list', async () => {
      await setupConnection();

      const mockResponse = {
        values: [
          { id: 'p1', key: 'PROJ', name: 'Project One', projectTypeKey: 'software', avatarUrls: {} },
          { id: 'p2', key: 'TEST', name: 'Test Project', projectTypeKey: 'software', avatarUrls: {} },
        ],
        isLast: true,
        total: 2,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await listProjects('conn-1');
      expect(result.values).toHaveLength(2);
      expect(result.isLast).toBe(true);

      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('/project/search');
      expect(call[0]).toContain('startAt=0');
      expect(call[0]).toContain('maxResults=50');
    });

    it('should pass query parameter for search', async () => {
      await setupConnection();

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [], isLast: true, total: 0 }),
      } as Response);

      await listProjects('conn-1', 'search-term');

      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('query=search-term');
    });

    it('should handle flat array response (no values wrapper)', async () => {
      await setupConnection();

      const flatResponse = [
        { id: 'p1', key: 'PROJ', name: 'Project One', projectTypeKey: 'software', avatarUrls: {} },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => flatResponse,
      } as Response);

      const result = await listProjects('conn-1');
      expect(result.values).toHaveLength(1);
      expect(result.values[0].key).toBe('PROJ');
      expect(result.isLast).toBe(true);
      expect(result.total).toBe(1);
    });
  });

  describe('listIssueTypes', () => {
    it('should GET issue types and filter out subtasks', async () => {
      await setupConnection();

      const mockResponse = {
        values: [
          { id: '1', name: 'Bug', subtask: false },
          { id: '2', name: 'Task', subtask: false },
          { id: '3', name: 'Sub-task', subtask: true },
        ],
        isLast: true,
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST');
      expect(result.values).toHaveLength(2);
      expect(result.values.every((t) => !t.subtask)).toBe(true);

      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('/issue/createmeta/TEST/issuetypes');
    });

    it('should handle flat array response (no values wrapper)', async () => {
      await setupConnection();

      const flatResponse = [
        { id: '1', name: 'Bug', subtask: false },
        { id: '2', name: 'Sub-task', subtask: true },
        { id: '3', name: 'Story', subtask: false },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => flatResponse,
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST');
      expect(result.values).toHaveLength(2);
      expect(result.values.map((t) => t.name)).toEqual(['Bug', 'Story']);
      expect(result.isLast).toBe(true);
    });

    it('should fall back to /issuetype/project when createmeta returns empty and projectId provided', async () => {
      await setupConnection();

      const fetchMock = vi.spyOn(globalThis, 'fetch');

      // 1st call: createmeta returns empty
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [], isLast: true }),
      } as Response);

      // 2nd call: /issuetype/project fallback returns project-specific types
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'Bug', subtask: false },
          { id: '2', name: 'Epic', subtask: false },
          { id: '3', name: 'Sub-task', subtask: true },
        ],
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST', '10100');
      expect(result.values).toHaveLength(2);
      expect(result.values.map((t) => t.name)).toEqual(['Bug', 'Epic']);

      // Verify project-specific fallback URL was called
      const secondCall = fetchMock.mock.calls[1];
      expect(secondCall[0]).toContain('/issuetype/project?projectId=10100');
      expect(secondCall[0]).not.toContain('createmeta');
    });

    it('should fall back to generic /issuetype when no projectId provided', async () => {
      await setupConnection();

      const fetchMock = vi.spyOn(globalThis, 'fetch');

      // 1st call: createmeta returns empty
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [], isLast: true }),
      } as Response);

      // 2nd call: generic /issuetype (no projectId available)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'Bug', subtask: false },
          { id: '2', name: 'Task', subtask: false },
        ],
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST');
      expect(result.values).toHaveLength(2);

      const secondCall = fetchMock.mock.calls[1];
      expect(secondCall[0]).toMatch(/\/issuetype$/);
    });

    it('should fall back to /issuetype/project when createmeta fails', async () => {
      await setupConnection();

      const fetchMock = vi.spyOn(globalThis, 'fetch');

      // 1st call: createmeta returns 404
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      // 2nd call: /issuetype/project fallback
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'Task', subtask: false },
        ],
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST', '10100');
      expect(result.values).toHaveLength(1);
      expect(result.values[0].name).toBe('Task');

      const secondCall = fetchMock.mock.calls[1];
      expect(secondCall[0]).toContain('/issuetype/project?projectId=10100');
    });

    it('should fall through all three endpoints: createmeta → /issuetype/project → /issuetype', async () => {
      await setupConnection();

      const fetchMock = vi.spyOn(globalThis, 'fetch');

      // 1st call: createmeta returns empty
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ values: [], isLast: true }),
      } as Response);

      // 2nd call: /issuetype/project also returns empty
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // 3rd call: generic /issuetype returns types
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: '1', name: 'Bug', subtask: false },
        ],
      } as Response);

      const result = await listIssueTypes('conn-1', 'TEST', '10100');
      expect(result.values).toHaveLength(1);
      expect(result.values[0].name).toBe('Bug');

      // Verify all three calls
      expect(fetchMock.mock.calls).toHaveLength(3);
      expect(fetchMock.mock.calls[0][0]).toContain('createmeta');
      expect(fetchMock.mock.calls[1][0]).toContain('/issuetype/project?projectId=10100');
      expect(fetchMock.mock.calls[2][0]).toMatch(/\/issuetype$/);
    });
  });

  describe('getCurrentUser', () => {
    it('should GET /myself and return user', async () => {
      await setupConnection();

      const mockUser = {
        accountId: 'user-abc',
        displayName: 'John',
        emailAddress: 'john@test.com',
        active: true,
        avatarUrls: {},
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await getCurrentUser('conn-1');
      expect(result.accountId).toBe('user-abc');
      expect(result.displayName).toBe('John');

      const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call[0]).toContain('/myself');
    });
  });
});
