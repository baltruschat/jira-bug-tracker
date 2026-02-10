import { describe, it, expect } from 'vitest';
import {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  ACCESSIBLE_RESOURCES_URL,
  JIRA_API_BASE,
  OAUTH_SCOPES,
  MAX_CONSOLE_ENTRIES,
  MAX_NETWORK_REQUESTS,
  MAX_SCREENSHOT_SIZE_BYTES,
  DEFAULT_NETWORK_BODY_MAX_SIZE,
  DEFAULT_SETTINGS,
  SENSITIVE_HEADERS,
} from '../../../src/utils/constants';

describe('constants', () => {
  describe('OAuth URLs', () => {
    it('should have valid HTTPS authorize URL', () => {
      expect(OAUTH_AUTHORIZE_URL).toBe('https://auth.atlassian.com/authorize');
      expect(OAUTH_AUTHORIZE_URL.startsWith('https://')).toBe(true);
    });

    it('should have valid HTTPS token URL', () => {
      expect(OAUTH_TOKEN_URL).toBe('https://auth.atlassian.com/oauth/token');
      expect(OAUTH_TOKEN_URL.startsWith('https://')).toBe(true);
    });

    it('should have valid accessible resources URL', () => {
      expect(ACCESSIBLE_RESOURCES_URL).toBe(
        'https://api.atlassian.com/oauth/token/accessible-resources',
      );
    });

    it('should have valid Jira API base URL', () => {
      expect(JIRA_API_BASE).toBe('https://api.atlassian.com/ex/jira');
    });
  });

  describe('OAuth scopes', () => {
    it('should include required scopes', () => {
      expect(OAUTH_SCOPES).toContain('read:jira-work');
      expect(OAUTH_SCOPES).toContain('write:jira-work');
      expect(OAUTH_SCOPES).toContain('offline_access');
    });
  });

  describe('limits', () => {
    it('should match data-model.md defaults', () => {
      expect(MAX_CONSOLE_ENTRIES).toBe(1000);
      expect(MAX_NETWORK_REQUESTS).toBe(500);
      expect(MAX_SCREENSHOT_SIZE_BYTES).toBe(5 * 1024 * 1024);
      expect(DEFAULT_NETWORK_BODY_MAX_SIZE).toBe(10240);
    });
  });

  describe('default settings', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_SETTINGS.defaultSiteId).toBeNull();
      expect(DEFAULT_SETTINGS.defaultProjectKey).toBeNull();
      expect(DEFAULT_SETTINGS.defaultIssueTypeId).toBeNull();
      expect(DEFAULT_SETTINGS.captureConsole).toBe(true);
      expect(DEFAULT_SETTINGS.captureNetwork).toBe(true);
      expect(DEFAULT_SETTINGS.captureEnvironment).toBe(true);
      expect(DEFAULT_SETTINGS.networkBodyMaxSize).toBe(10240);
      expect(DEFAULT_SETTINGS.consoleMaxEntries).toBe(1000);
    });
  });

  describe('sensitive headers', () => {
    it('should include all required sensitive headers', () => {
      expect(SENSITIVE_HEADERS).toContain('authorization');
      expect(SENSITIVE_HEADERS).toContain('cookie');
      expect(SENSITIVE_HEADERS).toContain('set-cookie');
      expect(SENSITIVE_HEADERS).toContain('x-api-key');
    });
  });
});
