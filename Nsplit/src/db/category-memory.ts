import { normalizeTitle } from '@/src/lib/expense-icons';

import { getDb } from './client';

const MEMORY_KEY = 'category_memory';
const MAX_ENTRIES = 300;

/** Titles the user filed under a category by hand, keyed by normalized title. */
export async function getCategoryMemory(): Promise<Record<string, string>> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM meta WHERE key = ?`, [
    MEMORY_KEY,
  ]);
  try {
    const parsed = JSON.parse(row?.value || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Remember a manual title → category choice so the same title is filed the same way next time. */
export async function rememberCategory(title: string, categoryKey: string) {
  const norm = normalizeTitle(title);
  if (!norm) return;
  const memory = await getCategoryMemory();
  delete memory[norm];
  memory[norm] = categoryKey;
  // Keep the newest entries; object key order is insertion order.
  const entries = Object.entries(memory).slice(-MAX_ENTRIES);
  const db = await getDb();
  await db.runAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`, [
    MEMORY_KEY,
    JSON.stringify(Object.fromEntries(entries)),
  ]);
}
