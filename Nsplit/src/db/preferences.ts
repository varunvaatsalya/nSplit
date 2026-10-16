import { getDb } from './client';

const OFFLINE_NOTICE_KEY = 'offline_notice_dismissed';

/** Whether the user closed the home offline notice. Once closed, it stays hidden. */
export async function isOfflineNoticeDismissed() {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [OFFLINE_NOTICE_KEY]);
  return row?.value === '1';
}

export async function dismissOfflineNotice() {
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [OFFLINE_NOTICE_KEY, '1']);
}
