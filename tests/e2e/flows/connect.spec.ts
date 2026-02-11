import { test, expect } from '../helpers/extension-fixture';
import {
  MOCK_CONNECTION,
  MOCK_TOKENS,
  MOCK_SECOND_CONNECTION,
  MOCK_SECOND_TOKENS,
} from '../fixtures/mock-data';
import {
  seedConnection,
  seedMultipleConnections,
  clearAllStorage,
} from '../helpers/storage-helpers';
import { setupApiMocks } from '../helpers/api-mocks';

test.describe('Connect Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
  });

  test('empty state shows "Add Jira Site" button and empty message', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('text=No Jira Sites Connected')).toBeVisible();
    await expect(page.locator('text=Add Jira Site')).toBeVisible();
  });

  test('shows header "Jira Bug Tracker" and settings button', async ({
    extensionContext,
    popupUrl,
  }) => {
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);

    await expect(page.locator('h1')).toHaveText('Jira Bug Tracker');
    await expect(page.locator('#settings-btn')).toBeVisible();
  });

  test('connected state shows site name, Disconnect, and Capture Bug', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('.site-list')).toBeVisible();
    await expect(page.locator('.site-name')).toHaveText('Test User');
    await expect(page.locator('text=Disconnect')).toBeVisible();
    await expect(page.locator('text=Capture Bug')).toBeVisible();
  });

  test('shows "Add Another Site" button when connected', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.site-list');

    await expect(page.locator('text=Add Another Site')).toBeVisible();
  });

  test('disconnect site returns to empty state', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.site-list');

    page.on('dialog', (dialog) => dialog.accept());
    await page.locator('text=Disconnect').click();

    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5000 });
  });

  test('shows multiple connections', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedMultipleConnections(background, [
      { connection: MOCK_CONNECTION, tokens: MOCK_TOKENS },
      { connection: MOCK_SECOND_CONNECTION, tokens: MOCK_SECOND_TOKENS },
    ]);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.site-list');

    const items = page.locator('.site-item');
    await expect(items).toHaveCount(2);
  });

  test('OAuth loading state shows spinner', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    // Stub chrome.identity.launchWebAuthFlow to hang (never resolve)
    await background.evaluate(() => {
      (chrome.identity as unknown as Record<string, unknown>).launchWebAuthFlow =
        () => new Promise(() => {});
    });

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await page.locator('text=Add Jira Site').click();

    await expect(page.locator('.loading')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Connecting to Jira...')).toBeVisible();
  });

  test('OAuth success adds connection', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);

    // Stub chrome.identity.launchWebAuthFlow to return an auth code
    await background.evaluate(() => {
      (chrome.identity as unknown as Record<string, unknown>).launchWebAuthFlow =
        async (details: { url: string }) => {
          const url = new URL(details.url);
          const state = url.searchParams.get('state');
          const redirectUri = url.searchParams.get('redirect_uri');
          return `${redirectUri}?code=test-auth-code&state=${state}`;
        };
    });

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await page.locator('text=Add Jira Site').click();

    // After OAuth completes, should show connected site
    await expect(page.locator('.site-list')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Capture Bug')).toBeVisible();
  });
});
