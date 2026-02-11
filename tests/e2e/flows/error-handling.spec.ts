import { test, expect } from '../helpers/extension-fixture';
import {
  MOCK_CONNECTION,
  MOCK_TOKENS,
  MOCK_BUG_REPORT,
} from '../fixtures/mock-data';
import {
  seedConnection,
  seedPendingReport,
  clearAllStorage,
} from '../helpers/storage-helpers';
import { setupApiMocks } from '../helpers/api-mocks';

test.describe('Error Handling Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
  });

  test('shows error when projects fail to load', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { projectsError: 403 });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Select site to trigger project load
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText('Failed to load projects');
  });

  test('shows error when issue types fail to load', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { issueTypesError: 500 });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Select site
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // Wait for projects to load and select one
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');

    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText('Failed to load issue types');
  });

  test('shows error on submit API failure', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { createIssueError: true });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Fill form
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');

    await page.locator('#report-title').fill('Error Test Bug');
    await page.locator('button:has-text("Submit to Jira")').click();

    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
  });

  test('shows offline error during submit', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Fill form fully
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');
    await page.locator('#report-title').fill('Offline Bug');

    // Go offline
    await extensionContext.setOffline(true);

    await page.locator('button:has-text("Submit to Jira")').click();

    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText('offline');

    // Restore online
    await extensionContext.setOffline(false);
  });

  test('can retry after error', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { createIssueError: true });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Fill and submit
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');
    await page.locator('#report-title').fill('Retry Bug');
    await page.locator('button:has-text("Submit to Jira")').click();

    // Error shown
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });

    // Form is still interactive — verify title can be modified
    await expect(page.locator('#report-title')).toBeVisible();
    await expect(page.locator('#report-title')).toBeEditable();
  });

  test('form recovers after error clears on site change', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { projectsError: 403 });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Trigger project load error
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });

    // Unroute and set up successful mocks to "fix" the issue
    await extensionContext.unrouteAll();
    await setupApiMocks(extensionContext);

    // Re-select site — triggers clearReportError + new project load
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // Error should be cleared after successful load
    // Wait for projects to load indicating success
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await expect(page.locator('.error')).toBeHidden();
  });
});
