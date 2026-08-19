export const SCHEMA_VERSION = 1;

export const LOCAL_SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS group_members (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  user_id TEXT,
  email TEXT,
  permission TEXT NOT NULL DEFAULT 'ADD',
  avatar_letters TEXT,
  avatar_bg TEXT,
  created_at TEXT NOT NULL,
  left_at TEXT,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL,
  title TEXT,
  amount_minor INTEGER,
  currency TEXT,
  icon TEXT,
  category_key TEXT,
  split_method TEXT,
  expense_date TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT,
  json TEXT,
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

CREATE INDEX IF NOT EXISTS idx_groups_updated ON groups(deleted_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_members_group ON group_members(group_id, left_at);
CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id, deleted_at, expense_date);
`;

export const RESET_LEGACY_SQL = `
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS conflicts;
DROP TABLE IF EXISTS activities;
DROP TABLE IF EXISTS incomes;
DROP TABLE IF EXISTS transfers;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS group_members;
DROP TABLE IF EXISTS groups;
DROP TABLE IF EXISTS users_cache;
DROP TABLE IF EXISTS meta;
`;
