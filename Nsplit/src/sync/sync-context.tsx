import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { backoffMs } from '@nsplit/shared/sync';

import { useAuth } from '@/src/auth/auth-context';
import { getDb } from '@/src/db/client';
import { useOffline } from '@/src/offline/offline-context';

import { claimLocalData, getLastSyncedAt, runSync, SyncHttpError, wipeLocalData } from './engine';
import { localChanges } from './events';
import { pendingCount } from './outbox';

export type SyncState = 'signed-out' | 'offline' | 'syncing' | 'synced' | 'pending' | 'error';

type SyncContextValue = {
  state: SyncState;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
  /** Some changes were refused by the server (e.g. no permission) and were not uploaded. */
  rejected: { count: number; error: string | null } | null;
  syncNow: () => Promise<void>;
  /** Try a last sync, then sign out and clear this device. Returns unsynced change count if it stopped. */
  signOut: (opts?: { force?: boolean }) => Promise<{ unsynced: number }>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const LOCAL_CHANGE_DEBOUNCE_MS = 1500;
const PERIODIC_MS = 2 * 60 * 1000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { online } = useOffline();
  const userId = user?._id ?? null;

  const [running, setRunning] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<SyncContextValue['rejected']>(null);

  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const failures = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimedFor = useRef<string | null>(null);
  // Latest syncNow for timers and listeners that outlive a render.
  const syncNowRef = useRef<() => Promise<void>>(async () => {});

  const refreshPending = useCallback(async () => {
    setPending(await pendingCount(await getDb()));
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!userId || !online) {
      await refreshPending();
      return;
    }
    if (inFlight.current) {
      // A change landed mid-sync: run once more afterwards.
      again.current = true;
      return inFlight.current;
    }

    const run = (async () => {
      setRunning(true);
      try {
        if (claimedFor.current !== userId) {
          await claimLocalData(userId);
          claimedFor.current = userId;
        }
        do {
          again.current = false;
          const outcome = await runSync(userId);
          setRejected(outcome.rejected ? { count: outcome.rejected, error: outcome.lastRejectedError } : null);
        } while (again.current);
        failures.current = 0;
        setError(null);
        setLastSyncedAt(await getLastSyncedAt());
      } catch (e) {
        failures.current += 1;
        setError(e instanceof Error ? e.message : 'Sync failed');
        // Session revoked: auth refresh will sign the user out; no point retrying.
        if (!(e instanceof SyncHttpError && e.status === 401)) {
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            syncNowRef.current().catch(() => {});
          }, backoffMs(failures.current - 1, { base: 2000, cap: 5 * 60 * 1000 }));
        }
      } finally {
        await refreshPending().catch(() => {});
        setRunning(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, [userId, online, refreshPending]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  // Sign-in, sign-out, back online.
  useEffect(() => {
    if (!userId) claimedFor.current = null;
    const timer = setTimeout(() => {
      syncNow().catch(() => {});
    }, 0);
    return () => clearTimeout(timer);
  }, [userId, online, syncNow]);

  // Local writes: push shortly after the user stops editing.
  useEffect(() => {
    return localChanges.subscribe(() => {
      refreshPending().catch(() => {});
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        syncNowRef.current().catch(() => {});
      }, LOCAL_CHANGE_DEBOUNCE_MS);
    });
  }, [refreshPending]);

  // Foreground + a slow heartbeat to pick up changes from other devices.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') syncNowRef.current().catch(() => {});
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') syncNowRef.current().catch(() => {});
    }, PERIODIC_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    []
  );

  const signOut = useCallback<SyncContextValue['signOut']>(
    async (opts) => {
      if (!opts?.force) {
        await syncNow().catch(() => {});
        const unsynced = await pendingCount(await getDb());
        if (unsynced > 0) return { unsynced };
      }
      await logout();
      await wipeLocalData();
      claimedFor.current = null;
      setRejected(null);
      setLastSyncedAt(null);
      await refreshPending();
      return { unsynced: 0 };
    },
    [logout, syncNow, refreshPending]
  );

  const state: SyncState = !userId
    ? 'signed-out'
    : running
      ? 'syncing'
      : !online
        ? 'offline'
        : error
          ? 'error'
          : pending > 0
            ? 'pending'
            : 'synced';

  const value = useMemo(
    () => ({ state, pending, lastSyncedAt, error, rejected, syncNow, signOut }),
    [state, pending, lastSyncedAt, error, rejected, syncNow, signOut]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
