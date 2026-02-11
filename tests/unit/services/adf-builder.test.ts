import { describe, it, expect } from 'vitest';
import {
  buildFullDescription,
  buildEnvironmentTable,
  buildPageContextTable,
  buildConsoleBlock,
} from '../../../src/services/adf-builder';
import type { EnvironmentSnapshot, ConsoleEntry, PageContext } from '../../../src/models/types';

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

const mockPageContext: PageContext = {
  url: 'https://example.com/page',
  title: 'Example Page',
  readyState: 'complete',
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

    it('should show placeholder text when data is empty', () => {
      const doc = buildFullDescription('', null, []);
      const paragraphs = doc.content
        .filter((n) => n.type === 'paragraph')
        .map((n) => n.content?.[0]?.text ?? '');
      expect(paragraphs).toContain('Not captured.');
      expect(paragraphs).toContain('No console entries captured.');
      expect(paragraphs).toContain('No network requests captured.');
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

    it('should include page context table when provided', () => {
      const doc = buildFullDescription('', null, [], mockPageContext);
      const headings = doc.content
        .filter((n) => n.type === 'heading')
        .map((n) => n.content?.[0]?.text ?? '');
      expect(headings).toContain('Page');
      const tables = doc.content.filter((n) => n.type === 'table');
      expect(tables.length).toBeGreaterThanOrEqual(1);
    });

    it('should show network hint with count when requests present', () => {
      const doc = buildFullDescription('desc', mockEnv, [], mockPageContext, 42);
      const paragraphs = doc.content
        .filter((n) => n.type === 'paragraph')
        .map((n) => n.content?.[0]?.text ?? '');
      expect(paragraphs).toContain('42 requests captured — see attached HAR file.');
    });

    it('should include Network section heading', () => {
      const doc = buildFullDescription('description', mockEnv, mockEntries);
      const headings = doc.content
        .filter((n) => n.type === 'heading')
        .map((n) => n.content?.[0]?.text ?? '');
      expect(headings).toContain('Network');
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

  describe('buildPageContextTable', () => {
    it('should produce ADF table node', () => {
      const table = buildPageContextTable(mockPageContext);
      expect(table.type).toBe('table');
    });

    it('should have header row + 3 data rows', () => {
      const table = buildPageContextTable(mockPageContext);
      // Header + URL + Page Title + Ready State
      expect(table.content).toHaveLength(4);
    });

    it('should contain the page URL', () => {
      const table = buildPageContextTable(mockPageContext);
      const allText = JSON.stringify(table);
      expect(allText).toContain('https://example.com/page');
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
