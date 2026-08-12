/**
 * Thin API client for Expo → Next.js backend.
 * Set EXPO_PUBLIC_API_URL to your web origin (e.g. http://localhost:3000).
 */

const TOKEN_KEY = 'nsplit_session_token';

async function storageGet(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storageSet(key: string, value: string | null) {
  try {
    const SecureStore = await import('expo-secure-store');
    if (!value) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // SecureStore unavailable in this environment
  }
}

export function getApiBase() {
  return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
}

export async function getToken() {
  return storageGet(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  await storageSet(TOKEN_KEY, token);
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: unknown }> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });
  const json = await res.json().catch(() => null);
  return {
    ok: res.ok,
    status: res.status,
    data: json?.data ?? null,
    error: json?.error ?? null,
  };
}

export async function postSync(body: {
  deviceId?: string;
  mutations: unknown[];
}) {
  const token = await getToken();
  const res = await fetch(`${getApiBase()}/api/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
