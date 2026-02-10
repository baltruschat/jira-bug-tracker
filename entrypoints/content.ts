export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  main() {
    // Relay messages from MAIN world (injected.ts) to service worker
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      if (!event.data || typeof event.data.type !== 'string') return;

      const { type } = event.data;

      if (type === 'CONSOLE_ENTRIES_BATCH' || type === 'NETWORK_BODY_CAPTURED') {
        chrome.runtime.sendMessage(event.data).catch(() => {
          // Service worker may not be ready yet
        });
      }
    });

    // Handle messages from service worker
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'TRIGGER_CAPTURE') {
        const pageContext = {
          url: window.location.href,
          title: document.title,
          readyState: document.readyState,
        };

        const environment = {
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

        sendResponse({
          type: 'CAPTURE_RESULT',
          payload: { pageContext, environment },
        });
      }
      return true;
    });
  },
});

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function getBrowserVersion(): string {
  const match = navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  return match?.[1] ?? 'Unknown';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
}
