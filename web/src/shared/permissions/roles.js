export const MemberPermission = {
  VIEW_ONLY: "VIEW_ONLY",
  ADD: "ADD",
  EDIT: "EDIT",
  ADMIN: "ADMIN",
};

/** Higher number = more power */
const RANK = {
  VIEW_ONLY: 1,
  ADD: 2,
  EDIT: 3,
  ADMIN: 4,
};

export const Actions = {
  VIEW_GROUP: "VIEW_GROUP",
  VIEW_EXPENSES: "VIEW_EXPENSES",
  VIEW_ACTIVITY: "VIEW_ACTIVITY",
  VIEW_MEMBERS: "VIEW_MEMBERS",
  VIEW_BALANCES: "VIEW_BALANCES",
  ADD_EXPENSE: "ADD_EXPENSE",
  ADD_INCOME: "ADD_INCOME",
  ADD_TRANSFER: "ADD_TRANSFER",
  EDIT_EXPENSE: "EDIT_EXPENSE",
  EDIT_INCOME: "EDIT_INCOME",
  EDIT_TRANSFER: "EDIT_TRANSFER",
  DELETE_EXPENSE: "DELETE_EXPENSE",
  DELETE_INCOME: "DELETE_INCOME",
  DELETE_TRANSFER: "DELETE_TRANSFER",
  MANAGE_MEMBERS: "MANAGE_MEMBERS",
  MANAGE_INVITATIONS: "MANAGE_INVITATIONS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
};

const ACTION_MIN_RANK = {
  [Actions.VIEW_GROUP]: 1,
  [Actions.VIEW_EXPENSES]: 1,
  [Actions.VIEW_ACTIVITY]: 1,
  [Actions.VIEW_MEMBERS]: 1,
  [Actions.VIEW_BALANCES]: 1,
  [Actions.ADD_EXPENSE]: 2,
  [Actions.ADD_INCOME]: 2,
  [Actions.ADD_TRANSFER]: 2,
  [Actions.EDIT_EXPENSE]: 3,
  [Actions.EDIT_INCOME]: 3,
  [Actions.EDIT_TRANSFER]: 3,
  [Actions.DELETE_EXPENSE]: 3,
  [Actions.DELETE_INCOME]: 3,
  [Actions.DELETE_TRANSFER]: 3,
  [Actions.MANAGE_MEMBERS]: 4,
  [Actions.MANAGE_INVITATIONS]: 4,
  [Actions.MANAGE_SETTINGS]: 4,
};

export function permissionRank(permission) {
  return RANK[permission] ?? 0;
}

export function can(permission, action) {
  const required = ACTION_MIN_RANK[action];
  if (required == null) return false;
  return permissionRank(permission) >= required;
}

export function assertCan(permission, action) {
  if (!can(permission, action)) {
    const err = new Error(`Permission denied for action: ${action}`);
    err.code = "FORBIDDEN";
    throw err;
  }
}

export function isAtLeast(permission, minimum) {
  return permissionRank(permission) >= permissionRank(minimum);
}
