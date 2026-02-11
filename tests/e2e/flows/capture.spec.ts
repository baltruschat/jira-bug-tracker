import { test, expect } from '../helpers/extension-fixture';
import { MOCK_CONNECTION, MOCK_TOKENS, MOCK_BUG_REPORT } from '../fixtures/mock-data';
import {
  seedConnection,
  seedPendingReport,
  clearAllStorage,
} from '../helpers/storage-helpers';
import type { BugReport } from '../../../src/models/types';

// status: 'capturing' routes to capture view (not report view)
const CAPTURE_VIEW_REPORT: BugReport = { ...MOCK_BUG_REPORT, status: 'capturing' };

test.describe('Capture Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
  });

  test('CaptureView shows screenshot preview', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('.screenshot-preview img')).toBeVisible();
  });

  test('shows console badge with count', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const consoleBadge = page.locator('.preview-section').filter({ hasText: 'Console Output' }).locator('.badge').first();
    await expect(consoleBadge).toHaveText('3');
  });

  test('shows error badge for console errors', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const errorBadge = page.locator('.preview-section').filter({ hasText: 'Console Output' }).locator('.badge-error');
    await expect(errorBadge).toBeVisible();
    await expect(errorBadge).toContainText('1');
  });

  test('shows network badge with count', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const networkBadge = page.locator('.preview-section').filter({ hasText: 'Network Requests' }).locator('.badge').first();
    await expect(networkBadge).toHaveText('2');
  });

  test('shows failed badge for 500 response', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const failedBadge = page.locator('.preview-section').filter({ hasText: 'Network Requests' }).locator('.badge-error');
    await expect(failedBadge).toBeVisible();
    await expect(failedBadge).toContainText('1');
  });

  test('shows environment card', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const envCard = page.locator('.card').filter({ hasText: 'Environment' });
    await expect(envCard).toBeVisible();
    await expect(envCard).toContainText('Chrome');
    await expect(envCard).toContainText('macOS');
  });

  test('shows page context card', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const pageCard = page.locator('.card').filter({ hasText: 'Page' });
    await expect(pageCard).toBeVisible();
    await expect(pageCard).toContainText('Test Page Title');
    await expect(pageCard).toContainText('example.com/test-page');
  });

  test('console preview toggles on header click', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const consoleSection = page.locator('.preview-section').filter({ hasText: 'Console Output' });
    const content = consoleSection.locator('.preview-content');

    // Initially hidden
    await expect(content).toBeHidden();

    // Click header to expand
    await consoleSection.locator('.preview-header').click();
    await expect(content).toBeVisible();

    // Click again to collapse
    await consoleSection.locator('.preview-header').click();
    await expect(content).toBeHidden();
  });

  test('network preview toggles on header click', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    const networkSection = page.locator('.preview-section').filter({ hasText: 'Network Requests' });
    const content = networkSection.locator('.preview-content');

    await expect(content).toBeHidden();
    await networkSection.locator('.preview-header').click();
    await expect(content).toBeVisible();
  });

  test('shows action buttons: Re-capture and Continue to Report', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');

    await expect(page.locator('text=Re-capture')).toBeVisible();
    await expect(page.locator('text=Continue to Report')).toBeVisible();
  });
});
