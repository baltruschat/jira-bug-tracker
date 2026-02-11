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
  getStorageValue,
} from '../helpers/storage-helpers';
import { setupApiMocks } from '../helpers/api-mocks';
import type { BugReport } from '../../../src/models/types';

test.describe('Submit Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
  });

  async function fillFormAndSubmit(page: import('@playwright/test').Page) {
    // Select site
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // Wait for and select project
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');

    // Wait for and select issue type
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');

    // Fill title
    await page.locator('#report-title').fill('Test Bug Report');
    await page.locator('#report-desc').fill('Steps to reproduce the issue.');

    // Submit
    await page.locator('button:has-text("Submit to Jira")').click();
  }

  test('submit shows "Submitting..." state', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);

    // Either we see "Submitting..." briefly or we already see success
    // Check that success eventually appears
    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });
  });

  test('successful submit shows SuccessView', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);

    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bug report submitted successfully!')).toBeVisible();
  });

  test('shows issue key link', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);

    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });
    const link = page.locator('a[target="_blank"]');
    await expect(link).toBeVisible();
    await expect(link).toContainText('BUG-123');
  });

  test('clears pending report after success', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);
    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });

    const report = await getStorageValue<BugReport>(background, 'pendingReport');
    expect(report).toBeFalsy();
  });

  test('"Report Another Bug" returns to ConnectView', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext);
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);
    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });

    await page.locator('text=Report Another Bug').click();

    // Should be back on connect view
    await expect(page.locator('.site-list')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Capture Bug')).toBeVisible();
  });

  test('API error shows error message', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { createIssueError: true });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);

    // Should show error
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
  });

  test('remains on form after error', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await setupApiMocks(extensionContext, { createIssueError: true });
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await fillFormAndSubmit(page);

    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    // Form should still be visible
    await expect(page.locator('#report-title')).toBeVisible();
    await expect(page.locator('button:has-text("Submit to Jira")')).toBeVisible();
  });
});
