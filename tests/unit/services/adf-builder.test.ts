import { describe, it, expect } from 'vitest';
import {
  buildFullDescription,
  buildEnvironmentTable,
  buildConsoleBlock,
} from '../../../src/services/adf-builder';
import type { EnvironmentSnapshot, ConsoleEntry } from '../../../src/models/types';

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

describe('adf-builder', () => {
  describe('buildFullDescription', () => {
    it('should produce valid ADF document', () => {
      const doc = buildFullDescription('Bug description', mockEnv, mockEntries);
      expect(doc.version).toBe(1);
      expect(doc.type).toBe('doc');
      expect(doc.content.length).toBeGreaterThan(0);
    });

    it('should include user description as paragraph', () => {
      const doc = buildFullDescription('My bug desc', null, []);
      const descHeading = doc.content.find(
        (n) => n.type === 'heading' && n.content?.[0]?.text === 'Description',
      );
      expect(descHeading).toBeDefined();
    });

    it('should skip sections when data is empty', () => {
      const doc = buildFullDescription('', null, []);
      expect(doc.content).toEqual([]);
    });

    it('should include environment table when present', () => {
      const doc = buildFullDescription('', mockEnv, []);
      const table = doc.content.find((n) => n.type === 'table');
      expect(table).toBeDefined();
    });

    it('should include console codeBlock when entries present', () => {
      const doc = buildFullDescription('', null, mockEntries);
      const code = doc.content.find((n) => n.type === 'codeBlock');
      expect(code).toBeDefined();
    });

    it('should NOT include network code block even when requests are provided', () => {
      // Network data is now conveyed exclusively through HAR attachment
      const doc = buildFullDescription('description', mockEnv, mockEntries);
      const allText = doc.content
        .filter((n) => n.type === 'heading')
        .map((n) => n.content?.[0]?.text ?? '')
        .join(' ');
      expect(allText).not.toContain('Network');
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

});
