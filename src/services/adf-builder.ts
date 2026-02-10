import type {
  ConsoleEntry,
  NetworkRequest,
  EnvironmentSnapshot,
} from '../models/types';
import { MAX_CONSOLE_ENTRIES, MAX_NETWORK_REQUESTS } from '../utils/constants';

// ADF Node types
interface AdfDoc {
  version: 1;
  type: 'doc';
  content: AdfNode[];
}

interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

export function buildFullDescription(
  userDescription: string,
  environment: EnvironmentSnapshot | null,
  consoleEntries: ConsoleEntry[],
  networkRequests: NetworkRequest[],
): AdfDoc {
  const content: AdfNode[] = [];

  // User description
  if (userDescription) {
    content.push(heading('Description', 3));
    content.push(paragraph(userDescription));
  }

  // Environment table
  if (environment) {
    content.push(heading('Environment', 3));
    content.push(buildEnvironmentTable(environment));
  }

  // Console entries
  if (consoleEntries.length > 0) {
    const truncated = consoleEntries.length >= MAX_CONSOLE_ENTRIES;
    const label = truncated
      ? `Console Output (${consoleEntries.length} entries — buffer limit reached, earlier entries may have been dropped)`
      : `Console Output (${consoleEntries.length} entries)`;
    content.push(heading(label, 3));
    content.push(buildConsoleBlock(consoleEntries));
  }

  // Network requests
  if (networkRequests.length > 0) {
    const truncated = networkRequests.length >= MAX_NETWORK_REQUESTS;
    const label = truncated
      ? `Network Requests (${networkRequests.length} — buffer limit reached)`
      : `Network Requests (${networkRequests.length})`;
    content.push(heading(label, 3));
    content.push(buildNetworkBlock(networkRequests));
  }

  return { version: 1, type: 'doc', content };
}

export function buildEnvironmentTable(env: EnvironmentSnapshot): AdfNode {
  const rows: [string, string][] = [
    ['Browser', `${env.browserName} ${env.browserVersion}`],
    ['Operating System', env.os],
    ['User Agent', env.userAgent],
    ['Locale', env.locale],
    ['Screen Resolution', `${env.screenWidth}x${env.screenHeight}`],
    ['Device Pixel Ratio', String(env.devicePixelRatio)],
    ['Viewport Size', `${env.viewportWidth}x${env.viewportHeight}`],
  ];

  return {
    type: 'table',
    attrs: { isNumberColumnEnabled: false, layout: 'default' },
    content: [
      tableRow([tableHeader('Property'), tableHeader('Value')]),
      ...rows.map(([property, value]) =>
        tableRow([tableCell(property), tableCell(value)]),
      ),
    ],
  };
}

export function buildConsoleBlock(entries: ConsoleEntry[]): AdfNode {
  const lines = entries.map((entry) => {
    const time = new Date(entry.timestamp).toISOString().slice(11, 23);
    const level = entry.level.toUpperCase().padEnd(5);
    const source = entry.source ? ` (${entry.source})` : '';
    return `[${time}] ${level} ${entry.message}${source}`;
  });

  return codeBlock(lines.join('\n'), 'text');
}

export function buildNetworkBlock(requests: NetworkRequest[]): AdfNode {
  const formatted = requests.map((req) => {
    const status = req.statusCode ?? 'pending';
    const duration = req.duration != null ? `${req.duration}ms` : '-';
    const size = req.responseSize != null ? formatBytes(req.responseSize) : '-';
    const error = req.error ? ` ERROR: ${req.error}` : '';

    let line = `${req.method} ${req.url} → ${status} (${duration}, ${size})${error}`;

    if (req.requestBody) {
      line += `\n  Request Body: ${req.requestBody}`;
    }
    if (req.responseBody) {
      line += `\n  Response Body: ${req.responseBody}`;
    }

    return line;
  });

  return codeBlock(formatted.join('\n\n'), 'text');
}

// ADF helper functions

function heading(text: string, level: number): AdfNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

function paragraph(text: string): AdfNode {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

function codeBlock(text: string, language: string): AdfNode {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text', text }],
  };
}

function tableRow(cells: AdfNode[]): AdfNode {
  return { type: 'tableRow', content: cells };
}

function tableHeader(text: string): AdfNode {
  return {
    type: 'tableHeader',
    content: [paragraph(text)],
  };
}

function tableCell(text: string): AdfNode {
  return {
    type: 'tableCell',
    content: [paragraph(text)],
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
