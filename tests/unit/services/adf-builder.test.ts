import { describe, it, expect } from 'vitest';
import {
  buildFullDescription,
  buildEnvironmentTable,
  buildConsoleBlock,
  buildNetworkBlock,
} from '../../../src/services/adf-builder';
import type { EnvironmentSnapshot, ConsoleEntry, NetworkRequest } from '../../../src/models/types';

const mockEnv: EnvironmentSnapshot = {
  browserName: 'Chrome',
  browserVersion: '120.0.0.0',
  os: 'macOS 14.0',
  userAgent: 'Mozilla/5.0 (Macintosh)',
  locale: 'en-US',
  screenWidth: 1920,
  screenHeight: 1080,
  devicePixelRatio: 2,
  viewportWidth: 1440,
  viewportHeight: 900,
};

const mockEntries: ConsoleEntry[] = [
  { timestamp: 1700000000000, level: 'log', message: 'loaded', source: null },
  { timestamp: 1700000001000, level: 'error', message: 'fail', source: 'app.js:10' },
];

const mockRequests: NetworkRequest[] = [
  {
    id: 'r1',
    method: 'GET',
    url: 'https://api.test/data',
    statusCode: 200,
    type: 'xhr',
    startTime: 1700000000000,
    endTime: 1700000000100,
    duration: 100,
    responseSize: 1024,
    requestBody: null,
    responseBody: '{"ok":true}',
    error: null,
  },
];

describe('adf-builder', () => {
  describe('buildFullDescription', () => {
    it('should produce valid ADF document', () => {
      const doc = buildFullDescription('Bug description', mockEnv, mockEntries, mockRequests);
      expect(doc.version).toBe(1);
      expect(doc.type).toBe('doc');
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should include user description as paragraph', () => {
      const doc = buildFullDescription('My bug desc', null, [], []);
      const descHeading = doc.content.find(
        (n) => n.type === 'heading' && n.content?.[0]?.text === 'Description',
      );
      expect(descHeading).toBeDefined();
    });

    it('should skip sections when data is empty', () => {
      const doc = buildFullDescription('', null, [], []);
      expect(doc.content).toEqual([]);
    });

    it('should include environment table when present', () => {
      const doc = buildFullDescription('', mockEnv, [], []);
      const table = doc.content.find((n) => n.type === 'table');
      expect(table).toBeDefined();
    });

    it('should include console codeBlock when entries present', () => {
      const doc = buildFullDescription('', null, mockEntries, []);
      const code = doc.content.find((n) => n.type === 'codeBlock');
      expect(code).toBeDefined();
    });

    it('should include network codeBlock when requests present', () => {
      const doc = buildFullDescription('', null, [], mockRequests);
      const code = doc.content.find((n) => n.type === 'codeBlock');
      expect(code).toBeDefined();
    });
  });

  describe('buildEnvironmentTable', () => {
    it('should produce ADF table node', () => {
      const table = buildEnvironmentTable(mockEnv);
      expect(table.type).toBe('table');
    });

    it('should have header row + data rows', () => {
      const table = buildEnvironmentTable(mockEnv);
      // Header + 7 data rows
      expect(table.content).toHaveLength(8);
    });

    it('should have tableHeader cells in first row', () => {
      const table = buildEnvironmentTable(mockEnv);
      const headerRow = table.content?.[0];
      expect(headerRow?.content?.[0]?.type).toBe('tableHeader');
    });

    it('should wrap cell text in paragraph (ADF validation)', () => {
      const table = buildEnvironmentTable(mockEnv);
      const dataRow = table.content?.[1]; // First data row
      const cell = dataRow?.content?.[0]; // First cell
      expect(cell?.content?.[0]?.type).toBe('paragraph');
    });
  });

  describe('buildConsoleBlock', () => {
    it('should produce codeBlock with language text', () => {
      const block = buildConsoleBlock(mockEntries);
      expect(block.type).toBe('codeBlock');
      expect(block.attrs?.language).toBe('text');
    });

    it('should include timestamp, level, and message', () => {
      const block = buildConsoleBlock(mockEntries);
      const text = block.content?.[0]?.text ?? '';
      expect(text).toContain('LOG');
      expect(text).toContain('loaded');
      expect(text).toContain('ERROR');
      expect(text).toContain('fail');
    });

    it('should include source when available', () => {
      const block = buildConsoleBlock(mockEntries);
      const text = block.content?.[0]?.text ?? '';
      expect(text).toContain('app.js:10');
    });
  });

  describe('buildNetworkBlock', () => {
    it('should produce codeBlock', () => {
      const block = buildNetworkBlock(mockRequests);
      expect(block.type).toBe('codeBlock');
    });

    it('should include method, URL, status, duration', () => {
      const block = buildNetworkBlock(mockRequests);
      const text = block.content?.[0]?.text ?? '';
      expect(text).toContain('GET');
      expect(text).toContain('https://api.test/data');
      expect(text).toContain('200');
      expect(text).toContain('100ms');
    });

    it('should include response body when present', () => {
      const block = buildNetworkBlock(mockRequests);
      const text = block.content?.[0]?.text ?? '';
      expect(text).toContain('Response Body');
      expect(text).toContain('{"ok":true}');
    });
  });
});
