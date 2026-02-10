import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  exchangeCodeForTokens,
  storeTokens,
  getValidToken,
  refreshAccessToken,
} from '../../src/services/auth';
import { completeOAuthFlow, getConnections } from '../../src/models/connection';

// Helper to read tokens directly from local storage (dynamic keys)
async function getStoredTokens(connectionId: string) {
  const key = `tokens:${connectionId}`;
  const result = await chrome.storage.local.get(key);
  return result[key] as { accessToken: string; refreshToken: string; tokenExpiresAt: number } | undefined;
}

describe('auth flow integration', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  describe('full OAuth flow', () => {
    it('should complete OAuth flow: launch → exchange → store tokens → create connection', async () => {
      // Mock chrome.identity.launchWebAuthFlow
      // @ts-expect-error — fake-browser doesn't mock identity
      chrome.identity = {
        launchWebAuthFlow: vi.fn(),
      };

      // Mock token exchange
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: 'read:jira-work write:jira-work offline_access',
      };

      // Mock accessible resources
      const mockResources = [
        {
          id: 'cloud-abc-123',
          name: 'My Jira Site',
          url: 'https://mysite.atlassian.net',
          scopes: ['read:jira-work', 'write:jira-work'],
          avatarUrl: 'https://avatar.example.com/site.png',
        },
      ];

      // Mock user info (Atlassian Identity /me endpoint format)
      const mockUser = {
        account_id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        picture: 'https://avatar.example.com/user.png',
      };

      // Set up fetch mock to handle sequential calls
      const fetchMock = vi.spyOn(globalThis, 'fetch');

      // 1st call: token exchange
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      } as Response);

      // 2nd call: accessible resources
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResources,
      } as Response);

      // 3rd call: current user (Atlassian Identity /me)
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      // Execute the flow
      const tokenData = await exchangeCodeForTokens('test-auth-code');
      expect(tokenData.access_token).toBe('test-access-token');

      const connections = await completeOAuthFlow(tokenData);
      expect(connections.length).toBeGreaterThan(0);

      const connection = connections[0];
      expect(connection.cloudId).toBe('cloud-abc-123');
      expect(connection.siteName).toBe('My Jira Site');
      expect(connection.siteUrl).toBe('https://mysite.atlassian.net');

      // Verify tokens stored in local storage (persistent)
      const storedTokens = await getStoredTokens(connection.id);
      expect(storedTokens).toBeDefined();
      expect(storedTokens!.accessToken).toBe('test-access-token');
      expect(storedTokens!.refreshToken).toBe('test-refresh-token');

      // Verify connection stored in local storage
      const storedConnections = await getConnections();
      expect(storedConnections.length).toBe(1);
      expect(storedConnections[0].cloudId).toBe('cloud-abc-123');
    });

    it('should handle token exchange failure gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      } as Response);

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow(
        'Token exchange failed (400)',
      );
    });
  });

  describe('token refresh flow', () => {
    it('should refresh expired tokens and update stored tokens', async () => {
      const connectionId = 'conn-1';

      // Store initial tokens that are expired
      await storeTokens(connectionId, {
        access_token: 'old-access',
        refresh_token: 'old-refresh',
        expires_in: -1, // Already expired
        scope: 'read:jira-work',
      });

      // Mock the refresh endpoint
      const newTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        scope: 'read:jira-work',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => newTokenResponse,
      } as Response);

      const result = await refreshAccessToken(connectionId, 'old-refresh');
      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');

      // Verify new tokens stored in local storage
      const storedTokens = await getStoredTokens(connectionId);
      expect(storedTokens!.accessToken).toBe('new-access-token');
      expect(storedTokens!.refreshToken).toBe('new-refresh-token');
    });

    it('should auto-refresh via getValidToken when tokens are expired', async () => {
      const connectionId = 'conn-2';

      // Store expired tokens
      await storeTokens(connectionId, {
        access_token: 'expired-access',
        refresh_token: 'valid-refresh',
        expires_in: -100, // Already expired
        scope: 'read:jira-work',
      });

      const newTokenResponse = {
        access_token: 'refreshed-access',
        refresh_token: 'refreshed-refresh',
        expires_in: 3600,
        scope: 'read:jira-work',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => newTokenResponse,
      } as Response);

      const token = await getValidToken(connectionId);
      expect(token).toBe('refreshed-access');
    });

    it('should return existing token when not expired', async () => {
      const connectionId = 'conn-3';

      // Store valid tokens (expires in 1 hour)
      await storeTokens(connectionId, {
        access_token: 'valid-access',
        refresh_token: 'valid-refresh',
        expires_in: 3600,
        scope: 'read:jira-work',
      });

      const token = await getValidToken(connectionId);
      expect(token).toBe('valid-access');
    });

    it('should throw when no tokens exist for connection', async () => {
      await expect(getValidToken('non-existent')).rejects.toThrow(
        'No tokens found for this connection',
      );
    });
  });
});
