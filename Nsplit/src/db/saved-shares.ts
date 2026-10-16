import type { SavedShare } from '@/src/api/shares';

import { getDb } from './client';

const CACHE_KEY = 'saved_shares_cache';

/**
 * Last known list of groups added by link, so home can show them offline.
 * The server list is the source of truth; this is only a display cache.
 */
export async function getCachedSavedShares(): Promise<SavedShare[]> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [CACHE_KEY]);
  try {
    const parsed = JSON.parse(row?.value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedSavedShares(shares: SavedShare[] | null) {
  const db = await getDb();
  if (!shares) await db.runAsync(`DELETE FROM meta WHERE key = ?`, [CACHE_KEY]);
  else await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [CACHE_KEY, JSON.stringify(shares)]);
}
