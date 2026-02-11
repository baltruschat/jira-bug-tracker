import type {
  BugReport,
  ExtensionSettings,
  CaptureResultMessage,
} from '../models/types';
import { captureScreenshot, compressScreenshot } from './screenshot';
import { getEntries as getConsoleEntries, clearBuffer as clearConsoleBuffer } from './console-collector';
import { getRequests as getNetworkRequests, clearBuffer as clearNetworkBuffer } from './network-collector';
import { getLocal, setLocal } from '../storage/chrome-storage';
import { DEFAULT_SETTINGS } from '../utils/constants';
import { generateId } from '../utils/crypto';

export async function captureAll(tabId: number): Promise<BugReport> {
  const settings: ExtensionSettings =
    (await getLocal('settings')) ?? DEFAULT_SETTINGS;

  const reportId = generateId();

  // Create initial report with 'capturing' status
  const report: BugReport = {
    id: reportId,
    status: 'capturing',
    title: '',
    description: '',
    targetSiteId: settings.defaultSiteId ?? '',
    projectKey: settings.defaultProjectKey ?? '',
    issueTypeId: settings.defaultIssueTypeId ?? '',
    screenshot: null,
    consoleEntries: [],
    networkRequests: [],
    environment: null,
    pageContext: null,
    capturedAt: Date.now(),
    submittedIssueKey: null,
    submittedIssueUrl: null,
    error: null,
  };

  // Capture screenshot (service worker context)
  try {
    const screenshot = await captureScreenshot();
    report.screenshot = await compressScreenshot(screenshot);
  } catch (err) {
    console.error('[Capture] Screenshot failed:', err);
    report.screenshot = null;
  }

  // Collect console entries from buffer
  if (settings.captureConsole) {
    report.consoleEntries = await getConsoleEntries(tabId);
    await clearConsoleBuffer(tabId);
  }

  // Collect network requests from buffer
  if (settings.captureNetwork) {
    report.networkRequests = await getNetworkRequests(tabId);
    await clearNetworkBuffer(tabId);
  }

  // Request page context and environment from content script
  if (settings.captureEnvironment) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'TRIGGER_CAPTURE',
        payload: {
          captureConsole: settings.captureConsole,
          captureNetwork: settings.captureNetwork,
          captureEnvironment: settings.captureEnvironment,
        },
      }) as CaptureResultMessage;

      if (response?.payload) {
        report.pageContext = response.payload.pageContext;
        report.environment = response.payload.environment;
      }
    } catch (err) {
      console.error('[Capture] Content script unavailable:', err);
    }
  }

  report.status = 'captured';

  // Persist as pending report for popup close/reopen recovery
  await setLocal('pendingReport', report);

  return report;
}
