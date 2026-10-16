/**
 * Thin API client for Expo → Next.js backend.
 * Set EXPO_PUBLIC_API_URL to your web origin (e.g. http://192.168.1.10:3000).
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { isOnline } from '@/src/lib/network';

import type { ApiError } from './types';

const TOKEN_KEY = 'nsplit_session_token';

function hostFromExpo(): string | null {
  const uri = Constants.expoConfig?.hostUri || Constants.linkingUri || '';
  const ip = String(uri).match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  if (ip) return ip[1];
  try {
    const hostname = new URL(uri.includes('://') ? uri : `http://${uri}`).hostname;
    if (
      hostname &&
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      hostname !== 'exp.host'
    ) {
      return hostname;
    }
  } catch {
    // ignore
  }
  return null;
}

const PRODUCTION_API = 'https://nsplit.vercel.app';
const LOOPBACK = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(?=[:/]|$)/i;

export function getApiBase() {
  const env = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  const devHost = hostFromExpo();
  if (env) {
    // On a phone, "localhost" is the phone itself. Point it at the computer that
    // is running Expo (same machine as the local web server), keeping the port.
    if (Platform.OS !== 'web' && devHost && LOOPBACK.test(env)) {
      return env.replace(LOOPBACK, `$1${devHost}`);
    }
    return env;
  }
  if (devHost) return `http://${devHost}:3000`;
  return PRODUCTION_API;
}

if (__DEV__) {
  console.log(`[nsplit] API server: ${getApiBase()}`);
}

async function storageGet(key: string): Promise<string | null> {
  try {
    const SecureStore = await import('expo-secure-store');
    const available = await SecureStore.isAvailableAsync();
    if (available) return await SecureStore.getItemAsync(key);
  } catch {
    // SecureStore unavailable
  }
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
  } catch {
    // ignore
  }
  return null;
}

async function storageSet(key: string, value: string | null) {
  try {
    const SecureStore = await import('expo-secure-store');
    const available = await SecureStore.isAvailableAsync();
    if (available) {
      if (!value) {
        await SecureStore.deleteItemAsync(key);
        return;
      }
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // SecureStore unavailable
  }
  try {
    if (typeof localStorage === 'undefined') return;
    if (!value) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export async function getToken() {
  return storageGet(TOKEN_KEY);
}

export async function setToken(token: string | null) {
  await storageSet(TOKEN_KEY, token);
}

export function errorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function networkError(message?: string): ApiError {
  return {
    message: message || 'You’re offline. Changes stay on this phone.',
    code: 'NETWORK',
  };
}

export async function apiFetch<T = unknown>(
  path: string,
  { timeoutMs = 15000, ...options }: RequestInit & { timeoutMs?: number } = {}
): Promise<{ ok: boolean; status: number; data: T | null; error: ApiError }> {
  if (!(await isOnline())) {
    return { ok: false, status: 0, data: null, error: networkError() };
  }

  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    return {
      ok: res.ok,
      status: res.status,
      data: json?.data ?? null,
      error: json?.error ?? null,
    };
  } catch {
    // Aborted = the server was reachable but slow (e.g. a cold start); otherwise
    // nothing answered at that address at all.
    const message = controller.signal.aborted
      ? 'The server took too long to answer. Try again in a moment.'
      : `Cannot reach the server at ${getApiBase()}. Check your connection and try again.`;
    return { ok: false, status: 0, data: null, error: networkError(message) };
  } finally {
    clearTimeout(timeout);
  }
}

