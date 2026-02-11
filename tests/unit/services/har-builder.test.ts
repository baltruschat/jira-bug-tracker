import { describe, it, expect } from 'vitest';
import { buildHarFile, redactBody } from '../../../src/services/har-builder';
import type { NetworkRequest } from '../../../src/models/types';

function mockRequest(overrides: Partial<NetworkRequest> = {}): NetworkRequest {
  return {
    id: 'req-1',
    method: 'GET',
    url: 'https://api.example.com/data',
    statusCode: 200,
    type: 'xhr',
    startTime: 1700000000000,
    endTime: 1700000000150,
    duration: 150,
    responseSize: 1024,
    requestBody: null,
    responseBody: '{"ok":true}',
    error: null,
    ...overrides,
  };
}

describe('har-builder', () => {
  describe('buildHarFile', () => {
    it('should return valid JSON with log.version "1.2" and creator.name set', () => {
      const result = buildHarFile([mockRequest()]);
      const har = JSON.parse(result);
      expect(har.log.version).toBe('1.2');
      expect(har.log.creator.name).toBe('Jira Bug Tracker');
      expect(har.log.creator.version).toBeDefined();
    });

    it('should return empty entries array for empty input', () => {
      const result = buildHarFile([]);
      const har = JSON.parse(result);
      expect(har.log.entries).toEqual([]);
    });

    it('should map a single NetworkRequest correctly', () => {
      const req = mockRequest();
      const result = buildHarFile([req]);
      const har = JSON.parse(result);
      const entry = har.log.entries[0];

      // startedDateTime is valid ISO 8601
      expect(new Date(entry.startedDateTime).toISOString()).toBe(entry.startedDateTime);
      // time matches duration
      expect(entry.time).toBe(150);
      // request fields
      expect(entry.request.method).toBe('GET');
      expect(entry.request.url).toBe('https://api.example.com/data');
      // response fields
      expect(entry.response.status).toBe(200);
      expect(entry.response.content.size).toBe(1024);
    });

    it('should include postData only when requestBody is non-null', () => {
      const withBody = mockRequest({ requestBody: '{"key":"value"}' });
      const withoutBody = mockRequest({ requestBody: null });

      const harWith = JSON.parse(buildHarFile([withBody]));
      const harWithout = JSON.parse(buildHarFile([withoutBody]));

      expect(harWith.log.entries[0].request.postData).toBeDefined();
      expect(harWith.log.entries[0].request.postData.text).toBe('{"key":"value"}');
      expect(harWithout.log.entries[0].request.postData).toBeUndefined();
    });

    it('should include content.text only when responseBody is non-null', () => {
      const withBody = mockRequest({ responseBody: '{"data":1}' });
      const withoutBody = mockRequest({ responseBody: null });

      const harWith = JSON.parse(buildHarFile([withBody]));
      const harWithout = JSON.parse(buildHarFile([withoutBody]));

      expect(harWith.log.entries[0].response.content.text).toBe('{"data":1}');
      expect(harWithout.log.entries[0].response.content.text).toBeUndefined();
    });

    it('should handle null/undefined values — statusCode null → status 0, duration null → time 0, responseSize null → content.size 0', () => {
      const req = mockRequest({
        statusCode: null,
        duration: null,
        responseSize: null,
      });
      const har = JSON.parse(buildHarFile([req]));
      const entry = har.log.entries[0];

      expect(entry.response.status).toBe(0);
      expect(entry.time).toBe(0);
      expect(entry.response.content.size).toBe(0);
    });

    it('should use empty arrays for headers, cookies, queryString', () => {
      const har = JSON.parse(buildHarFile([mockRequest()]));
      const entry = har.log.entries[0];

      expect(entry.request.headers).toEqual([]);
      expect(entry.request.cookies).toEqual([]);
      expect(entry.request.queryString).toEqual([]);
      expect(entry.response.headers).toEqual([]);
      expect(entry.response.cookies).toEqual([]);
    });

    it('should set headersSize and bodySize to -1', () => {
      const har = JSON.parse(buildHarFile([mockRequest()]));
      const entry = har.log.entries[0];

      expect(entry.request.headersSize).toBe(-1);
      expect(entry.response.headersSize).toBe(-1);
    });

    it('should include requests with errors — status 0 when statusCode is null', () => {
      const req = mockRequest({
        statusCode: null,
        error: 'net::ERR_CONNECTION_REFUSED',
      });
      const har = JSON.parse(buildHarFile([req]));
      const entry = har.log.entries[0];

      expect(entry.response.status).toBe(0);
    });

    it('should set statusText from HTTP_STATUS_TEXT map', () => {
      const req200 = mockRequest({ statusCode: 200 });
      const req404 = mockRequest({ statusCode: 404 });

      const har200 = JSON.parse(buildHarFile([req200]));
      const har404 = JSON.parse(buildHarFile([req404]));

      expect(har200.log.entries[0].response.statusText).toBe('OK');
      expect(har404.log.entries[0].response.statusText).toBe('Not Found');
    });

    it('should set empty statusText for unknown status codes', () => {
      const req = mockRequest({ statusCode: 999 });
      const har = JSON.parse(buildHarFile([req]));
      expect(har.log.entries[0].response.statusText).toBe('');
    });

    it('should set timings correctly', () => {
      const req = mockRequest({ duration: 250 });
      const har = JSON.parse(buildHarFile([req]));
      const entry = har.log.entries[0];

      expect(entry.timings.send).toBe(0);
      expect(entry.timings.wait).toBe(250);
      expect(entry.timings.receive).toBe(0);
    });

    it('should map multiple requests', () => {
      const requests = [
        mockRequest({ id: 'r1', url: 'https://api.example.com/a' }),
        mockRequest({ id: 'r2', url: 'https://api.example.com/b' }),
        mockRequest({ id: 'r3', url: 'https://api.example.com/c' }),
      ];
      const har = JSON.parse(buildHarFile(requests));
      expect(har.log.entries).toHaveLength(3);
    });
  });

  describe('redactBody', () => {
    it('should redact sensitive JSON field "password"', () => {
      const body = JSON.stringify({ password: 'secret123' });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.password).toBe('[REDACTED]');
    });

    it('should redact "token" field', () => {
      const body = JSON.stringify({ token: 'abc-def' });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.token).toBe('[REDACTED]');
    });

    it('should redact "credit_card" field', () => {
      const body = JSON.stringify({ credit_card: '4111111111111111' });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.credit_card).toBe('[REDACTED]');
    });

    it('should redact "cvv" field', () => {
      const body = JSON.stringify({ cvv: '123' });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.cvv).toBe('[REDACTED]');
    });

    it('should redact nested sensitive fields', () => {
      const body = JSON.stringify({ user: { password: 'x' } });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.user.password).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive fields', () => {
      const body = JSON.stringify({ name: 'John', email: 'j@x.com' });
      const result = redactBody(body);
      const parsed = JSON.parse(result!);
      expect(parsed.name).toBe('John');
      expect(parsed.email).toBe('j@x.com');
    });

    it('should return non-JSON body as-is', () => {
      const body = 'plain text body';
      expect(redactBody(body)).toBe('plain text body');
    });

    it('should return null for null body', () => {
      expect(redactBody(null)).toBeNull();
    });

    it('should apply redaction in full HAR output', () => {
      const req = mockRequest({
        requestBody: JSON.stringify({ password: 'secret', name: 'test' }),
        responseBody: JSON.stringify({ token: 'abc123', data: 'ok' }),
      });
      const har = JSON.parse(buildHarFile([req]));
      const entry = har.log.entries[0];

      const postBody = JSON.parse(entry.request.postData.text);
      expect(postBody.password).toBe('[REDACTED]');
      expect(postBody.name).toBe('test');

      const responseBody = JSON.parse(entry.response.content.text);
      expect(responseBody.token).toBe('[REDACTED]');
      expect(responseBody.data).toBe('ok');
    });
  });
});
