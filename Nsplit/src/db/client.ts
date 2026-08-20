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

async function tableHasColumn(database: SqlExecutor, table: string, column: string) {
  const rows = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

async function addColumnIfMissing(
  database: SqlExecutor,
  table: string,
  column: string,
  definition: string
) {
  if (await tableHasColumn(database, table, column)) return;
  await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

async function migrate(database: SqlExecutor) {
  const version = await readSchemaVersion(database);
  if (version === 0) {
    await database.execAsync(RESET_LEGACY_SQL);
  }
  await database.execAsync(LOCAL_SCHEMA_SQL);
  await addColumnIfMissing(database, 'groups', 'my_member_id', 'TEXT');
  await addColumnIfMissing(database, 'groups', 'settings_json', 'TEXT');
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
