import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  getLocal,
  setLocal,
  removeLocal,
  getSession,
  setSession,
  removeSession,
} from '../../../src/storage/chrome-storage';
import type { ExtensionSettings, JiraConnection } from '../../../src/models/types';
import { DEFAULT_SETTINGS } from '../../../src/utils/constants';

describe('chrome-storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('local storage', () => {
    it('should return undefined for non-existent key', async () => {
      const result = await getLocal('settings');
      expect(result).toBeUndefined();
    });

    it('should set and get settings', async () => {
      const settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
      await setLocal('settings', settings);
      const result = await getLocal('settings');
      expect(result).toEqual(settings);
    });

    it('should set and get connections', async () => {
      const connections: JiraConnection[] = [
        {
          id: 'test-id',
          cloudId: 'cloud-123',
          siteUrl: 'https://test.atlassian.net',
          siteName: 'Test Site',
          displayName: 'John Doe',
          accountId: 'account-123',
          avatarUrl: 'https://avatar.test/img.png',
          createdAt: Date.now(),
        },
      ];
      await setLocal('connections', connections);
      const result = await getLocal('connections');
      expect(result).toEqual(connections);
    });

    it('should set and get pendingReport as null', async () => {
      await setLocal('pendingReport', null);
      const result = await getLocal('pendingReport');
      // chrome.storage.local returns undefined for null values in fake-browser
      expect(result ?? null).toBeNull();
    });

    it('should remove a key', async () => {
      await setLocal('settings', DEFAULT_SETTINGS);
      await removeLocal('settings');
      const result = await getLocal('settings');
      expect(result).toBeUndefined();
    });
  });

  describe('session storage', () => {
    it('should return undefined for non-existent key', async () => {
      const result = await getSession('tokens:test-id');
      expect(result).toBeUndefined();
    });

    it('should set and get tokens', async () => {
      const tokens = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        tokenExpiresAt: Date.now() + 3600000,
      };
      await setSession('tokens:test-id', tokens);
      const result = await getSession('tokens:test-id');
      expect(result).toEqual(tokens);
    });

    it('should set and get console buffer', async () => {
      const entries = [
        { timestamp: Date.now(), level: 'log' as const, message: 'test', source: null },
      ];
      await setSession('consoleBuffer:1', entries);
      const result = await getSession('consoleBuffer:1');
      expect(result).toEqual(entries);
    });

    it('should remove a session key', async () => {
      await setSession('tokens:test-id', { accessToken: 'x', refreshToken: 'y', tokenExpiresAt: 0 });
      await removeSession('tokens:test-id');
      const result = await getSession('tokens:test-id');
      expect(result).toBeUndefined();
    });
  });
});
