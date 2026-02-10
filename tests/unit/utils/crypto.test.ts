import { describe, it, expect } from 'vitest';
import { generateState, validateState, generateId } from '../../../src/utils/crypto';

describe('crypto utils', () => {
  describe('generateState', () => {
    it('should generate a hex string', () => {
      const state = generateState();
      expect(state).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate a 64-character string (32 bytes)', () => {
      const state = generateState();
      expect(state.length).toBe(64);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('validateState', () => {
    it('should return true for matching states', () => {
      expect(validateState('abc123', 'abc123')).toBe(true);
    });

    it('should return false for mismatched states', () => {
      expect(validateState('abc123', 'xyz789')).toBe(false);
    });

    it('should return false when stored is empty', () => {
      expect(validateState('', 'abc123')).toBe(false);
    });

    it('should return false when received is empty', () => {
      expect(validateState('abc123', '')).toBe(false);
    });

    it('should return false when both are empty', () => {
      expect(validateState('', '')).toBe(false);
    });
  });

  describe('generateId', () => {
    it('should generate a valid UUID v4 string', () => {
      const id = generateId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
