import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  getSettings,
  saveSettings,
  mergeSettings,
  validateSettings,
} from '../../../src/models/settings';
import { DEFAULT_SETTINGS } from '../../../src/utils/constants';

describe('settings model', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('getSettings', () => {
    it('should return defaults when no settings stored', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should return stored settings', async () => {
      await fakeBrowser.storage.local.set({
        settings: { ...DEFAULT_SETTINGS, captureConsole: false },
      });
      const settings = await getSettings();
      expect(settings.captureConsole).toBe(false);
    });

    it('should fill missing fields with defaults', async () => {
      await fakeBrowser.storage.local.set({
        settings: { captureConsole: false },
      });
      const settings = await getSettings();
      expect(settings.captureConsole).toBe(false);
      expect(settings.captureNetwork).toBe(true);
      expect(settings.networkBodyMaxSize).toBe(10240);
    });
  });

  describe('saveSettings', () => {
    it('should persist settings to storage', async () => {
      const settings = { ...DEFAULT_SETTINGS, consoleMaxEntries: 500 };
      await saveSettings(settings);
      const loaded = await getSettings();
      expect(loaded.consoleMaxEntries).toBe(500);
    });

    it('should throw for invalid networkBodyMaxSize', async () => {
      const settings = { ...DEFAULT_SETTINGS, networkBodyMaxSize: 0 };
      await expect(saveSettings(settings)).rejects.toThrow('networkBodyMaxSize');
    });

    it('should throw for invalid consoleMaxEntries', async () => {
      const settings = { ...DEFAULT_SETTINGS, consoleMaxEntries: -1 };
      await expect(saveSettings(settings)).rejects.toThrow('consoleMaxEntries');
    });
  });

  describe('mergeSettings', () => {
    it('should update only specified fields', async () => {
      await mergeSettings({ captureConsole: false });
      const settings = await getSettings();
      expect(settings.captureConsole).toBe(false);
      expect(settings.captureNetwork).toBe(true);
    });

    it('should return the merged settings', async () => {
      const result = await mergeSettings({ defaultProjectKey: 'BUG' });
      expect(result.defaultProjectKey).toBe('BUG');
    });
  });

  describe('validateSettings', () => {
    it('should accept valid settings', () => {
      expect(() => validateSettings(DEFAULT_SETTINGS)).not.toThrow();
    });

    it('should reject zero networkBodyMaxSize', () => {
      expect(() =>
        validateSettings({ ...DEFAULT_SETTINGS, networkBodyMaxSize: 0 }),
      ).toThrow();
    });

    it('should reject negative consoleMaxEntries', () => {
      expect(() =>
        validateSettings({ ...DEFAULT_SETTINGS, consoleMaxEntries: -1 }),
      ).toThrow();
    });
  });
});
