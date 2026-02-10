import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
  storeTokens,
  removeTokens,
  fetchAccessibleResources,
} from '../../../src/services/auth';
import { getSession } from '../../../src/storage/chrome-storage';

describe('auth service', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  describe('buildAuthorizationUrl', () => {
    it('should return a valid Atlassian authorization URL', () => {
      const url = buildAuthorizationUrl();
      expect(url).toContain('https://auth.atlassian.com/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
      expect(url).toContain('state=');
    });

    it('should include required scopes', () => {
      const url = buildAuthorizationUrl();
      expect(url).toContain('read%3Ajira-work');
      expect(url).toContain('write%3Ajira-work');
      expect(url).toContain('offline_access');
    });

    it('should include audience parameter', () => {
      const url = buildAuthorizationUrl();
      expect(url).toContain('audience=api.atlassian.com');
    });

    it('should include prompt=consent', () => {
      const url = buildAuthorizationUrl();
      expect(url).toContain('prompt=consent');
    });

    it('should generate a unique state parameter each time', () => {
      const url1 = buildAuthorizationUrl();
      const url2 = buildAuthorizationUrl();
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');
      expect(state1).not.toBe(state2);
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should POST to token endpoint with correct body', async () => {
      const mockResponse = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expires_in: 3600,
        scope: 'read:jira-work write:jira-work offline_access',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await exchangeCodeForTokens('auth-code-xyz');
      expect(result).toEqual(mockResponse);

      expect(fetch).toHaveBeenCalledWith(
        'https://auth.atlassian.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.grant_type).toBe('authorization_code');
      expect(body.code).toBe('auth-code-xyz');
    });

    it('should throw on failed token exchange', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
        'Token exchange failed (401)',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should POST refresh_token grant type', async () => {
      const mockResponse = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        scope: 'read:jira-work',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await refreshAccessToken('conn-1', 'old-refresh');
      expect(result.access_token).toBe('new-access');
      expect(result.refresh_token).toBe('new-refresh');

      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body.grant_type).toBe('refresh_token');
      expect(body.refresh_token).toBe('old-refresh');
    });

    it('should store new tokens in session storage', async () => {
      const mockResponse = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        scope: 'read:jira-work',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await refreshAccessToken('conn-1', 'old-refresh');

      const stored = await getSession('tokens:conn-1');
      expect(stored).toBeDefined();
      expect((stored as { accessToken: string }).accessToken).toBe('new-access');
      expect((stored as { refreshToken: string }).refreshToken).toBe('new-refresh');
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future expiry', () => {
      const futureTime = Date.now() + 3600_000;
      expect(isTokenExpired(futureTime)).toBe(false);
    });

    it('should return true for past expiry', () => {
      const pastTime = Date.now() - 1000;
      expect(isTokenExpired(pastTime)).toBe(true);
    });

    it('should return true when within buffer period', () => {
      // Token expires in 30 seconds, but buffer is 60 seconds
      const soonTime = Date.now() + 30_000;
      expect(isTokenExpired(soonTime)).toBe(true);
    });

    it('should return false when just outside buffer period', () => {
      // Token expires in 120 seconds, buffer is 60 seconds
      const safeTime = Date.now() + 120_000;
      expect(isTokenExpired(safeTime)).toBe(false);
    });
  });

  describe('storeTokens', () => {
    it('should store tokens in session storage', async () => {
      await storeTokens('conn-1', {
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        expires_in: 3600,
        scope: 'read:jira-work',
      });

      const stored = await getSession('tokens:conn-1');
      expect(stored).toBeDefined();
      expect((stored as { accessToken: string }).accessToken).toBe('access-abc');
    });
  });

  describe('removeTokens', () => {
    it('should remove tokens from session storage', async () => {
      await storeTokens('conn-1', {
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        expires_in: 3600,
        scope: 'read:jira-work',
      });

      await removeTokens('conn-1');
      const stored = await getSession('tokens:conn-1');
      expect(stored).toBeUndefined();
    });
  });

  describe('fetchAccessibleResources', () => {
    it('should GET accessible resources with Bearer token', async () => {
      const mockResources = [
        {
          id: 'cloud-123',
          name: 'My Site',
          url: 'https://mysite.atlassian.net',
          scopes: ['read:jira-work', 'write:jira-work'],
          avatarUrl: 'https://avatar.test',
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResources,
      } as Response);

      const result = await fetchAccessibleResources('my-token');
      expect(result).toEqual(mockResources);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        { headers: { Authorization: 'Bearer my-token' } },
      );
    });

    it('should throw on failed request', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      await expect(fetchAccessibleResources('bad-token')).rejects.toThrow(
        'Failed to fetch accessible resources',
      );
    });
  });
});
