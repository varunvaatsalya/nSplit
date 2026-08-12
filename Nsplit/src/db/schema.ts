/**
 * Local SQLite schema for offline-first mobile.
 * Uses expo-sqlite when installed; this module defines the contract.
 */

export const LOCAL_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users_cache (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT,
  version INTEGER DEFAULT 1,
  json TEXT,
  updated_at TEXT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT,
  display_name TEXT,
  json TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  title TEXT,
  amount_minor INTEGER,
  currency TEXT,
  version INTEGER DEFAULT 1,
  client_mutation_id TEXT,
  json TEXT,
  sync_status TEXT DEFAULT 'synced',
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  title TEXT,
  amount_minor INTEGER,
  currency TEXT,
  version INTEGER DEFAULT 1,
  client_mutation_id TEXT,
  json TEXT,
  sync_status TEXT DEFAULT 'synced',
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  from_member_id TEXT,
  to_member_id TEXT,
  amount_minor INTEGER,
  currency TEXT,
  version INTEGER DEFAULT 1,
  client_mutation_id TEXT,
  json TEXT,
  sync_status TEXT DEFAULT 'synced',
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  json TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  mutation_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  entity TEXT NOT NULL,
  payload TEXT NOT NULL,
  client_timestamp TEXT NOT NULL,
  base_version INTEGER,
  retries INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  last_error TEXT,
  next_attempt_at TEXT
);

CREATE TABLE IF NOT EXISTS conflicts (
  id TEXT PRIMARY KEY NOT NULL,
  mutation_id TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  local_json TEXT,
  server_json TEXT,
  reason TEXT,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, next_attempt_at);
`;
