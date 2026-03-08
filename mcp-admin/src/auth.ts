/**
 * Authentication module for the MCP server.
 * Logs in to the Nuna API and caches the JWT for subsequent requests.
 */

const API_URL = process.env.NUNA_API_URL || 'http://localhost:3001';
const ADMIN_EMAIL = process.env.NUNA_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.NUNA_ADMIN_PASSWORD;

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: Record<string, unknown>;
}

/**
 * Performs login and caches the tokens.
 */
export async function login(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      'NUNA_ADMIN_EMAIL and NUNA_ADMIN_PASSWORD must be set in the environment. ' +
        'Check your MCP server configuration.'
    );
  }

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Login failed (${res.status}): ${text || res.statusText}. ` +
        'Verify NUNA_API_URL, NUNA_ADMIN_EMAIL, and NUNA_ADMIN_PASSWORD.'
    );
  }

  const data = (await res.json()) as LoginResponse;
  cachedAccessToken = data.access_token;
  cachedRefreshToken = data.refresh_token ?? null;
}

/**
 * Refreshes the access token using the refresh token.
 */
async function refreshAccessToken(): Promise<void> {
  if (!cachedRefreshToken) {
    cachedAccessToken = null;
    throw new Error('No refresh token available. Re-login required.');
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: cachedRefreshToken }),
  });

  if (!res.ok) {
    cachedAccessToken = null;
    cachedRefreshToken = null;
    throw new Error(`Token refresh failed (${res.status}). Re-login required.`);
  }

  const data = (await res.json()) as LoginResponse;
  cachedAccessToken = data.access_token;
  cachedRefreshToken = data.refresh_token ?? cachedRefreshToken;
}

/**
 * Ensures we have a valid access token. Logs in or refreshes if needed.
 */
export async function ensureAuthenticated(): Promise<void> {
  if (cachedAccessToken) {
    return;
  }
  await login();
}

/**
 * Returns headers with Bearer token for API requests.
 * Call ensureAuthenticated() before using.
 */
export function getAuthHeaders(): Record<string, string> {
  if (!cachedAccessToken) {
    throw new Error('Not authenticated. Call ensureAuthenticated() first.');
  }
  return {
    Authorization: `Bearer ${cachedAccessToken}`,
  };
}

/**
 * Clears cached tokens (e.g. after 401 to force re-login).
 */
export function clearTokens(): void {
  cachedAccessToken = null;
  cachedRefreshToken = null;
}

/**
 * Attempts to refresh the token. If that fails, performs a fresh login.
 */
export async function reauthenticate(): Promise<void> {
  clearTokens();
  try {
    await refreshAccessToken();
  } catch {
    await login();
  }
}
