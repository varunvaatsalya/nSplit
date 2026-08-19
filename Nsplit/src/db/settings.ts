import { getDb } from './client';

const NAME_KEY = 'identity_name';
const MATCH_KEY = 'identity_match_by_name';

export type IdentitySettings = {
  name: string;
  matchByName: boolean;
};

export async function getIdentitySettings(): Promise<IdentitySettings> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM meta WHERE key IN (?, ?)`,
    [NAME_KEY, MATCH_KEY]
  );
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    name: String(map[NAME_KEY] || '').trim(),
    matchByName: map[MATCH_KEY] !== '0',
  };
}

export async function setIdentityName(name: string) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    NAME_KEY,
    name.trim(),
  ]);
}

export async function setIdentityMatchByName(enabled: boolean) {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    MATCH_KEY,
    enabled ? '1' : '0',
  ]);
}
