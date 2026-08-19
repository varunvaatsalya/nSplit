import * as SQLite from 'expo-sqlite';

import { LOCAL_SCHEMA_SQL, RESET_LEGACY_SQL, SCHEMA_VERSION } from './schema';

export type SqlExecutor = SQLite.SQLiteDatabase;

let dbPromise: Promise<SqlExecutor> | null = null;

async function readSchemaVersion(database: SqlExecutor) {
  try {
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM meta WHERE key = 'schema_version'`
    );
    return Number(row?.value || 0);
  } catch {
    return 0;
  }
}

async function migrate(database: SqlExecutor) {
  const version = await readSchemaVersion(database);
  if (version < SCHEMA_VERSION) {
    await database.execAsync(RESET_LEGACY_SQL);
  }
  await database.execAsync(LOCAL_SCHEMA_SQL);
  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    ['schema_version', String(SCHEMA_VERSION)]
  );
}

export async function getDb(): Promise<SqlExecutor> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('nsplit.db');
      await migrate(database);
      return database;
    })();
  }
  return dbPromise;
}

export async function initDb() {
  return getDb();
}
