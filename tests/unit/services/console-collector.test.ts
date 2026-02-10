import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing';
import {
  addEntries,
  getEntries,
  clearBuffer,
  getBufferSize,
} from '../../../src/services/console-collector';
import type { ConsoleEntry } from '../../../src/models/types';

function makeEntry(overrides: Partial<ConsoleEntry> = {}): ConsoleEntry {
  return {
    timestamp: Date.now(),
    level: 'log',
    message: 'test message',
    source: null,
    ...overrides,
  };
}

describe('console-collector', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe('addEntries', () => {
    it('should add entries to an empty buffer', async () => {
      const entries = [makeEntry(), makeEntry({ level: 'error' })];
      await addEntries(1, entries);
      const result = await getEntries(1);
      expect(result).toHaveLength(2);
    });

    it('should append to existing entries', async () => {
      await addEntries(1, [makeEntry()]);
      await addEntries(1, [makeEntry({ level: 'warn' })]);
      const result = await getEntries(1);
      expect(result).toHaveLength(2);
    });

    it('should enforce FIFO cap when exceeding max entries', async () => {
      const maxEntries = 5;
      const entries = Array.from({ length: 10 }, (_, i) =>
        makeEntry({ message: `entry-${i}` }),
      );
      await addEntries(1, entries, maxEntries);
      const result = await getEntries(1);
      expect(result).toHaveLength(5);
      expect(result[0]?.message).toBe('entry-5');
      expect(result[4]?.message).toBe('entry-9');
    });

    it('should handle entries across multiple batches with cap', async () => {
      await addEntries(1, [makeEntry({ message: 'first' })], 3);
      await addEntries(1, [makeEntry({ message: 'second' }), makeEntry({ message: 'third' })], 3);
      await addEntries(1, [makeEntry({ message: 'fourth' })], 3);

      const result = await getEntries(1);
      expect(result).toHaveLength(3);
      expect(result[0]?.message).toBe('second');
      expect(result[2]?.message).toBe('fourth');
    });

    it('should keep separate buffers per tab', async () => {
      await addEntries(1, [makeEntry({ message: 'tab1' })]);
      await addEntries(2, [makeEntry({ message: 'tab2' })]);

      const tab1 = await getEntries(1);
      const tab2 = await getEntries(2);
      expect(tab1).toHaveLength(1);
      expect(tab2).toHaveLength(1);
      expect(tab1[0]?.message).toBe('tab1');
      expect(tab2[0]?.message).toBe('tab2');
    });
  });

  describe('getEntries', () => {
    it('should return empty array for unknown tab', async () => {
      const result = await getEntries(999);
      expect(result).toEqual([]);
    });

    it('should return entries with correct format', async () => {
      await addEntries(1, [
        makeEntry({ timestamp: 1234, level: 'error', message: 'oops', source: 'app.js:10' }),
      ]);
      const result = await getEntries(1);
      expect(result[0]).toEqual({
        timestamp: 1234,
        level: 'error',
        message: 'oops',
        source: 'app.js:10',
      });
    });
  });

  describe('clearBuffer', () => {
    it('should clear all entries for a tab', async () => {
      await addEntries(1, [makeEntry(), makeEntry()]);
      await clearBuffer(1);
      const result = await getEntries(1);
      expect(result).toEqual([]);
    });

    it('should not affect other tabs', async () => {
      await addEntries(1, [makeEntry()]);
      await addEntries(2, [makeEntry()]);
      await clearBuffer(1);
      expect(await getEntries(1)).toEqual([]);
      expect(await getEntries(2)).toHaveLength(1);
    });
  });

  describe('getBufferSize', () => {
    it('should return 0 for empty buffer', async () => {
      expect(await getBufferSize(1)).toBe(0);
    });

    it('should return correct count', async () => {
      await addEntries(1, [makeEntry(), makeEntry(), makeEntry()]);
      expect(await getBufferSize(1)).toBe(3);
    });
  });
});
