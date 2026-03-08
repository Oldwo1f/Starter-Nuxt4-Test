/**
 * API client for the Nuna NestJS backend.
 * Wraps fetch with auth, base URL, and 401 handling.
 */

import {
  ensureAuthenticated,
  getAuthHeaders,
  reauthenticate,
} from './auth.js';

const API_URL = process.env.NUNA_API_URL || 'http://localhost:3001';

function getUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, API_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '') {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    params?: Record<string, string | number | undefined>;
    body?: unknown;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  }
): Promise<T> {
  const url = getUrl(path, options?.params);

  if (!options?.skipAuth) {
    await ensureAuthenticated();
  }

  const headers: Record<string, string> = { ...(options?.headers ?? {}) };
  if (!options?.skipAuth) {
    Object.assign(headers, getAuthHeaders());
  }
  if (options?.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = {
    method,
    headers,
  };
  if (options?.body !== undefined) {
    init.body =
      options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body);
  }

  let res = await fetch(url, init);

  if (res.status === 401 && !options?.skipAuth) {
    await reauthenticate();
    const retryHeaders = { ...headers, ...getAuthHeaders() };
    res = await fetch(url, { ...init, headers: retryHeaders });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    request<T>('GET', path, { params }),

  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>('POST', path, { body, headers }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),

  delete: <T>(path: string) => request<T>('DELETE', path),
};
