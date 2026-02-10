import { describe, it, expect } from 'vitest';
import {
  redactHeaders,
  truncateBody,
  isSensitiveField,
  redactFormValues,
} from '../../../src/services/redaction';

describe('redaction', () => {
  describe('redactHeaders', () => {
    it('should redact Authorization header', () => {
      const result = redactHeaders({ Authorization: 'Bearer token123' });
      expect(result.Authorization).toBe('[REDACTED]');
    });

    it('should redact Cookie header (case-insensitive)', () => {
      const result = redactHeaders({ cookie: 'session=abc123' });
      expect(result.cookie).toBe('[REDACTED]');
    });

    it('should redact Set-Cookie header', () => {
      const result = redactHeaders({ 'set-cookie': 'session=abc' });
      expect(result['set-cookie']).toBe('[REDACTED]');
    });

    it('should redact X-API-Key header', () => {
      const result = redactHeaders({ 'x-api-key': 'key-123' });
      expect(result['x-api-key']).toBe('[REDACTED]');
    });

    it('should preserve non-sensitive headers', () => {
      const result = redactHeaders({
        'Content-Type': 'application/json',
        Accept: 'text/html',
      });
      expect(result['Content-Type']).toBe('application/json');
      expect(result.Accept).toBe('text/html');
    });

    it('should handle empty headers', () => {
      const result = redactHeaders({});
      expect(result).toEqual({});
    });

    it('should handle mixed sensitive and non-sensitive headers', () => {
      const result = redactHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Bearer secret',
        'X-Request-Id': '123',
        cookie: 'session=abc',
      });
      expect(result['Content-Type']).toBe('application/json');
      expect(result.Authorization).toBe('[REDACTED]');
      expect(result['X-Request-Id']).toBe('123');
      expect(result.cookie).toBe('[REDACTED]');
    });
  });

  describe('truncateBody', () => {
    it('should return null for null input', () => {
      expect(truncateBody(null, 100)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(truncateBody(undefined, 100)).toBeNull();
    });

    it('should return body unchanged if within limit', () => {
      expect(truncateBody('short', 100)).toBe('short');
    });

    it('should return body unchanged if exactly at limit', () => {
      const body = 'x'.repeat(100);
      expect(truncateBody(body, 100)).toBe(body);
    });

    it('should truncate body exceeding limit', () => {
      const body = 'x'.repeat(200);
      const result = truncateBody(body, 100);
      expect(result).toContain('x'.repeat(100));
      expect(result).toContain('[truncated at 100 bytes]');
    });

    it('should handle empty string', () => {
      expect(truncateBody('', 100)).toBe('');
    });
  });

  describe('isSensitiveField', () => {
    it('should detect password fields', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('Password')).toBe(true);
      expect(isSensitiveField('user_password')).toBe(true);
      expect(isSensitiveField('passwd')).toBe(true);
    });

    it('should detect credit card fields', () => {
      expect(isSensitiveField('credit_card')).toBe(true);
      expect(isSensitiveField('creditCard')).toBe(true);
      expect(isSensitiveField('card_number')).toBe(true);
      expect(isSensitiveField('cardNumber')).toBe(true);
    });

    it('should detect other sensitive fields', () => {
      expect(isSensitiveField('cvv')).toBe(true);
      expect(isSensitiveField('cvc')).toBe(true);
      expect(isSensitiveField('ssn')).toBe(true);
      expect(isSensitiveField('social_security')).toBe(true);
      expect(isSensitiveField('secret')).toBe(true);
      expect(isSensitiveField('api_token')).toBe(true);
    });

    it('should not flag non-sensitive fields', () => {
      expect(isSensitiveField('username')).toBe(false);
      expect(isSensitiveField('email')).toBe(false);
      expect(isSensitiveField('firstName')).toBe(false);
      expect(isSensitiveField('description')).toBe(false);
    });
  });

  describe('redactFormValues', () => {
    it('should redact sensitive fields', () => {
      const result = redactFormValues({
        username: 'john',
        password: 'secret123',
        email: 'john@test.com',
      });
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.email).toBe('john@test.com');
    });

    it('should handle empty form data', () => {
      expect(redactFormValues({})).toEqual({});
    });

    it('should handle form with all sensitive fields', () => {
      const result = redactFormValues({
        password: 'abc',
        secret: 'xyz',
        token: '123',
      });
      expect(Object.values(result)).toEqual(['[REDACTED]', '[REDACTED]', '[REDACTED]']);
    });

    it('should handle form with no sensitive fields', () => {
      const input = { name: 'John', city: 'Berlin' };
      expect(redactFormValues(input)).toEqual(input);
    });
  });
});
