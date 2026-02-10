import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');

// Helper to launch browser with extension loaded
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

  // Wait for service worker to register
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  return { context, extensionId };
}

test.describe('Connect View (US1)', () => {
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

  test('should show "Add Jira Site" button on initial open', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    // Wait for the connect view to render
    await page.waitForSelector('.content');

    // Should see add site button
    const addButton = page.locator('text=Add Jira Site');
    await expect(addButton).toBeVisible();
  });

  test('should show settings button in header', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const settingsBtn = page.locator('#settings-btn');
    await expect(settingsBtn).toBeVisible();
  });

  test('should show header with extension name', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const header = page.locator('h1');
    await expect(header).toHaveText('Jira Bug Tracker');
  });
});
