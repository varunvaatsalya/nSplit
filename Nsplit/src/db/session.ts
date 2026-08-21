import type { User } from '@/src/api/types';

import { getDb } from './client';

const USER_KEY = 'session_user';

function parseUser(raw: string | null | undefined): User | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as User;
    if (!parsed?._id || !parsed.email) return null;
    return {
      _id: String(parsed._id),
      name: String(parsed.name || '').trim() || 'You',
      email: String(parsed.email),
      avatar: parsed.avatar || null,
    };
  } catch {
    return null;
  }
}

export async function getCachedUser(): Promise<User | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ? LIMIT 1`,
    [USER_KEY]
  );
  return parseUser(row?.value);
}

export async function setCachedUser(user: User | null) {
  const db = await getDb();
  if (!user) {
    await db.runAsync(`DELETE FROM meta WHERE key = ?`, [USER_KEY]);
    return;
  }
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    USER_KEY,
    JSON.stringify({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || null,
    }),
  ]);
}

export async function patchCachedUser(patch: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) {
  const current = await getCachedUser();
  if (!current) return null;
  const next: User = {
    ...current,
    ...patch,
    name: patch.name != null ? String(patch.name).trim() || current.name : current.name,
  };
  await setCachedUser(next);
  return next;
}
