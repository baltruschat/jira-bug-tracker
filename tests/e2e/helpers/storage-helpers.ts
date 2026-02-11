import type { Worker } from '@playwright/test';
import type {
  JiraConnection,
  JiraConnectionTokens,
  BugReport,
  ExtensionSettings,
} from '../../../src/models/types';

export async function seedConnection(
  bg: Worker,
  connection: JiraConnection,
  tokens: JiraConnectionTokens,
): Promise<void> {
  await bg.evaluate(
    async ({ conn, tok }) => {
      await chrome.storage.local.set({
        connections: [conn],
        [`tokens:${conn.id}`]: tok,
      });
    },
    { conn: connection, tok: tokens },
  );
}

export async function seedMultipleConnections(
  bg: Worker,
  entries: Array<{ connection: JiraConnection; tokens: JiraConnectionTokens }>,
): Promise<void> {
  await bg.evaluate(async (items) => {
    const data: Record<string, unknown> = {
      connections: items.map((e) => e.connection),
    };
    for (const item of items) {
      data[`tokens:${item.connection.id}`] = item.tokens;
    }
    await chrome.storage.local.set(data);
  }, entries);
}

export async function seedSettings(
  bg: Worker,
  partial: Partial<ExtensionSettings>,
): Promise<void> {
  await bg.evaluate(async (settings) => {
    const existing = (await chrome.storage.local.get('settings')).settings ?? {};
    await chrome.storage.local.set({ settings: { ...existing, ...settings } });
  }, partial);
}

export async function seedPendingReport(
  bg: Worker,
  report: BugReport,
): Promise<void> {
  await bg.evaluate(async (r) => {
    await chrome.storage.local.set({ pendingReport: r });
  }, report);
}

export async function clearAllStorage(bg: Worker): Promise<void> {
  await bg.evaluate(async () => {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
  });
}

export async function getStorageValue<T>(
  bg: Worker,
  key: string,
): Promise<T | undefined> {
  return bg.evaluate(async (k) => {
    const result = await chrome.storage.local.get(k);
    return result[k] as T | undefined;
  }, key);
}
