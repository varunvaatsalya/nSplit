import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiFetch, errorMessage, setToken } from '@/src/api/client';
import type { User } from '@/src/api/types';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  pending: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    const res = await apiFetch<{ user: User }>('/api/auth/me');
    if (res.ok && res.data?.user) {
      setUser(res.data.user);
      return;
    }
    if (res.status === 401) {
      await setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setPending(true);
    try {
      const res = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok || !res.data?.token) {
        throw new Error(errorMessage(res.error, 'Login failed'));
      }
      await setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setPending(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setPending(true);
    try {
      const res = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok || !res.data?.token) {
        throw new Error(errorMessage(res.error, 'Signup failed'));
      }
      await setToken(res.data.token);
      setUser(res.data.user);
    } finally {
      setPending(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setPending(true);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      await setToken(null);
      setUser(null);
    } finally {
      setPending(false);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, pending, login, register, logout, refresh }),
    [user, loading, pending, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
