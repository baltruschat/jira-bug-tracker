import type { ExtensionSettings } from './types';
import { getLocal, setLocal } from '../storage/chrome-storage';
import { DEFAULT_SETTINGS } from '../utils/constants';

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await getLocal('settings');
  if (!stored) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  validateSettings(settings);
  await setLocal('settings', settings);
}

export async function mergeSettings(
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  validateSettings(merged);
  await setLocal('settings', merged);
  return merged;
}

export function validateSettings(settings: ExtensionSettings): void {
  if (settings.networkBodyMaxSize <= 0) {
    throw new Error('networkBodyMaxSize must be greater than 0');
  }
  if (settings.consoleMaxEntries <= 0) {
    throw new Error('consoleMaxEntries must be greater than 0');
  }
}
