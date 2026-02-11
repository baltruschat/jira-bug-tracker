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

test.describe('Report Form Flow', () => {
  test.beforeEach(async ({ background, extensionContext }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
    await setupApiMocks(extensionContext);
  });

  test('shows site selector with connected site', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Status 'captured' → goes directly to report view
    const siteSelect = page.locator('select.select').first();
    await expect(siteSelect).toBeVisible();

    // Should have the mock connection as an option
    const options = siteSelect.locator('option');
    await expect(options).toHaveCount(2); // placeholder + 1 connection
  });

  test('shows title input with required marker', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('label:has-text("Bug Title *")')).toBeVisible();
    await expect(page.locator('#report-title')).toBeVisible();
    await expect(page.locator('#report-title')).toHaveAttribute('required', '');
  });

  test('shows description textarea', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('#report-desc')).toBeVisible();
  });

  test('loads projects on site selection', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Select the site
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // Wait for project select to populate
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
  });

  test('loads issue types on project selection', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Select site
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // Wait for and select project
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');

    // Wait for issue types to load
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
  });

  test('shows project search input when site selected', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    await expect(page.locator('input[placeholder="Search projects..."]')).toBeVisible({ timeout: 5000 });
  });

  test('shows "Attached Data" summary', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const summary = page.locator('.card').filter({ hasText: 'Attached Data' });
    await expect(summary).toBeVisible();
    await expect(summary).toContainText('Screenshot');
    await expect(summary).toContainText('3 console entries');
    await expect(summary).toContainText('2 network requests');
  });

  test('Back button returns to CaptureView', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await page.locator('button:has-text("Back")').click();

    // Should be on capture view
    await expect(page.locator('.screenshot-preview')).toBeVisible();
    await expect(page.locator('text=Continue to Report')).toBeVisible();
  });

  test('prevents submit without title (HTML5 required)', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Select site, project, issue type
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');

    // Leave title empty and click submit
    await page.locator('button:has-text("Submit to Jira")').click();

    // Form should still be visible (HTML5 required prevents submit)
    await expect(page.locator('#report-title')).toBeVisible();
    await expect(page.locator('button:has-text("Submit to Jira")')).toBeVisible();
  });

  test('prevents submit without project/issue type', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, MOCK_BUG_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    // Fill title but skip selectors
    await page.locator('#report-title').fill('Test Bug Title');
    await page.locator('button:has-text("Submit to Jira")').click();

    // Form should remain (handleSubmit returns early)
    await expect(page.locator('#report-title')).toBeVisible();
    await expect(page.locator('button:has-text("Submit to Jira")')).toBeVisible();
  });
});
