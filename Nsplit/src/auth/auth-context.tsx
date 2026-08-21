import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { apiFetch, errorMessage, getToken, setToken } from '@/src/api/client';
import type { User } from '@/src/api/types';
import { getCachedUser, patchCachedUser, setCachedUser } from '@/src/db/session';
import { isOnline, subscribeOnline } from '@/src/lib/network';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  pending: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateLocalUser: (patch: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const applyUser = useCallback(async (next: User | null) => {
    setUser(next);
    await setCachedUser(next);
  }, []);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      await applyUser(null);
      return;
    }

    const cached = await getCachedUser();
    if (cached) setUser(cached);

    if (!(await isOnline())) return;

    const res = await apiFetch<{ user: User }>('/api/auth/me');
    if (res.ok && res.data?.user) {
      await applyUser(res.data.user);
      return;
    }
    // Keep the cached session when the network is down or the API is unreachable.
    if (res.status === 401) {
      await setToken(null);
      await applyUser(null);
    }
  }, [applyUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const cached = await getCachedUser();
          if (!cancelled && cached) setUser(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
      refresh().catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const onApp = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh().catch(() => {});
    });
    const stop = subscribeOnline((online) => {
      if (online) refresh().catch(() => {});
    });
    return () => {
      onApp.remove();
      stop();
    };
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setPending(true);
      try {
        if (!(await isOnline())) {
          throw new Error('You’re offline. Connect to log in.');
        }
        const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok || !res.data?.token) {
          throw new Error(errorMessage(res.error, 'Login failed'));
        }
        await setToken(res.data.token);
        await applyUser(res.data.user);
      } finally {
        setPending(false);
      }
    },
    [applyUser]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      setPending(true);
      try {
        if (!(await isOnline())) {
          throw new Error('You’re offline. Connect to create an account.');
        }
        const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok || !res.data?.token) {
          throw new Error(errorMessage(res.error, 'Signup failed'));
        }
        await setToken(res.data.token);
        await applyUser(res.data.user);
      } finally {
        setPending(false);
      }
    },
    [applyUser]
  );

  const logout = useCallback(async () => {
    setPending(true);
    try {
      if (await isOnline()) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
      await setToken(null);
      await applyUser(null);
    } finally {
      setPending(false);
    }
  }, [applyUser]);

  const updateLocalUser = useCallback(async (patch: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) => {
    const next = await patchCachedUser(patch);
    if (next) setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      pending,
      login,
      register,
      logout,
      refresh,
      updateLocalUser,
    }),
    [user, loading, pending, login, register, logout, refresh, updateLocalUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
