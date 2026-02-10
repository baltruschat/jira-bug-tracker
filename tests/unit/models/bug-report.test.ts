import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  updateReportStatus,
  savePendingReport,
  loadPendingReport,
  clearPendingReport,
  removeNetworkEntry,
} from '../../../src/models/bug-report';
import type { BugReport } from '../../../src/models/types';

function makeReport(overrides: Partial<BugReport> = {}): BugReport {
  return {
    id: 'report-1',
    status: 'capturing',
    title: '',
    description: '',
    targetSiteId: '',
    projectKey: '',
    issueTypeId: '',
    screenshot: null,
    consoleEntries: [],
    networkRequests: [
      {
        id: 'r1',
        method: 'GET',
        url: 'https://api.test/a',
        statusCode: 200,
        type: 'xhr',
        startTime: 0,
        endTime: 100,
        duration: 100,
        responseSize: 100,
        requestBody: null,
        responseBody: null,
        error: null,
      },
      {
        id: 'r2',
        method: 'POST',
        url: 'https://api.test/b',
        statusCode: 201,
        type: 'xhr',
        startTime: 0,
        endTime: 200,
        duration: 200,
        responseSize: 50,
        requestBody: '{}',
        responseBody: null,
        error: null,
      },
    ],
    environment: null,
    pageContext: null,
    capturedAt: Date.now(),
    submittedIssueKey: null,
    submittedIssueUrl: null,
    error: null,
    ...overrides,
  };
}

describe('bug-report model', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('updateReportStatus', () => {
    it('should transition from capturing to captured', () => {
      const report = makeReport({ status: 'capturing' });
      const updated = updateReportStatus(report, 'captured');
      expect(updated.status).toBe('captured');
    });

    it('should transition from captured to submitting', () => {
      const report = makeReport({ status: 'captured' });
      const updated = updateReportStatus(report, 'submitting');
      expect(updated.status).toBe('submitting');
    });

    it('should transition from submitting to submitted', () => {
      const report = makeReport({ status: 'submitting' });
      const updated = updateReportStatus(report, 'submitted', {
        submittedIssueKey: 'BUG-123',
        submittedIssueUrl: 'https://test.atlassian.net/browse/BUG-123',
      });
      expect(updated.status).toBe('submitted');
      expect(updated.submittedIssueKey).toBe('BUG-123');
    });

    it('should transition from submitting to error', () => {
      const report = makeReport({ status: 'submitting' });
      const updated = updateReportStatus(report, 'error', {
        error: 'Network error',
      });
      expect(updated.status).toBe('error');
      expect(updated.error).toBe('Network error');
    });

    it('should not mutate the original report', () => {
      const report = makeReport({ status: 'capturing' });
      updateReportStatus(report, 'captured');
      expect(report.status).toBe('capturing');
    });
  });

  describe('savePendingReport / loadPendingReport', () => {
    it('should save and load a report', async () => {
      const report = makeReport({ title: 'Test bug' });
      await savePendingReport(report);
      const loaded = await loadPendingReport();
      expect(loaded?.title).toBe('Test bug');
    });

    it('should return null when no pending report', async () => {
      const loaded = await loadPendingReport();
      expect(loaded).toBeNull();
    });
  });

  describe('clearPendingReport', () => {
    it('should remove the pending report', async () => {
      await savePendingReport(makeReport());
      await clearPendingReport();
      const loaded = await loadPendingReport();
      expect(loaded).toBeNull();
    });
  });

  describe('removeNetworkEntry', () => {
    it('should remove a specific network request by ID', () => {
      const report = makeReport();
      const updated = removeNetworkEntry(report, 'r1');
      expect(updated.networkRequests).toHaveLength(1);
      expect(updated.networkRequests[0]?.id).toBe('r2');
    });

    it('should not affect other entries', () => {
      const report = makeReport();
      const updated = removeNetworkEntry(report, 'non-existent');
      expect(updated.networkRequests).toHaveLength(2);
    });

    it('should not mutate the original report', () => {
      const report = makeReport();
      removeNetworkEntry(report, 'r1');
      expect(report.networkRequests).toHaveLength(2);
    });
  });
});
