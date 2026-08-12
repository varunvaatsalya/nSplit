export const MutationType = {
  EXPENSE_CREATE: "expense.create",
  EXPENSE_UPDATE: "expense.update",
  EXPENSE_DELETE: "expense.delete",
  INCOME_CREATE: "income.create",
  INCOME_UPDATE: "income.update",
  INCOME_DELETE: "income.delete",
  TRANSFER_CREATE: "transfer.create",
  TRANSFER_UPDATE: "transfer.update",
  TRANSFER_DELETE: "transfer.delete",
  GROUP_UPDATE: "group.update",
  SETTINGS_UPDATE: "settings.update",
  MEMBER_ADD: "member.add",
  MEMBER_UPDATE: "member.update",
  MEMBER_REMOVE: "member.remove",
};

export const SyncStatus = {
  ONLINE: "online",
  OFFLINE: "offline",
  SYNCING: "syncing",
  SYNCED: "synced",
  SYNC_FAILED: "sync_failed",
};

export function backoffMs(retryCount, { base = 1000, cap = 300000 } = {}) {
  const exp = Math.min(cap, base * 2 ** Math.max(0, retryCount));
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}
