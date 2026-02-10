import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  addRequest,
  updateRequest,
  correlateBody,
  getRequests,
  clearBuffer,
  createRequestFromWebRequest,
  redactRequestHeaders,
} from '../../../src/services/network-collector';
import type { NetworkRequest } from '../../../src/models/types';

function makeRequest(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    id: 'req-1',
    method: 'GET',
    url: 'https://api.test/data',
    statusCode: null,
    type: 'xmlhttprequest',
    startTime: Date.now(),
    endTime: null,
    duration: null,
    responseSize: null,
    requestBody: null,
    responseBody: null,
    error: null,
    ...overrides,
  };
}

describe('network-collector', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('addRequest', () => {
    it('should add a request to the buffer', async () => {
      await addRequest(1, makeRequest());
      const result = await getRequests(1);
      expect(result).toHaveLength(1);
      expect(result[0]?.url).toBe('https://api.test/data');
    });

    it('should update existing request by ID', async () => {
      await addRequest(1, makeRequest({ statusCode: null }));
      await addRequest(1, makeRequest({ statusCode: 200 }));
      const result = await getRequests(1);
      expect(result).toHaveLength(1);
      expect(result[0]?.statusCode).toBe(200);
    });

    it('should add different requests', async () => {
      await addRequest(1, makeRequest({ id: 'req-1' }));
      await addRequest(1, makeRequest({ id: 'req-2', url: 'https://api.test/other' }));
      const result = await getRequests(1);
      expect(result).toHaveLength(2);
    });
  });

  describe('updateRequest', () => {
    it('should update specific fields of a request', async () => {
      await addRequest(1, makeRequest());
      await updateRequest(1, 'req-1', {
        statusCode: 200,
        endTime: Date.now() + 100,
        duration: 100,
        responseSize: 1024,
      });

      const result = await getRequests(1);
      expect(result[0]?.statusCode).toBe(200);
      expect(result[0]?.duration).toBe(100);
      expect(result[0]?.responseSize).toBe(1024);
    });

    it('should not fail for non-existent request', async () => {
      await updateRequest(1, 'non-existent', { statusCode: 404 });
      const result = await getRequests(1);
      expect(result).toHaveLength(0);
    });
  });

  describe('correlateBody', () => {
    it('should attach body to matching request', async () => {
      const now = Date.now();
      await addRequest(1, makeRequest({ startTime: now }));

      await correlateBody(
        1,
        'https://api.test/data',
        'GET',
        now,
        null,
        '{"result":"ok"}',
      );

      const result = await getRequests(1);
      expect(result[0]?.responseBody).toBe('{"result":"ok"}');
    });

    it('should truncate body to max size', async () => {
      const now = Date.now();
      await addRequest(1, makeRequest({ startTime: now }));

      const longBody = 'x'.repeat(200);
      await correlateBody(1, 'https://api.test/data', 'GET', now, null, longBody, 100);

      const result = await getRequests(1);
      expect(result[0]?.responseBody?.length).toBeLessThan(200);
      expect(result[0]?.responseBody).toContain('[truncated');
    });

    it('should not match if timestamp too far apart', async () => {
      const now = Date.now();
      await addRequest(1, makeRequest({ startTime: now }));

      await correlateBody(
        1,
        'https://api.test/data',
        'GET',
        now + 10_000, // 10 seconds apart
        null,
        '{"result":"ok"}',
      );

      const result = await getRequests(1);
      expect(result[0]?.responseBody).toBeNull();
    });
  });

  describe('getRequests', () => {
    it('should return empty array for unknown tab', async () => {
      const result = await getRequests(999);
      expect(result).toEqual([]);
    });

    it('should keep separate buffers per tab', async () => {
      await addRequest(1, makeRequest({ id: 'r1' }));
      await addRequest(2, makeRequest({ id: 'r2', url: 'https://other.test' }));

      expect(await getRequests(1)).toHaveLength(1);
      expect(await getRequests(2)).toHaveLength(1);
    });
  });

  describe('clearBuffer', () => {
    it('should clear all requests for a tab', async () => {
      await addRequest(1, makeRequest());
      await clearBuffer(1);
      expect(await getRequests(1)).toEqual([]);
    });
  });

  describe('FIFO overflow', () => {
    it('should cap buffer at MAX_NETWORK_REQUESTS', async () => {
      // MAX_NETWORK_REQUESTS is 500, add 502
      for (let i = 0; i < 502; i++) {
        await addRequest(1, makeRequest({ id: `req-${i}`, url: `https://api.test/${i}` }));
      }
      const result = await getRequests(1);
      expect(result.length).toBeLessThanOrEqual(500);
    });
  });

  describe('correlateBody with requestBody', () => {
    it('should attach both request and response bodies', async () => {
      const now = Date.now();
      await addRequest(1, makeRequest({ startTime: now, method: 'POST' }));

      await correlateBody(
        1,
        'https://api.test/data',
        'POST',
        now,
        '{"input":"data"}',
        '{"output":"result"}',
      );

      const result = await getRequests(1);
      expect(result[0]?.requestBody).toBe('{"input":"data"}');
      expect(result[0]?.responseBody).toBe('{"output":"result"}');
    });
  });

  describe('createRequestFromWebRequest', () => {
    it('should create a partial request from webRequest details', () => {
      const details = {
        requestId: 'wr-1',
        method: 'POST',
        url: 'https://api.test/submit',
        type: 'xmlhttprequest' as chrome.webRequest.ResourceType,
        timeStamp: 1234567890,
      } as chrome.webRequest.WebRequestBodyDetails;

      const result = createRequestFromWebRequest(details);
      expect(result.id).toBe('wr-1');
      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.test/submit');
      expect(result.type).toBe('xmlhttprequest');
      expect(result.startTime).toBe(1234567890);
    });
  });

  describe('redactRequestHeaders', () => {
    it('should redact sensitive headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret-token',
        Cookie: 'session=abc123',
      };

      const result = redactRequestHeaders(headers);
      expect(result['Content-Type']).toBe('application/json');
      expect(result['Authorization']).toBe('[REDACTED]');
      expect(result['Cookie']).toBe('[REDACTED]');
    });
  });
});
