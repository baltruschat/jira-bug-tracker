import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  alias: {
    '@': 'src',
  },
  manifest: {
    name: 'Jira Bug Tracker',
    description: 'Capture bugs and create Jira issues with diagnostic data',
    permissions: [
      'identity',
      'storage',
      'activeTab',
      'tabs',
      'webRequest',
      'scripting',
    ],
    host_permissions: [
      'https://auth.atlassian.com/*',
      'https://api.atlassian.com/*',
      '<all_urls>',
    ],
    commands: {
      'trigger-capture': {
        suggested_key: {
          default: 'Alt+Shift+B',
          mac: 'Alt+Shift+B',
        },
        description: 'Capture bug report',
      },
    },
  },
  runner: {
    startUrls: ['https://example.com'],
  },
});
