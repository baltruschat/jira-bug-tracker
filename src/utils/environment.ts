import type { EnvironmentSnapshot } from '../models/types';

export function getEnvironmentSnapshot(): EnvironmentSnapshot {
  return {
    browserName: getBrowserName(),
    browserVersion: getBrowserVersion(),
    os: getOS(),
    userAgent: navigator.userAgent,
    locale: navigator.language,
    screenWidth: screen.width,
    screenHeight: screen.height,
    devicePixelRatio: window.devicePixelRatio,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  };
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Unknown';
}

function getBrowserVersion(): string {
  const ua = navigator.userAgent;
  const edgeMatch = ua.match(/Edg\/(\d+[\d.]*)/);
  if (edgeMatch) return edgeMatch[1] ?? 'Unknown';
  const chromeMatch = ua.match(/Chrome\/(\d+[\d.]*)/);
  if (chromeMatch) return chromeMatch[1] ?? 'Unknown';
  const firefoxMatch = ua.match(/Firefox\/(\d+[\d.]*)/);
  if (firefoxMatch) return firefoxMatch[1] ?? 'Unknown';
  const safariMatch = ua.match(/Version\/(\d+[\d.]*)/);
  if (safariMatch) return safariMatch[1] ?? 'Unknown';
  return 'Unknown';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows NT 10')) return 'Windows 10';
  if (ua.includes('Windows NT 11') || (ua.includes('Windows NT 10') && ua.includes('rv:'))) return 'Windows 11';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (match) return 'macOS ' + (match[1] ?? '').replace(/_/g, '.');
    return 'macOS';
  }
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('CrOS')) return 'Chrome OS';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}
