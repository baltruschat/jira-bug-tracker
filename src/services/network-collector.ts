import type { NetworkRequest } from '../models/types';
import { getSession, setSession } from '../storage/chrome-storage';
import { redactHeaders, truncateBody } from './redaction';
import { MAX_NETWORK_REQUESTS, DEFAULT_NETWORK_BODY_MAX_SIZE } from '../utils/constants';

export async function addRequest(
  tabId: number,
  request: NetworkRequest,
): Promise<void> {
  const key = `networkBuffer:${tabId}` as const;
  const existing = ((await getSession(key)) as NetworkRequest[] | undefined) ?? [];

  // Check if we already have this request (by ID)
  const idx = existing.findIndex((r) => r.id === request.id);
  if (idx >= 0) {
    existing[idx] = request;
  } else {
    existing.push(request);
  }

  // FIFO: keep only the most recent MAX_NETWORK_REQUESTS
  const trimmed = existing.length > MAX_NETWORK_REQUESTS
    ? existing.slice(existing.length - MAX_NETWORK_REQUESTS)
    : existing;

  await setSession(key, trimmed);
}

export async function updateRequest(
  tabId: number,
  requestId: string,
  updates: Partial<NetworkRequest>,
): Promise<void> {
  const key = `networkBuffer:${tabId}` as const;
  const existing = ((await getSession(key)) as NetworkRequest[] | undefined) ?? [];

  const idx = existing.findIndex((r) => r.id === requestId);
  if (idx >= 0 && existing[idx]) {
    existing[idx] = { ...existing[idx], ...updates };
    await setSession(key, existing);
  }
}

export async function correlateBody(
  tabId: number,
  url: string,
  method: string,
  timestamp: number,
  requestBody: string | null,
  responseBody: string | null,
  maxBodySize: number = DEFAULT_NETWORK_BODY_MAX_SIZE,
): Promise<void> {
  const key = `networkBuffer:${tabId}` as const;
  const existing = ((await getSession(key)) as NetworkRequest[] | undefined) ?? [];

  // Find best matching request by URL + method + approximate timestamp (within 5 seconds)
  const match = existing.find(
    (r) =>
      r.url === url &&
      r.method === method &&
      Math.abs(r.startTime - timestamp) < 5000,
  );

  if (match) {
    match.requestBody = truncateBody(requestBody, maxBodySize);
    match.responseBody = truncateBody(responseBody, maxBodySize);
    await setSession(key, existing);
  }
}

export async function getRequests(tabId: number): Promise<NetworkRequest[]> {
  const key = `networkBuffer:${tabId}` as const;
  return ((await getSession(key)) as NetworkRequest[] | undefined) ?? [];
}

export async function clearBuffer(tabId: number): Promise<void> {
  const key = `networkBuffer:${tabId}` as const;
  await setSession(key, []);
}

export function createRequestFromWebRequest(
  details: chrome.webRequest.WebRequestBodyDetails | chrome.webRequest.WebResponseCacheDetails,
): Partial<NetworkRequest> {
  return {
    id: details.requestId,
    method: details.method,
    url: details.url,
    type: details.type,
    startTime: details.timeStamp,
  };
}

export function redactRequestHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return redactHeaders(headers);
}
