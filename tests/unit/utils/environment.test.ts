// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEnvironmentSnapshot } from '../../../src/utils/environment';

describe('environment detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return all required fields', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(snapshot).toHaveProperty('browserName');
    expect(snapshot).toHaveProperty('browserVersion');
    expect(snapshot).toHaveProperty('os');
    expect(snapshot).toHaveProperty('userAgent');
    expect(snapshot).toHaveProperty('locale');
    expect(snapshot).toHaveProperty('screenWidth');
    expect(snapshot).toHaveProperty('screenHeight');
    expect(snapshot).toHaveProperty('devicePixelRatio');
    expect(snapshot).toHaveProperty('viewportWidth');
    expect(snapshot).toHaveProperty('viewportHeight');
  });

  it('should detect browser name from user agent', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.browserName).toBe('string');
    expect(snapshot.browserName.length).toBeGreaterThan(0);
  });

  it('should return numeric screen dimensions', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.screenWidth).toBe('number');
    expect(typeof snapshot.screenHeight).toBe('number');
    expect(typeof snapshot.viewportWidth).toBe('number');
    expect(typeof snapshot.viewportHeight).toBe('number');
    expect(typeof snapshot.devicePixelRatio).toBe('number');
  });

  it('should return locale string', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.locale).toBe('string');
    expect(snapshot.locale.length).toBeGreaterThan(0);
  });

  it('should return userAgent string', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.userAgent).toBe('string');
    expect(snapshot.userAgent.length).toBeGreaterThan(0);
  });

  it('should detect OS from user agent', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.os).toBe('string');
    // happy-dom has a default user agent that may not contain OS info
    expect(snapshot.os.length).toBeGreaterThan(0);
  });

  it('should detect browser version', () => {
    const snapshot = getEnvironmentSnapshot();
    expect(typeof snapshot.browserVersion).toBe('string');
    expect(snapshot.browserVersion.length).toBeGreaterThan(0);
  });
});
