import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { GroupSummary } from '@/src/api/types';
import { initDb } from '@/src/db/client';
import {
  createGroup as insertGroup,
  listGroups,
  type CreateGroupInput,
} from '@/src/db/groups';

type GroupsContextValue = {
  ready: boolean;
  groups: GroupSummary[];
  reload: () => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<void>;
};

const GroupsContext = createContext<GroupsContextValue | null>(null);

export function GroupsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  const reload = useCallback(async () => {
    await initDb();
    const rows = await listGroups();
    setGroups(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      await insertGroup(input);
      await reload();
    },
    [reload]
  );

  const value = useMemo(
    () => ({ ready, groups, reload, createGroup }),
    [ready, groups, reload, createGroup]
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error('useGroups must be used within GroupsProvider');
  return ctx;
}
