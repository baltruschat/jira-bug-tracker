import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  getConnections,
  getConnectionById,
  addConnection,
  removeConnection,
} from '../../../src/models/connection';
import type { JiraAccessibleResource, JiraTokenResponse } from '../../../src/models/types';

const mockTokenData: JiraTokenResponse = {
  access_token: 'access-123',
  refresh_token: 'refresh-456',
  expires_in: 3600,
  scope: 'read:jira-work write:jira-work offline_access',
};

const mockResource: JiraAccessibleResource = {
  id: 'cloud-abc',
  name: 'Test Jira',
  url: 'https://test.atlassian.net',
  scopes: ['read:jira-work', 'write:jira-work'],
  avatarUrl: 'https://avatar.test/img.png',
};

describe('connection model', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  describe('getConnections', () => {
    it('should return empty array when no connections exist', async () => {
      const result = await getConnections();
      expect(result).toEqual([]);
    });
  });

  describe('addConnection', () => {
    it('should create and store a new connection', async () => {
      const connection = await addConnection(
        mockTokenData,
        mockResource,
        'John Doe',
        'account-123',
        'https://avatar.test',
      );

      expect(connection.cloudId).toBe('cloud-abc');
      expect(connection.siteUrl).toBe('https://test.atlassian.net');
      expect(connection.siteName).toBe('Test Jira');
      expect(connection.displayName).toBe('John Doe');
      expect(connection.accountId).toBe('account-123');
      expect(connection.id).toBeTruthy();
      expect(connection.createdAt).toBeGreaterThan(0);
    });

    it('should persist connection in storage', async () => {
      await addConnection(mockTokenData, mockResource, 'John Doe', 'acc-1', 'https://av.test');
      const connections = await getConnections();
      expect(connections).toHaveLength(1);
    });

    it('should allow adding multiple connections', async () => {
      await addConnection(mockTokenData, mockResource, 'John', 'acc-1', 'https://av.test');

      const resource2: JiraAccessibleResource = {
        ...mockResource,
        id: 'cloud-def',
        name: 'Other Jira',
        url: 'https://other.atlassian.net',
      };
      await addConnection(mockTokenData, resource2, 'Jane', 'acc-2', 'https://av2.test');

      const connections = await getConnections();
      expect(connections).toHaveLength(2);
    });
  });

  describe('getConnectionById', () => {
    it('should return undefined for non-existent ID', async () => {
      const result = await getConnectionById('non-existent');
      expect(result).toBeUndefined();
    });

    it('should find connection by ID', async () => {
      const connection = await addConnection(
        mockTokenData,
        mockResource,
        'John Doe',
        'acc-1',
        'https://av.test',
      );

      const found = await getConnectionById(connection.id);
      expect(found).toBeDefined();
      expect(found?.cloudId).toBe('cloud-abc');
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection from storage', async () => {
      const connection = await addConnection(
        mockTokenData,
        mockResource,
        'John',
        'acc-1',
        'https://av.test',
      );

      await removeConnection(connection.id);
      const connections = await getConnections();
      expect(connections).toHaveLength(0);
    });

    it('should only remove the specified connection', async () => {
      const conn1 = await addConnection(mockTokenData, mockResource, 'John', 'acc-1', 'https://av.test');
      const resource2: JiraAccessibleResource = {
        ...mockResource,
        id: 'cloud-def',
        name: 'Other',
        url: 'https://other.atlassian.net',
      };
      await addConnection(mockTokenData, resource2, 'Jane', 'acc-2', 'https://av2.test');

      await removeConnection(conn1.id);
      const connections = await getConnections();
      expect(connections).toHaveLength(1);
      expect(connections[0]?.siteName).toBe('Other');
    });
  });
});
