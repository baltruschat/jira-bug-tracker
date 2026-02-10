export default defineUnlistedScript({
  main() {
    // MAIN world script — monkey-patches console and network APIs
    // Registered via chrome.scripting.registerContentScripts with world: "MAIN"
    interceptConsole();
    interceptFetch();
    interceptXHR();
  },
});

// ============================================================
// Console Interception
// ============================================================

const CONSOLE_BATCH_INTERVAL = 500; // ms
const CONSOLE_BATCH_MAX = 50; // max entries per batch

interface ConsoleEntryData {
  timestamp: number;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  source: string | null;
}

const consoleBatchBuffer: ConsoleEntryData[] = [];
let consoleBatchTimer: ReturnType<typeof setTimeout> | null = null;

function flushConsoleBatch(): void {
  if (consoleBatchBuffer.length === 0) return;

  const entries = consoleBatchBuffer.splice(0);
  window.postMessage(
    {
      type: 'CONSOLE_ENTRIES_BATCH',
      payload: { entries },
    },
    '*',
  );
}

function scheduleConsoleBatchFlush(): void {
  if (consoleBatchTimer !== null) return;
  consoleBatchTimer = setTimeout(() => {
    consoleBatchTimer = null;
    flushConsoleBatch();
  }, CONSOLE_BATCH_INTERVAL);
}

function interceptConsole(): void {
  const levels: Array<'log' | 'warn' | 'error' | 'info'> = ['log', 'warn', 'error', 'info'];

  for (const level of levels) {
    const original = console[level];
    if (typeof original !== 'function') continue;

    console[level] = function (...args: unknown[]) {
      // Call original console method first
      original.apply(console, args);

      // Serialize arguments
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');

      // Extract source from Error stack if available
      let source: string | null = null;
      try {
        const stack = new Error().stack;
        if (stack) {
          const lines = stack.split('\n');
          // Skip "Error" line and the console[level] wrapper line
          const callerLine = lines[2]?.trim() ?? null;
          if (callerLine) {
            source = callerLine.replace(/^at\s+/, '');
          }
        }
      } catch {
        // Ignore stack trace errors
      }

      const entry: ConsoleEntryData = {
        timestamp: Date.now(),
        level,
        message: message.slice(0, 2000), // Truncate very long messages
        source,
      };

      consoleBatchBuffer.push(entry);

      // Flush immediately if batch is full
      if (consoleBatchBuffer.length >= CONSOLE_BATCH_MAX) {
        if (consoleBatchTimer !== null) {
          clearTimeout(consoleBatchTimer);
          consoleBatchTimer = null;
        }
        flushConsoleBatch();
      } else {
        scheduleConsoleBatchFlush();
      }
    };
  }
}

// ============================================================
// Fetch Interception
// ============================================================

const BODY_MAX_SIZE = 10240; // 10 KB default truncation

function interceptFetch(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const timestamp = Date.now();

    // Capture request body
    let requestBody: string | null = null;
    if (init?.body) {
      try {
        if (typeof init.body === 'string') {
          requestBody = init.body.slice(0, BODY_MAX_SIZE);
        } else if (init.body instanceof URLSearchParams) {
          requestBody = init.body.toString().slice(0, BODY_MAX_SIZE);
        }
        // Skip FormData, Blob, ArrayBuffer — too complex/large to serialize
      } catch {
        // Ignore serialization errors
      }
    }

    try {
      const response = await originalFetch.call(window, input, init);

      // Clone response to read body without consuming the original
      let responseBody: string | null = null;
      try {
        const contentType = response.headers.get('content-type') ?? '';
        // Only capture text-based responses
        if (
          contentType.includes('json') ||
          contentType.includes('text') ||
          contentType.includes('xml') ||
          contentType.includes('javascript')
        ) {
          const clone = response.clone();
          const text = await clone.text();
          responseBody = text.slice(0, BODY_MAX_SIZE);
        }
      } catch {
        // Body may already be consumed or unreadable
      }

      window.postMessage(
        {
          type: 'NETWORK_BODY_CAPTURED',
          payload: {
            url,
            method: method.toUpperCase(),
            timestamp,
            requestBody,
            responseBody,
          },
        },
        '*',
      );

      return response;
    } catch (error) {
      // Still report the failed request
      window.postMessage(
        {
          type: 'NETWORK_BODY_CAPTURED',
          payload: {
            url,
            method: method.toUpperCase(),
            timestamp,
            requestBody,
            responseBody: null,
          },
        },
        '*',
      );
      throw error;
    }
  };
}

// ============================================================
// XMLHttpRequest Interception
// ============================================================

function interceptXHR(): void {
  const OriginalXHR = window.XMLHttpRequest;
  const originalOpen = OriginalXHR.prototype.open;
  const originalSend = OriginalXHR.prototype.send;

  OriginalXHR.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null,
  ) {
    // Store method and URL on the instance for later use
    (this as XMLHttpRequest & { _captureMethod?: string; _captureUrl?: string })._captureMethod =
      method.toUpperCase();
    (this as XMLHttpRequest & { _captureUrl?: string })._captureUrl =
      typeof url === 'string' ? url : url.href;

    return originalOpen.call(
      this,
      method,
      url,
      async !== undefined ? async : true,
      username ?? null,
      password ?? null,
    );
  };

  OriginalXHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as XMLHttpRequest & {
      _captureMethod?: string;
      _captureUrl?: string;
    };

    const method = xhr._captureMethod ?? 'GET';
    const url = xhr._captureUrl ?? '';
    const timestamp = Date.now();

    // Capture request body
    let requestBody: string | null = null;
    if (body) {
      try {
        if (typeof body === 'string') {
          requestBody = body.slice(0, BODY_MAX_SIZE);
        } else if (body instanceof URLSearchParams) {
          requestBody = body.toString().slice(0, BODY_MAX_SIZE);
        }
        // Skip FormData, Blob, Document, ArrayBuffer
      } catch {
        // Ignore serialization errors
      }
    }

    // Listen for load event to capture response
    xhr.addEventListener('load', function () {
      let responseBody: string | null = null;
      try {
        const contentType = xhr.getResponseHeader('content-type') ?? '';
        if (
          contentType.includes('json') ||
          contentType.includes('text') ||
          contentType.includes('xml') ||
          contentType.includes('javascript')
        ) {
          if (xhr.responseType === '' || xhr.responseType === 'text') {
            responseBody = (xhr.responseText ?? '').slice(0, BODY_MAX_SIZE);
          }
        }
      } catch {
        // Response may not be accessible
      }

      window.postMessage(
        {
          type: 'NETWORK_BODY_CAPTURED',
          payload: {
            url,
            method,
            timestamp,
            requestBody,
            responseBody,
          },
        },
        '*',
      );
    });

    // Listen for error event
    xhr.addEventListener('error', function () {
      window.postMessage(
        {
          type: 'NETWORK_BODY_CAPTURED',
          payload: {
            url,
            method,
            timestamp,
            requestBody,
            responseBody: null,
          },
        },
        '*',
      );
    });

    return originalSend.call(this, body);
  };
}
