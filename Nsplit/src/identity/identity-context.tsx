import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/src/auth/auth-context';
import {
  getIdentitySettings,
  setIdentityMatchByName as persistMatch,
  setIdentityName as persistName,
} from '@/src/db/settings';

type IdentityContextValue = {
  ready: boolean;
  name: string;
  matchByName: boolean;
  setName: (name: string) => Promise<void>;
  setMatchByName: (enabled: boolean) => Promise<void>;
};

const IdentityContext = createContext<IdentityContextValue | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { user, updateLocalUser } = useAuth();
  const [ready, setReady] = useState(false);
  const [name, setNameState] = useState('');
  const [matchByName, setMatchState] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getIdentitySettings();
        if (cancelled) return;
        const nextName = stored.name || user?.name?.trim() || '';
        setNameState(nextName);
        setMatchState(stored.matchByName);
        if (!stored.name && nextName) await persistName(nextName);
        if (user && nextName && nextName !== user.name) {
          await updateLocalUser({ name: nextName });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, updateLocalUser]);

  const setName = useCallback(async (next: string) => {
    const trimmed = next.trim();
    setNameState(trimmed);
    await persistName(trimmed);
    await updateLocalUser({ name: trimmed });
  }, [updateLocalUser]);

  const setMatchByName = useCallback(async (enabled: boolean) => {
    setMatchState(enabled);
    await persistMatch(enabled);
  }, []);

  const value = useMemo(
    () => ({ ready, name, matchByName, setName, setMatchByName }),
    [ready, name, matchByName, setName, setMatchByName]
  );

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export function useIdentity() {
  const ctx = useContext(IdentityContext);
  if (!ctx) throw new Error('useIdentity must be used within IdentityProvider');
  return ctx;
}
