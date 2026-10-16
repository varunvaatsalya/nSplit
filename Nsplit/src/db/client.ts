import * as SQLite from 'expo-sqlite';

import { enqueueEverything } from '@/src/sync/outbox';

import { migrateIdsToObjectIds } from './migrate-ids';
import { LOCAL_SCHEMA_SQL, RESET_LEGACY_SQL, SCHEMA_VERSION } from './schema';

export type SqlExecutor = SQLite.SQLiteDatabase;

let dbPromise: Promise<SqlExecutor> | null = null;

async function readSchemaVersion(database: SqlExecutor) {
  // Version 0 triggers RESET_LEGACY_SQL, which drops every table. Only report 0 when
  // the meta table truly lacks a version; any read error must throw instead, or a
  // transient failure (e.g. a locked database) would wipe the user's only copy of their data.
  const meta = await database.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'meta'`
  );
  if (!meta) return 0;
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'schema_version'`
  );
  return Number(row?.value || 0);
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
  // 1 once the server is known to hold this group (pushed or pulled).
  await addColumnIfMissing(database, 'groups', 'synced', 'INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(database, 'group_members', 'upi_id', 'TEXT');
  await addColumnIfMissing(database, 'groups', 'description', 'TEXT');
  if (version > 0 && version < 5) {
    // Upgrading from a version without sync: give records server-compatible ids,
    // then queue everything so the first sync uploads it.
    await migrateIdsToObjectIds(database);
    await enqueueEverything(database);
  }
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

export async function runInTransaction<T>(
  db: SqlExecutor,
  action: () => Promise<T>
): Promise<T> {
  // Use manual transactions to prevent native crashes with expo-sqlite's withTransactionAsync on Android release builds.
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = await action();
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    try {
      await db.execAsync('ROLLBACK;');
    } catch (rollbackError) {
      console.error('Transaction rollback failed:', rollbackError);
    }
    throw error;
  }
}

