import type { BrowserContext } from '@playwright/test';
import { MOCK_PROJECTS, MOCK_ISSUE_TYPES, MOCK_CONNECTION } from '../fixtures/mock-data';

export interface ApiMockOptions {
  createIssueError?: boolean;
  uploadAttachmentError?: boolean;
  projectsError?: number;
  issueTypesError?: number;
}

export async function setupApiMocks(
  context: BrowserContext,
  options: ApiMockOptions = {},
): Promise<void> {
  // Token exchange
  await context.route('**/auth.atlassian.com/oauth/token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token-fresh',
        refresh_token: 'mock-refresh-token-fresh',
        expires_in: 3600,
        scope: 'read:jira-work write:jira-work read:me offline_access',
      }),
    }),
  );

  // Accessible resources
  await context.route('**/api.atlassian.com/oauth/token/accessible-resources', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: MOCK_CONNECTION.cloudId,
          name: MOCK_CONNECTION.siteName,
          url: MOCK_CONNECTION.siteUrl,
          scopes: ['read:jira-work', 'write:jira-work'],
          avatarUrl: '',
        },
      ]),
    }),
  );

  // Current user
  await context.route('**/api.atlassian.com/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        account_id: MOCK_CONNECTION.accountId,
        name: MOCK_CONNECTION.displayName,
        email: 'test@example.com',
      }),
    }),
  );

  // Projects
  await context.route('**/rest/api/3/project/search*', (route) => {
    if (options.projectsError) {
      return route.fulfill({
        status: options.projectsError,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Project fetch failed' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ values: MOCK_PROJECTS, total: MOCK_PROJECTS.length }),
    });
  });

  // Issue types
  await context.route('**/rest/api/3/issue/createmeta/*/issuetypes', (route) => {
    if (options.issueTypesError) {
      return route.fulfill({
        status: options.issueTypesError,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Issue types fetch failed' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ values: MOCK_ISSUE_TYPES }),
    });
  });

  // Create issue
  await context.route('**/rest/api/3/issue', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    if (options.createIssueError) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Issue creation failed' }),
      });
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '10001',
        key: 'BUG-123',
        self: `https://testsite.atlassian.net/rest/api/3/issue/10001`,
      }),
    });
  });

  // Attachments
  await context.route('**/rest/api/3/issue/*/attachments', (route) => {
    if (options.uploadAttachmentError) {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Attachment upload failed' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'att-1',
          filename: 'screenshot.png',
          mimeType: 'image/png',
          size: 1024,
          content: 'https://testsite.atlassian.net/attachments/att-1',
          thumbnail: '',
        },
      ]),
    });
  });
}
