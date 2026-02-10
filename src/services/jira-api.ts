import type {
  JiraProject,
  JiraIssueType,
  JiraUser,
  JiraCreateIssueResponse,
  JiraAttachmentResponse,
} from '../models/types';
import { getValidToken } from './auth';
import { getConnectionById } from '../models/connection';
import { JIRA_API_BASE } from '../utils/constants';

async function authenticatedFetch(
  connectionId: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const connection = await getConnectionById(connectionId);
  if (!connection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }

  const token = await getValidToken(connectionId);
  const baseUrl = `${JIRA_API_BASE}/${connection.cloudId}/rest/api/3`;

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Authentication failed — please reconnect');
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') ?? '60';
    throw new Error(`Rate limited — retry after ${retryAfter} seconds`);
  }

  return response;
}

export async function createIssue(
  connectionId: string,
  projectKey: string,
  issueTypeId: string,
  summary: string,
  description: object,
): Promise<JiraCreateIssueResponse> {
  const response = await authenticatedFetch(connectionId, '/issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        issuetype: { id: issueTypeId },
        summary,
        description,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create issue (${response.status}): ${body}`);
  }

  return response.json();
}

export async function uploadAttachment(
  connectionId: string,
  issueKey: string,
  file: Blob,
  filename: string = 'screenshot.png',
): Promise<JiraAttachmentResponse[]> {
  const formData = new FormData();
  formData.append('file', file, filename);

  const connection = await getConnectionById(connectionId);
  if (!connection) throw new Error(`Connection not found: ${connectionId}`);

  const token = await getValidToken(connectionId);
  const baseUrl = `${JIRA_API_BASE}/${connection.cloudId}/rest/api/3`;

  const response = await fetch(`${baseUrl}/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Atlassian-Token': 'no-check',
    },
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to upload attachment (${response.status}): ${body}`);
  }

  return response.json();
}

export async function listProjects(
  connectionId: string,
  query: string = '',
  startAt: number = 0,
  maxResults: number = 50,
): Promise<{ values: JiraProject[]; isLast: boolean; total: number }> {
  const params = new URLSearchParams({
    startAt: String(startAt),
    maxResults: String(maxResults),
  });
  if (query) params.set('query', query);

  const response = await authenticatedFetch(
    connectionId,
    `/project/search?${params.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to list projects (${response.status})`);
  }

  return response.json();
}

export async function listIssueTypes(
  connectionId: string,
  projectKey: string,
): Promise<{ values: JiraIssueType[]; isLast: boolean }> {
  const response = await authenticatedFetch(
    connectionId,
    `/issue/createmeta/${projectKey}/issuetypes`,
  );

  if (!response.ok) {
    throw new Error(`Failed to list issue types (${response.status})`);
  }

  const data: { values: JiraIssueType[]; isLast: boolean } = await response.json();

  // Filter out subtasks
  data.values = data.values.filter((t) => !t.subtask);

  return data;
}

export async function getCurrentUser(
  connectionId: string,
): Promise<JiraUser> {
  const response = await authenticatedFetch(connectionId, '/myself');

  if (!response.ok) {
    throw new Error(`Failed to get current user (${response.status})`);
  }

  return response.json();
}
