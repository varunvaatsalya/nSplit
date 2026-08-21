import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isOnline, subscribeOnline } from '@/src/lib/network';

type OfflineContextValue = {
  online: boolean;
  ready: boolean;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isOnline()
      .then((value) => {
        if (!cancelled) setOnline(value);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    const stop = subscribeOnline((value) => {
      if (!cancelled) setOnline(value);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  const value = useMemo(() => ({ online, ready }), [online, ready]);
  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}

export function useOfflineOptional() {
  return useContext(OfflineContext);
}
