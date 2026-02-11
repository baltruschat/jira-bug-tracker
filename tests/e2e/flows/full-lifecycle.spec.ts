import { test, expect } from '../helpers/extension-fixture';
import { MOCK_CONNECTION, MOCK_TOKENS, MOCK_BUG_REPORT } from '../fixtures/mock-data';
import {
  seedConnection,
  seedPendingReport,
  clearAllStorage,
} from '../helpers/storage-helpers';
import { setupApiMocks } from '../helpers/api-mocks';

test.describe('Full Lifecycle', () => {
  test('golden path: connect → capture → report → submit → success → new report', async ({
    extensionContext,
    popupUrl,
    background,
  }) => {
    await clearAllStorage(background);
    await setupApiMocks(extensionContext);

    // 1. Seed connection + tokens (bypass OAuth UI)
    await seedConnection(background, MOCK_CONNECTION, MOCK_TOKENS);

    // 2. Open popup → verify connected state with "Capture Bug"
    const page = await extensionContext.newPage();
    await page.goto(popupUrl);
    await page.waitForSelector('.content');
    await expect(page.locator('.site-list')).toBeVisible();
    await expect(page.locator('text=Capture Bug')).toBeVisible();

    // 3. Seed pending report (bypass actual capture which needs real tab)
    await seedPendingReport(background, MOCK_BUG_REPORT);

    // 4. Reload popup → CaptureView (status 'captured' → report view)
    await page.reload();
    await page.waitForSelector('.content');

    // Status 'captured' goes to report view. Verify report form is shown.
    await expect(page.locator('#report-title')).toBeVisible();

    // 5. Navigate Back to see CaptureView with screenshot, console, network data
    await page.locator('button:has-text("Back")').click();
    await expect(page.locator('.screenshot-preview')).toBeVisible();
    await expect(page.locator('.preview-section')).toHaveCount(2); // console + network

    // 6. Click "Continue to Report" → ReportFormView
    await page.locator('text=Continue to Report').click();
    await expect(page.locator('#report-title')).toBeVisible();

    // 7. Select site → projects load (mocked)
    const siteSelect = page.locator('select.select').first();
    await siteSelect.selectOption(MOCK_CONNECTION.id);

    // 8. Select project → issue types load (mocked)
    const projectSelect = page.locator('select.select').nth(1);
    await expect(projectSelect.locator('option:has-text("Bug Tracker (BUG)")')).toBeAttached({ timeout: 5000 });
    await projectSelect.selectOption('BUG');

    // 9. Select issue type, fill title + description
    const issueTypeSelect = page.locator('select.select').nth(2);
    await expect(issueTypeSelect.locator('option:has-text("Bug")')).toBeAttached({ timeout: 5000 });
    await issueTypeSelect.selectOption('type-1');

    await page.locator('#report-title').fill('Lifecycle Test Bug');
    await page.locator('#report-desc').fill('Full lifecycle test description.');

    // 10. Click "Submit to Jira" → "Submitting..." state
    await page.locator('button:has-text("Submit to Jira")').click();

    // 11. SuccessView → "BUG-123" link visible
    await expect(page.locator('.success')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Bug report submitted successfully!')).toBeVisible();
    await expect(page.locator('a[target="_blank"]')).toContainText('BUG-123');

    // 12. Click "Report Another Bug" → ConnectView
    await page.locator('text=Report Another Bug').click();
    await expect(page.locator('.site-list')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Capture Bug')).toBeVisible();
  });
});
