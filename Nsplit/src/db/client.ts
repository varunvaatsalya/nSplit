import { LOCAL_SCHEMA_SQL } from './schema';

type SqlExecutor = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
  getAllAsync: <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;
  getFirstAsync: <T = unknown>(sql: string, params?: unknown[]) => Promise<T | null>;
};

let dbPromise: Promise<SqlExecutor> | null = null;

/**
 * Opens (or returns) the local SQLite database.
 * Requires `expo-sqlite` — install during mobile offline phase setup.
 */
export async function getDb(): Promise<SqlExecutor> {
  if (!dbPromise) {
    dbPromise = (async () => {
      // Dynamic import keeps the module loadable before the dependency is installed.
      const SQLite = await import('expo-sqlite');
      const database = await SQLite.openDatabaseAsync('nsplit.db');
      await database.execAsync(LOCAL_SCHEMA_SQL);
      return database as unknown as SqlExecutor;
    })();
  }
  return dbPromise;
}
