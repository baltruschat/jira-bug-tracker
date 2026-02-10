import type { JiraConnection, JiraTokenResponse, JiraAccessibleResource } from './types';
import { getLocal, setLocal } from '../storage/chrome-storage';
import { storeTokens, removeTokens, fetchAccessibleResources } from '../services/auth';
import { generateId } from '../utils/crypto';

export async function getConnections(): Promise<JiraConnection[]> {
  return (await getLocal('connections')) ?? [];
}

export async function getConnectionById(id: string): Promise<JiraConnection | undefined> {
  const connections = await getConnections();
  return connections.find((c) => c.id === id);
}

export async function addConnection(
  tokenData: JiraTokenResponse,
  resource: JiraAccessibleResource,
  userDisplayName: string,
  userAccountId: string,
  userAvatarUrl: string,
): Promise<JiraConnection> {
  const connection: JiraConnection = {
    id: generateId(),
    cloudId: resource.id,
    siteUrl: resource.url,
    siteName: resource.name,
    displayName: userDisplayName,
    accountId: userAccountId,
    avatarUrl: userAvatarUrl,
    createdAt: Date.now(),
  };

  // Store tokens in session storage
  await storeTokens(connection.id, tokenData);

  // Store connection metadata in local storage
  const connections = await getConnections();
  connections.push(connection);
  await setLocal('connections', connections);

  return connection;
}

export async function removeConnection(id: string): Promise<void> {
  // Remove tokens
  await removeTokens(id);

  // Remove from connections list
  const connections = await getConnections();
  const filtered = connections.filter((c) => c.id !== id);
  await setLocal('connections', filtered);
}

export async function completeOAuthFlow(
  tokenData: JiraTokenResponse,
): Promise<JiraConnection[]> {
  const resources = await fetchAccessibleResources(tokenData.access_token);
  const newConnections: JiraConnection[] = [];

  // Fetch user info from Atlassian Identity API (uses read:me scope)
  let userInfo = { displayName: 'User', accountId: '', avatarUrl: '' };
  try {
    userInfo = await fetchCurrentUser(tokenData.access_token);
  } catch (err) {
    console.warn('[OAuth] Could not fetch user info, using defaults:', err);
  }

  for (const resource of resources) {
    const existing = await getConnections();
    const alreadyConnected = existing.some((c) => c.cloudId === resource.id);
    if (alreadyConnected) continue;

    const connection = await addConnection(
      tokenData,
      resource,
      userInfo.displayName,
      userInfo.accountId,
      userInfo.avatarUrl,
    );
    newConnections.push(connection);
  }

  return newConnections;
}

async function fetchCurrentUser(
  accessToken: string,
): Promise<{ displayName: string; accountId: string; avatarUrl: string }> {
  // Use Atlassian Identity API (/me) which works with the read:me scope
  // instead of the Jira-specific /myself endpoint that needs cloudId
  const response = await fetch(
    'https://api.atlassian.com/me',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch current user (${response.status})`);
  }

  const data = await response.json();
  return {
    displayName: data.name ?? 'User',
    accountId: data.account_id ?? '',
    avatarUrl: data.picture ?? '',
  };
}
