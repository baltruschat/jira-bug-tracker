import type { BugReport, BugReportStatus } from './types';
import { getLocal, setLocal, removeLocal } from '../storage/chrome-storage';

export function updateReportStatus(
  report: BugReport,
  status: BugReportStatus,
  extra?: Partial<BugReport>,
): BugReport {
  return { ...report, status, ...extra };
}

export async function savePendingReport(report: BugReport): Promise<void> {
  await setLocal('pendingReport', report);
}

export async function loadPendingReport(): Promise<BugReport | null> {
  return (await getLocal('pendingReport')) ?? null;
}

export async function clearPendingReport(): Promise<void> {
  await removeLocal('pendingReport');
}

export function removeNetworkEntry(
  report: BugReport,
  requestId: string,
): BugReport {
  return {
    ...report,
    networkRequests: report.networkRequests.filter((r) => r.id !== requestId),
  };
}
