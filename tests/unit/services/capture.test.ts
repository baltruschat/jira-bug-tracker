import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import { captureAll } from '../../../src/services/capture';
import * as consoleCollector from '../../../src/services/console-collector';
import * as networkCollector from '../../../src/services/network-collector';
import * as screenshotService from '../../../src/services/screenshot';
import type { ConsoleEntry, NetworkRequest, Screenshot } from '../../../src/models/types';

const mockScreenshot: Screenshot = {
  originalDataUrl: 'data:image/png;base64,abc',
  annotatedDataUrl: null,
  width: 1920,
  height: 1080,
  annotations: [],
};

const mockConsoleEntries: ConsoleEntry[] = [
  { timestamp: 1000, level: 'log', message: 'hello', source: null },
  { timestamp: 2000, level: 'error', message: 'oops', source: 'app.js:5' },
];

const mockNetworkRequests: NetworkRequest[] = [
  {
    id: 'r1',
    method: 'GET',
    url: 'https://api.test/data',
    statusCode: 200,
    type: 'xhr',
    startTime: 1000,
    endTime: 1100,
    duration: 100,
    responseSize: 512,
    requestBody: null,
    responseBody: null,
    error: null,
  },
];

const mockCaptureResult = {
  type: 'CAPTURE_RESULT',
  payload: {
    pageContext: { url: 'https://test.com', title: 'Test', readyState: 'complete' },
    environment: {
      browserName: 'Chrome',
      browserVersion: '120.0',
      os: 'macOS',
      userAgent: 'Mozilla/5.0',
      locale: 'en-US',
      screenWidth: 1920,
      screenHeight: 1080,
      devicePixelRatio: 2,
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
  },
};

function mockTabsSendMessage(returnValue: unknown) {
  // @ts-expect-error - override chrome.tabs.sendMessage for testing
  chrome.tabs.sendMessage = vi.fn().mockResolvedValue(returnValue);
}

describe('capture orchestrator', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  it('should assemble a complete BugReport', async () => {
    vi.spyOn(screenshotService, 'captureScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(screenshotService, 'compressScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(consoleCollector, 'getEntries').mockResolvedValue(mockConsoleEntries);
    vi.spyOn(networkCollector, 'getRequests').mockResolvedValue(mockNetworkRequests);
    mockTabsSendMessage(mockCaptureResult);

    const report = await captureAll(1);

    expect(report.status).toBe('captured');
    expect(report.screenshot).toEqual(mockScreenshot);
    expect(report.consoleEntries).toEqual(mockConsoleEntries);
    expect(report.networkRequests).toEqual(mockNetworkRequests);
    expect(report.pageContext?.url).toBe('https://test.com');
    expect(report.environment?.browserName).toBe('Chrome');
    expect(report.id).toBeTruthy();
    expect(report.capturedAt).toBeGreaterThan(0);
  });

  it('should skip console capture when disabled', async () => {
    vi.spyOn(screenshotService, 'captureScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(screenshotService, 'compressScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(consoleCollector, 'getEntries').mockResolvedValue(mockConsoleEntries);
    vi.spyOn(networkCollector, 'getRequests').mockResolvedValue([]);
    mockTabsSendMessage(null);

    await fakeBrowser.storage.local.set({
      settings: {
        defaultSiteId: null,
        defaultProjectKey: null,
        defaultIssueTypeId: null,
        captureConsole: false,
        captureNetwork: true,
        captureEnvironment: false,
        networkBodyMaxSize: 10240,
        consoleMaxEntries: 1000,
      },
    });

    const report = await captureAll(1);
    expect(report.consoleEntries).toEqual([]);
    expect(consoleCollector.getEntries).not.toHaveBeenCalled();
  });

  it('should skip network capture when disabled', async () => {
    vi.spyOn(screenshotService, 'captureScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(screenshotService, 'compressScreenshot').mockResolvedValue(mockScreenshot);
    vi.spyOn(consoleCollector, 'getEntries').mockResolvedValue([]);
    vi.spyOn(networkCollector, 'getRequests').mockResolvedValue(mockNetworkRequests);
    mockTabsSendMessage(null);

    await fakeBrowser.storage.local.set({
      settings: {
        defaultSiteId: null,
        defaultProjectKey: null,
        defaultIssueTypeId: null,
        captureConsole: true,
        captureNetwork: false,
        captureEnvironment: false,
        networkBodyMaxSize: 10240,
        consoleMaxEntries: 1000,
      },
    });

    const report = await captureAll(1);
    expect(report.networkRequests).toEqual([]);
    expect(networkCollector.getRequests).not.toHaveBeenCalled();
  });

  it('should handle screenshot capture failure gracefully', async () => {
    vi.spyOn(screenshotService, 'captureScreenshot').mockRejectedValue(
      new Error('Cannot capture on chrome:// page'),
    );
    vi.spyOn(consoleCollector, 'getEntries').mockResolvedValue([]);
    vi.spyOn(networkCollector, 'getRequests').mockResolvedValue([]);
    mockTabsSendMessage(null);

    await fakeBrowser.storage.local.set({
      settings: {
        defaultSiteId: null,
        defaultProjectKey: null,
        defaultIssueTypeId: null,
        captureConsole: true,
        captureNetwork: true,
        captureEnvironment: false,
        networkBodyMaxSize: 10240,
        consoleMaxEntries: 1000,
      },
    });

    const report = await captureAll(1);
    expect(report.status).toBe('captured');
    expect(report.screenshot).toBeNull();
  });
});
