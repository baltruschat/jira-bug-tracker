import { test as base, chromium, type BrowserContext, type Worker } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../../.output/chrome-mv3');

export type ExtensionFixtures = {
  extensionContext: BrowserContext;
  extensionId: string;
  popupUrl: string;
  background: Worker;
};

export const test = base.extend<ExtensionFixtures>({
  extensionContext: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-search-engine-choice-screen',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ extensionContext }, use) => {
    let [background] = extensionContext.serviceWorkers();
    if (!background) {
      background = await extensionContext.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2]!;
    await use(extensionId);
  },

  popupUrl: async ({ extensionId }, use) => {
    await use(`chrome-extension://${extensionId}/popup.html`);
  },

  background: async ({ extensionContext }, use) => {
    let [background] = extensionContext.serviceWorkers();
    if (!background) {
      background = await extensionContext.waitForEvent('serviceworker');
    }
    await use(background);
  },
});

export { expect } from '@playwright/test';
