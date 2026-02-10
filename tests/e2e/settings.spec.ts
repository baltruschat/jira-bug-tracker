import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');

async function launchWithExtension(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-first-run',
    ],
  });

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  return { context, extensionId };
}

test.describe('Extension Settings (US5)', () => {
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    const result = await launchWithExtension();
    context = result.context;
    extensionId = result.extensionId;
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('should navigate to settings view when clicking settings button', async () => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);

    // Click settings button
    await popup.click('#settings-btn');

    // Should now be in settings view
    await popup.waitForSelector('.content');
    const content = popup.locator('.content');
    await expect(content).toBeVisible();
  });

  test('should show capture toggle options', async () => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);

    // Navigate to settings
    await popup.click('#settings-btn');
    await popup.waitForTimeout(300);

    // Settings view should contain toggle labels
    const content = await popup.textContent('.content');
    expect(content).toContain('Console');
    expect(content).toContain('Network');
  });

  test('should save settings and navigate back', async () => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`);

    // Navigate to settings
    await popup.click('#settings-btn');
    await popup.waitForTimeout(300);

    // Click save button
    const saveBtn = popup.locator('button:has-text("Save")');
    if (await saveBtn.isVisible()) {
      await saveBtn.click();

      // Should navigate back to connect view
      await popup.waitForTimeout(300);
      const header = popup.locator('h1');
      await expect(header).toHaveText('Jira Bug Tracker');
    }
  });
});
