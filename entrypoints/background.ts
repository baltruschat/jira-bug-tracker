import { captureAll } from '../src/services/capture';
import { launchOAuthFlow, exchangeCodeForTokens } from '../src/services/auth';
import { completeOAuthFlow, removeConnection } from '../src/models/connection';
import { loadPendingReport } from '../src/models/bug-report';
import { buildFullDescription } from '../src/services/adf-builder';
import { buildHarFile } from '../src/services/har-builder';
import { createIssue, uploadAttachment, listProjects, listIssueTypes } from '../src/services/jira-api';
import { HAR_FILENAME } from '../src/utils/constants';
import { dataUrlToBlob, exportAnnotatedScreenshot } from '../src/services/screenshot';
import { addEntries } from '../src/services/console-collector';
import { addRequest, updateRequest, correlateBody } from '../src/services/network-collector';
import type { NetworkRequest, ConsoleEntry } from '../src/models/types';

export default defineBackground(() => {
  // Register MAIN world content script for console/fetch interception
  chrome.runtime.onInstalled.addListener(async () => {
    try {
      await chrome.scripting.registerContentScripts([
        {
          id: 'injected-main-world',
          matches: ['<all_urls>'],
          js: ['injected.js'],
          runAt: 'document_start',
          world: 'MAIN',
        },
      ]);
    } catch {
      // Script may already be registered
    }
  });

  // Register webRequest listeners for network capture
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.tabId < 0) return;
      const request: NetworkRequest = {
        id: details.requestId,
        method: details.method,
        url: details.url,
        statusCode: null,
        type: details.type,
        startTime: details.timeStamp,
        endTime: null,
        duration: null,
        responseSize: null,
        requestBody: null,
        responseBody: null,
        error: null,
      };
      addRequest(details.tabId, request);
    },
    { urls: ['<all_urls>'] },
  );

  chrome.webRequest.onCompleted.addListener(
    (details) => {
      if (details.tabId < 0) return;
      const contentLength = details.responseHeaders?.find(
        (h) => h.name.toLowerCase() === 'content-length',
      );
      updateRequest(details.tabId, details.requestId, {
        statusCode: details.statusCode,
        endTime: details.timeStamp,
        duration: details.timeStamp - (details.timeStamp - (details.timeStamp % 1)),
        responseSize: contentLength?.value ? parseInt(contentLength.value, 10) : null,
      });
    },
    { urls: ['<all_urls>'] },
    ['responseHeaders'],
  );

  chrome.webRequest.onErrorOccurred.addListener(
    (details) => {
      if (details.tabId < 0) return;
      updateRequest(details.tabId, details.requestId, {
        error: details.error,
        endTime: details.timeStamp,
      });
    },
    { urls: ['<all_urls>'] },
  );

  // Handle keyboard shortcut
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'trigger-capture') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await captureAll(tab.id);
        // Store and open popup
        chrome.action.openPopup?.();
      }
    }
  });

  // Message handler
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep channel open for async
  });
});

async function handleMessage(
  message: { type: string; payload?: Record<string, unknown> },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): Promise<void> {
  try {
    switch (message.type) {
      case 'START_CAPTURE': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          sendResponse({ error: 'No active tab' });
          return;
        }

        // Check for chrome:// or about: pages
        if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('about:')) {
          sendResponse({ error: 'Cannot capture on browser-internal pages' });
          return;
        }

        const report = await captureAll(tab.id);
        sendResponse({ payload: report });
        break;
      }

      case 'START_OAUTH': {
        try {
          console.log('[OAuth] Starting OAuth flow...');
          const { code } = await launchOAuthFlow();
          console.log('[OAuth] Got authorization code, exchanging for tokens...');
          const tokenData = await exchangeCodeForTokens(code);
          console.log('[OAuth] Got tokens, completing OAuth flow...');
          const connections = await completeOAuthFlow(tokenData);
          console.log('[OAuth] Success! Connected sites:', connections.length);
          sendResponse({ payload: { connections } });
        } catch (err) {
          console.error('[OAuth] Error:', err);
          sendResponse({ error: err instanceof Error ? err.message : 'OAuth failed' });
        }
        break;
      }

      case 'DISCONNECT_SITE': {
        const connectionId = message.payload?.connectionId as string;
        if (connectionId) {
          await removeConnection(connectionId);
        }
        sendResponse({ success: true });
        break;
      }

      case 'LIST_PROJECTS': {
        const siteId = message.payload?.siteId as string;
        const query = (message.payload?.query as string) ?? '';
        const result = await listProjects(siteId, query);
        sendResponse({ payload: result });
        break;
      }

      case 'LIST_ISSUE_TYPES': {
        const siteId = message.payload?.siteId as string;
        const projectKey = message.payload?.projectKey as string;
        const projectId = message.payload?.projectId as string | undefined;
        const result = await listIssueTypes(siteId, projectKey, projectId);
        sendResponse({ payload: result });
        break;
      }

      case 'SUBMIT_REPORT': {
        const { siteId, projectKey, issueTypeId, title, description } =
          message.payload as Record<string, string>;

        try {
          const report = await loadPendingReport();
          if (!report) {
            sendResponse({ payload: { success: false, error: 'No pending report found' } });
            return;
          }

          // Build ADF description
          const adfDescription = buildFullDescription(
            description,
            report.environment,
            report.consoleEntries,
            report.pageContext,
            report.networkRequests.length,
          );

          // Create issue
          const issue = await createIssue(siteId, projectKey, issueTypeId, title, adfDescription);

          const warnings: string[] = [];

          // Upload screenshot attachment
          if (report.screenshot) {
            const dataUrl = exportAnnotatedScreenshot(report.screenshot);
            const blob = dataUrlToBlob(dataUrl);
            await uploadAttachment(siteId, issue.key, blob);
          }

          // Upload HAR file attachment
          if (report.networkRequests.length > 0) {
            try {
              const harJson = buildHarFile(report.networkRequests);
              const harBlob = new Blob([harJson], { type: 'application/json' });
              await uploadAttachment(siteId, issue.key, harBlob, HAR_FILENAME);
            } catch {
              warnings.push('Network capture attachment upload failed');
            }
          }

          // Get site URL for issue link
          const { getConnectionById } = await import('../src/models/connection');
          const connection = await getConnectionById(siteId);
          const issueUrl = connection
            ? `${connection.siteUrl}/browse/${issue.key}`
            : issue.self;

          sendResponse({
            payload: {
              success: true,
              issueKey: issue.key,
              issueUrl,
              ...(warnings.length > 0 ? { warnings } : {}),
            },
          });
        } catch (err) {
          sendResponse({
            payload: {
              success: false,
              error: err instanceof Error ? err.message : 'Submission failed',
            },
          });
        }
        break;
      }

      case 'CONSOLE_ENTRIES_BATCH': {
        const { tabId, entries } = message.payload as {
          tabId: number;
          entries: ConsoleEntry[];
        };
        await addEntries(tabId, entries);
        break;
      }

      case 'NETWORK_BODY_CAPTURED': {
        const payload = message.payload as {
          tabId: number;
          url: string;
          method: string;
          timestamp: number;
          requestBody: string | null;
          responseBody: string | null;
        };
        await correlateBody(
          payload.tabId,
          payload.url,
          payload.method,
          payload.timestamp,
          payload.requestBody,
          payload.responseBody,
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    sendResponse({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
