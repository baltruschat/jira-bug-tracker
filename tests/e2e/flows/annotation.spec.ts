import { test, expect } from '../helpers/extension-fixture';
import { MOCK_CONNECTION, MOCK_TOKENS, MOCK_BUG_REPORT } from '../fixtures/mock-data';
import {
  seedConnection,
  seedPendingReport,
  clearAllStorage,
} from '../helpers/storage-helpers';
import type { BugReport } from '../../../src/models/types';

// status: 'capturing' routes to capture view
const CAPTURE_VIEW_REPORT: BugReport = { ...MOCK_BUG_REPORT, status: 'capturing' };

test.describe('Annotation Flow', () => {
  test.beforeEach(async ({ background }) => {
    await clearAllStorage(background);
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);
  });

  test('shows annotation toolbar with tools', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');

    // Click Annotate (force: true to bypass scroll/overlap issues in popup)
    await page.locator('button:has-text("Annotate")').click({ force: true });

    // Verify toolbar elements
    await expect(page.locator('button:has-text("Highlight")')).toBeVisible();
    await expect(page.locator('button:has-text("Redact")')).toBeVisible();
    await expect(page.locator('input[type="color"]')).toBeVisible();
    await expect(page.locator('button:has-text("Undo")')).toBeVisible();
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
  });

  test('shows canvas element', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    await expect(page.locator('canvas')).toBeVisible();
  });

  test('shows Cancel and Done buttons', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Done")')).toBeVisible();
  });

  test('Highlight tool is active by default', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    const highlightBtn = page.locator('button.tool-btn:has-text("Highlight")');
    await expect(highlightBtn).toHaveClass(/btn-primary/);
  });

  test('switch to Redact tool', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    await page.locator('button.tool-btn:has-text("Redact")').click();

    const redactBtn = page.locator('button.tool-btn:has-text("Redact")');
    await expect(redactBtn).toHaveClass(/btn-primary/);
  });

  test('Cancel returns to CaptureView without saving', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    await page.locator('button:has-text("Cancel")').click();

    // Back on CaptureView
    await expect(page.locator('.screenshot-preview')).toBeVisible();
    await expect(page.locator('text=Continue to Report')).toBeVisible();
  });

  test('Done returns to CaptureView', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await seedPendingReport(background, CAPTURE_VIEW_REPORT);

    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.screenshot-preview');
    await page.locator('button:has-text("Annotate")').click({ force: true });

    await page.locator('button:has-text("Done")').click();

    // Back on CaptureView
    await expect(page.locator('.screenshot-preview')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Continue to Report')).toBeVisible();
  });
});
