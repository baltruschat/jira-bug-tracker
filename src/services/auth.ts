import type {
  JiraTokenResponse,
  JiraAccessibleResource,
  JiraConnectionTokens,
} from '../models/types';
// Tokens must use local storage (not session) to persist across browser restarts
// and service worker termination in MV3.
import {
  OAUTH_AUTHORIZE_URL,
  OAUTH_TOKEN_URL,
  ACCESSIBLE_RESOURCES_URL,
  OAUTH_SCOPES,
  TOKEN_EXPIRY_BUFFER_MS,
} from '../utils/constants';
import { generateState, validateState } from '../utils/crypto';

const CLIENT_ID = import.meta.env.VITE_ATLASSIAN_CLIENT_ID ?? '';
const CLIENT_SECRET = import.meta.env.VITE_ATLASSIAN_CLIENT_SECRET ?? '';

let pendingState: string | null = null;

function getRedirectUri(): string {
  return `https://${chrome.runtime.id}.chromiumapp.org/callback`;
}

export function buildAuthorizationUrl(): string {
  pendingState = generateState();

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: CLIENT_ID,
    scope: OAUTH_SCOPES.join(' '),
    redirect_uri: getRedirectUri(),
    state: pendingState,
    response_type: 'code',
    prompt: 'consent',
  });

  return `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export async function launchOAuthFlow(): Promise<{ code: string }> {
  const authUrl = buildAuthorizationUrl();

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error('OAuth flow was cancelled or returned no URL');
  }

  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`OAuth error: ${error}`);
  }

  if (!code) {
    throw new Error('No authorization code received');
  }

  if (!state || !validateState(pendingState ?? '', state)) {
    throw new Error('Invalid state parameter — possible CSRF attack');
  }

  pendingState = null;
  return { code };
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<JiraTokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${body}`);
  }

  return response.json();
}

export async function refreshAccessToken(
  connectionId: string,
  refreshToken: string,
): Promise<JiraTokenResponse> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${body}`);
  }

  const tokenData: JiraTokenResponse = await response.json();

  // Store the new rotating refresh token
  await storeTokens(connectionId, tokenData);

  return tokenData;
}

export async function fetchAccessibleResources(
  accessToken: string,
): Promise<JiraAccessibleResource[]> {
  const response = await fetch(ACCESSIBLE_RESOURCES_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch accessible resources (${response.status})`);
  }

  return response.json();
}

export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

export async function getValidToken(
  connectionId: string,
): Promise<string> {
  const tokens = await getTokensFromStorage(connectionId);

  if (!tokens) {
    throw new Error('No tokens found for this connection — please reconnect');
  }

  if (!isTokenExpired(tokens.tokenExpiresAt)) {
    return tokens.accessToken;
  }

  // Token expired — refresh it
  const newTokenData = await refreshAccessToken(connectionId, tokens.refreshToken);
  return newTokenData.access_token;
}

export async function storeTokens(
  connectionId: string,
  tokenData: JiraTokenResponse,
): Promise<void> {
  const tokens: JiraConnectionTokens = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenExpiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  const key = `tokens:${connectionId}`;
  await chrome.storage.local.set({ [key]: tokens });
}

export async function removeTokens(connectionId: string): Promise<void> {
  await chrome.storage.local.remove(`tokens:${connectionId}`);
}

async function getTokensFromStorage(
  connectionId: string,
): Promise<JiraConnectionTokens | undefined> {
  const key = `tokens:${connectionId}`;
  const result = await chrome.storage.local.get(key);
  return result[key] as JiraConnectionTokens | undefined;
}
