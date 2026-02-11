import { test, expect } from '../helpers/extension-fixture';
import { MOCK_CONNECTION, MOCK_TOKENS } from '../fixtures/mock-data';
import {
  seedConnection,
  clearAllStorage,
  getStorageValue,
} from '../helpers/storage-helpers';
import type { ExtensionSettings } from '../../../src/models/types';

test.describe('Settings Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
  });

  test('navigate to settings via gear icon', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await page.locator('#settings-btn').click();

    // Should show settings form with checkboxes
    await expect(page.locator('#settings-console')).toBeVisible();
    await expect(page.locator('#settings-network')).toBeVisible();
  });

  test('shows all toggles checked by default', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    await expect(page.locator('#settings-console')).toBeChecked();
    await expect(page.locator('#settings-network')).toBeChecked();
    await expect(page.locator('#settings-env')).toBeChecked();
  });

  test('shows default numeric values', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    await expect(page.locator('#settings-bodymax')).toHaveValue('10240');
    await expect(page.locator('#settings-consolemax')).toHaveValue('1000');
  });

  test('shows default site selector with "None" option and connections', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    const siteSelect = page.locator('#settings-site');
    await expect(siteSelect).toBeVisible();
    await expect(siteSelect.locator('option')).toHaveCount(2); // "None" + 1 connection
    await expect(siteSelect.locator('option').first()).toHaveText('None');
  });

  test('toggle console capture off', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    await page.locator('#settings-console').uncheck();
    await expect(page.locator('#settings-console')).not.toBeChecked();
  });

  test('change body limit', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    await page.locator('#settings-bodymax').fill('20480');
    await expect(page.locator('#settings-bodymax')).toHaveValue('20480');
  });

  test('save persists to storage', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    // Change some values
    await page.locator('#settings-console').uncheck();
    await page.locator('#settings-bodymax').fill('20480');

    // Save
    await page.locator('button:has-text("Save Settings")').click();

    // Verify saved in storage
    const settings = await getStorageValue<ExtensionSettings>(background, 'settings');
    expect(settings).toBeTruthy();
    expect(settings!.captureConsole).toBe(false);
    expect(settings!.networkBodyMaxSize).toBe(20480);
  });

  test('save navigates back to ConnectView', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    await page.locator('button:has-text("Save Settings")').click();

    // Should be back on connect view
    await expect(page.locator('h1')).toHaveText('Jira Bug Tracker');
    await expect(page.locator('.site-list')).toBeVisible();
  });

  test('settings persist across popup reopens', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await page.locator('#settings-btn').click();

    // Change and save
    await page.locator('#settings-console').uncheck();
    await page.locator('#settings-bodymax').fill('51200');
    await page.locator('button:has-text("Save Settings")').click();
    await expect(page.locator('.site-list')).toBeVisible();

    // Close and reopen popup
    await page.close();
    const page2 = await extensionContext.newPage();
    await page2.goto(popupUrl);
    await page2.waitForSelector('.content');
    await page2.locator('#settings-btn').click();

    // Verify persisted values
    await expect(page2.locator('#settings-console')).not.toBeChecked();
    await expect(page2.locator('#settings-bodymax')).toHaveValue('51200');
  });
});
